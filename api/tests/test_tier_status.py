"""What a subscription row actually entitles someone to.

tier_for() is the gate every paid feature reads. Before the RevenueCat webhook
it returned row["tier"] and ignored status entirely, which was harmless only
because nothing wrote status. These tests exist so that stays fixed: the
failure they guard against is silent in both directions — a lapsed user who
keeps Voyager forever produces no error, and a paying user wrongly downgraded
produces a refund rather than a stack trace.
"""
from datetime import datetime, timedelta, timezone

from api.subscriptions.service import tier_for

PAST = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
FUTURE = (datetime.now(timezone.utc) + timedelta(days=27)).isoformat()


class FakeDB:
    """Returns one subscription row, or none."""
    def __init__(self, row=None): self.row = row
    def table(self, name): return self
    def select(self, *a): return self
    def eq(self, *a): return self
    def limit(self, n): return self
    def execute(self):
        return type("R", (), {"data": [self.row] if self.row else []})()


def sub(**kw):
    base = {"user_id": "u1", "tier": "voyager", "status": "active",
            "renews_at": FUTURE}
    base.update(kw)
    return base


# ── the statuses that keep access ───────────────────────────────────────────

def test_active_gets_the_tier():
    assert tier_for(FakeDB(sub()), "u1") == "voyager"


def test_cancelled_keeps_the_tier_until_the_period_ends():
    """The one most often got wrong. Cancelling means "do not renew", not
    "refund me and cut me off now" — they paid through renews_at."""
    assert tier_for(FakeDB(sub(status="cancelled", renews_at=FUTURE)), "u1") == "voyager"


def test_grace_keeps_the_tier():
    """A failed charge is being retried. Revoking mid-retry punishes someone
    whose card needed a second attempt while they are still paying."""
    assert tier_for(FakeDB(sub(status="grace")), "u1") == "voyager"


# ── the one status that revokes ─────────────────────────────────────────────

def test_lapsed_drops_to_free():
    """EXPIRATION is the only event that ends access, and this is the status
    it writes. Without this the whole webhook grants tiers and never removes
    them."""
    assert tier_for(FakeDB(sub(status="lapsed")), "u1") == "free"


def test_lapsed_ignores_a_future_renews_at():
    """status wins over the date. A stale renews_at must not resurrect a
    subscription RevenueCat has told us is over."""
    assert tier_for(FakeDB(sub(status="lapsed", renews_at=FUTURE)), "u1") == "free"


# ── the safety net for a missed EXPIRATION ──────────────────────────────────

def test_cancelled_and_past_renewal_drops_to_free():
    """Covers an EXPIRATION that never arrived. 'cancelled' means it will not
    renew, so once the date passes there is nothing left to honour."""
    assert tier_for(FakeDB(sub(status="cancelled", renews_at=PAST)), "u1") == "free"


def test_active_with_a_past_renewal_still_gets_the_tier():
    """Deliberately NOT symmetric with the case above. For 'active' a past
    renews_at means our copy is stale — the RENEWAL webhook is late or lost —
    not that the subscription ended. Revoking on stale data cuts off someone
    who is still being charged."""
    assert tier_for(FakeDB(sub(status="active", renews_at=PAST)), "u1") == "voyager"


def test_grace_with_a_past_renewal_still_gets_the_tier():
    """Same reasoning, and more pointed: in grace the renewal date has usually
    passed by definition — that is what the retry is about."""
    assert tier_for(FakeDB(sub(status="grace", renews_at=PAST)), "u1") == "voyager"


# ── absent, malformed and unknown ───────────────────────────────────────────

def test_no_row_is_free():
    """Nothing is created at signup; no row is the normal state."""
    assert tier_for(FakeDB(None), "u1") == "free"


def test_an_unknown_status_keeps_the_tier():
    """From a newer deploy or a hand-edited row. Erring toward serving is
    recoverable; erring toward revoking is a refund."""
    assert tier_for(FakeDB(sub(status="something_new")), "u1") == "voyager"


def test_a_malformed_renews_at_never_causes_a_downgrade():
    for bad in ("not-a-date", "", None, 12345, "2026-13-45T99:99:99Z"):
        assert tier_for(FakeDB(sub(status="cancelled", renews_at=bad)), "u1") == "voyager", bad


def test_a_missing_tier_is_free_not_a_crash():
    assert tier_for(FakeDB(sub(tier=None)), "u1") == "free"


def test_naive_timestamps_are_treated_as_utc():
    """Postgres can hand back a naive datetime depending on the driver. It
    must not raise comparing against an aware now()."""
    naive_past = (datetime.now(timezone.utc) - timedelta(days=3)).replace(tzinfo=None)
    assert tier_for(FakeDB(sub(status="cancelled", renews_at=naive_past)), "u1") == "free"


def test_passing_the_row_in_avoids_a_second_read():
    """summary() reads the row then asks for the tier; it must not re-query."""
    db = FakeDB(None)   # would answer "free" if it were consulted
    assert tier_for(db, "u1", sub(status="active")) == "voyager"
