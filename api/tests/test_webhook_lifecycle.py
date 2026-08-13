"""Which user an event belongs to, and what it does to their subscription.

Two failures are being guarded against, and neither raises:

  - the tier lands on the wrong user, or on nobody, so someone pays and stays
    free;
  - an event that should not remove access removes it, so someone who paid
    loses what they bought.
"""
from api.subscriptions.webhook import (ENTITLEMENT_TO_TIER, plan,
                                       resolve_user, tier_from_entitlements)

USER = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"


class FakeDB:
    """Knows about a fixed set of profile ids and records what it was asked."""
    def __init__(self, known=()):
        self.known, self.asked = set(known), []
        self._want = None

    def table(self, name): return self
    def select(self, *a): return self
    def limit(self, n): return self

    def eq(self, col, val):
        self._want = val
        self.asked.append(val)
        return self

    def execute(self):
        rows = [{"id": self._want}] if self._want in self.known else []
        return type("R", (), {"data": rows})()


def ev(**kw):
    base = {"id": "evt_1", "type": "INITIAL_PURCHASE", "app_user_id": USER,
            "entitlement_ids": ["voyager"], "event_timestamp_ms": 1_700_000_000_000}
    base.update(kw)
    return base


# ── entitlement → tier ──────────────────────────────────────────────────────

def test_each_entitlement_maps_to_its_tier():
    for ent, tier in ENTITLEMENT_TO_TIER.items():
        assert tier_from_entitlements([ent]) == tier


def test_the_highest_tier_wins_when_several_are_active():
    """During an upgrade both entitlements can appear in one payload. Taking
    whichever came first would sometimes charge for Voyager and grant
    Explorer."""
    assert tier_from_entitlements(["explorer", "voyager"]) == "voyager"
    assert tier_from_entitlements(["voyager", "explorer"]) == "voyager"
    assert tier_from_entitlements(["explorer", "traveler"]) == "traveler"


def test_unknown_entitlements_resolve_to_none_not_free():
    """None means "we do not recognise this", which is a configuration gap.
    Free would be a silent downgrade of a paying customer."""
    assert tier_from_entitlements(["premium_plus"]) is None
    assert tier_from_entitlements([]) is None
    assert tier_from_entitlements(None) is None


def test_an_unknown_entitlement_alongside_a_known_one_is_ignored():
    assert tier_from_entitlements(["premium_plus", "traveler"]) == "traveler"


# ── which user ──────────────────────────────────────────────────────────────

def test_app_user_id_resolves_to_our_user():
    db = FakeDB({USER})
    assert resolve_user(db, ev()) == USER


def test_an_unknown_id_resolves_to_nobody():
    """The fail-safe. Better to drop the event than to attribute money to a
    guessed user."""
    db = FakeDB({OTHER})
    assert resolve_user(db, ev(app_user_id=USER)) is None


def test_aliases_are_tried_when_the_primary_id_is_unknown():
    """How a purchase made before login gets reconciled after the SDK aliases
    the anonymous id to the real one."""
    db = FakeDB({USER})
    e = ev(app_user_id="$RCAnonymousID:abc", aliases=[USER])
    assert resolve_user(db, e) == USER


def test_anonymous_ids_are_never_queried():
    """They cannot be one of our users, so asking is wasted work on every
    pre-login purchase."""
    db = FakeDB({USER})
    resolve_user(db, ev(app_user_id="$RCAnonymousID:abc", aliases=[USER]))
    assert not any(a.startswith("$RCAnonymousID:") for a in db.asked)


def test_original_app_user_id_is_consulted():
    db = FakeDB({USER})
    assert resolve_user(db, ev(app_user_id="nope", original_app_user_id=USER)) == USER


def test_missing_and_malformed_ids_do_not_raise():
    db = FakeDB({USER})
    for e in (ev(app_user_id=None), ev(app_user_id=""), ev(app_user_id=123),
              ev(app_user_id=None, aliases=None),
              ev(app_user_id=None, aliases=[None, 5])):
        assert resolve_user(db, e) is None


# ── lifecycle ───────────────────────────────────────────────────────────────

def test_initial_purchase_grants_the_tier():
    out = plan(ev(type="INITIAL_PURCHASE", entitlement_ids=["traveler"]), None)
    assert out["tier"] == "traveler" and out["status"] == "active"


def test_renewal_grants_the_tier():
    out = plan(ev(type="RENEWAL", entitlement_ids=["voyager"]), {"tier": "voyager"})
    assert out["tier"] == "voyager" and out["status"] == "active"


def test_renewal_reactivates_a_lapsed_user():
    out = plan(ev(type="RENEWAL", entitlement_ids=["explorer"]),
               {"tier": "free", "status": "lapsed"})
    assert out["tier"] == "explorer" and out["status"] == "active"


def test_cancellation_keeps_the_tier():
    """The one most often got wrong. They paid through the period end."""
    out = plan(ev(type="CANCELLATION"), {"tier": "voyager", "status": "active"})
    assert out["status"] == "cancelled"
    assert "tier" not in out, "cancellation must not touch the tier"


def test_billing_issue_keeps_the_tier():
    out = plan(ev(type="BILLING_ISSUE"), {"tier": "voyager", "status": "active"})
    assert out["status"] == "grace"
    assert "tier" not in out


def test_pause_keeps_the_tier_until_period_end():
    out = plan(ev(type="SUBSCRIPTION_PAUSED"), {"tier": "traveler"})
    assert out["status"] == "cancelled" and "tier" not in out


def test_expiration_is_the_only_thing_that_revokes():
    out = plan(ev(type="EXPIRATION"), {"tier": "voyager", "status": "cancelled"})
    assert out["tier"] == "free" and out["status"] == "lapsed"


def test_uncancellation_restores_active():
    out = plan(ev(type="UNCANCELLATION", entitlement_ids=["voyager"]),
               {"tier": "voyager", "status": "cancelled"})
    assert out["status"] == "active" and out["tier"] == "voyager"


def test_renews_at_comes_from_expiration_at_ms():
    out = plan(ev(type="RENEWAL", expiration_at_ms=1_700_000_000_000), None)
    assert out["renews_at"].startswith("2023-11-14")


# ── upgrades now, downgrades at period end ──────────────────────────────────

def test_an_upgrade_applies_immediately():
    """Apple can make an upgrade effective at once with a proration. Someone
    who has just paid more must not be told to wait a month — from where they
    sit that is "I paid and nothing happened"."""
    out = plan(ev(type="PRODUCT_CHANGE", entitlement_ids=["voyager"]),
               {"tier": "explorer", "status": "active"})
    assert out["tier"] == "voyager"


def test_a_downgrade_waits_for_the_period_to_end():
    """They keep the larger tier they already paid for; the smaller one
    arrives as a RENEWAL later."""
    out = plan(ev(type="PRODUCT_CHANGE", entitlement_ids=["explorer"]),
               {"tier": "voyager", "status": "active"})
    assert "tier" not in out, "a downgrade must not take effect now"
    assert out["status"] == "active"


def test_a_product_change_to_the_same_tier_changes_no_tier():
    out = plan(ev(type="PRODUCT_CHANGE", entitlement_ids=["voyager"]),
               {"tier": "voyager", "status": "active"})
    assert "tier" not in out


# ── the shapes that must not cause damage ───────────────────────────────────

def test_a_granting_event_with_no_known_entitlement_changes_nothing():
    """A mapping gap on our side. Guessing would be worse, and downgrading a
    paying customer worse still — so do nothing and let the ledger show it."""
    assert plan(ev(type="RENEWAL", entitlement_ids=["mystery"]),
                {"tier": "voyager"}) is None


def test_an_unknown_event_type_changes_nothing():
    assert plan(ev(type="SOMETHING_NEW_FROM_REVENUECAT"), {"tier": "voyager"}) is None


def test_expiration_revokes_even_with_no_entitlements_listed():
    """EXPIRATION legitimately carries none — that is what expiring means."""
    out = plan(ev(type="EXPIRATION", entitlement_ids=[]), {"tier": "voyager"})
    assert out["tier"] == "free"


def test_plan_never_mutates_the_current_row():
    current = {"tier": "voyager", "status": "active"}
    plan(ev(type="CANCELLATION"), current)
    assert current == {"tier": "voyager", "status": "active"}
