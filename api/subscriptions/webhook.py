"""Turning a RevenueCat event into a row in `subscriptions`.

THE TWO THINGS THIS FILE HAS TO GET RIGHT

  1. WHICH USER. The app configures RevenueCat with our Supabase user id, so
     app_user_id in the payload IS that id. If this resolves to the wrong
     person, or to nobody, the purchase succeeds and the tier lands somewhere
     else — the user pays and stays free, which is the worst outcome in the
     whole feature and produces no error anywhere.

  2. WHEN ACCESS ENDS. Only EXPIRATION removes it. Cancellation, billing
     trouble and pausing all keep the tier and change only the status,
     because the period was paid for.

FAIL-SAFE ON AN UNMAPPABLE EVENT

An event we cannot attribute is RECORDED and SKIPPED. It never raises, never
returns 5xx, and never writes a subscription row. Each part of that matters:

  - not raising, because a 5xx makes RevenueCat retry five times over 80
    minutes, and an event that is unmappable now is unmappable then;
  - not writing, because the only thing worse than dropping the event is
    granting a tier to a guessed user;
  - recording, because "did this person's purchase ever reach us" is the first
    question asked when someone reports paying and staying free, and without
    the ledger the answer is a shrug.

Unmappable is a normal condition, not a defect: dashboard test-sends carry
made-up ids, purchases made before login carry $RCAnonymousID:…, and deleted
accounts leave events behind them.
"""
from __future__ import annotations

from datetime import datetime, timezone

from api.subscriptions.tiers import DEFAULT_TIER, TIER_LIMITS

#: RevenueCat entitlement identifier → our tier.
#:
#: Entitlements rather than product ids on purpose. A tier is sold as monthly
#: and annual, may be re-priced, and may be replaced by a new product id
#: entirely; all of those are the same entitlement. Mapping product ids would
#: mean editing this table every time pricing changes, and a missing entry
#: silently downgrades a paying customer.
ENTITLEMENT_TO_TIER: dict[str, str] = {
    "explorer": "explorer",
    "traveler": "traveler",
    "voyager": "voyager",
}

#: Events that mean "this person is entitled right now, apply the tier".
GRANTING = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION",
            "SUBSCRIPTION_EXTENDED", "PRODUCT_CHANGE", "TRANSFER"}

#: Events that change status but must NOT touch the tier.
STATUS_ONLY = {"CANCELLATION": "cancelled",
               "BILLING_ISSUE": "grace",
               "SUBSCRIPTION_PAUSED": "cancelled"}

#: The only event that ends access.
REVOKING = {"EXPIRATION"}


def tier_from_entitlements(entitlement_ids) -> str | None:
    """The highest tier among the entitlements RevenueCat says are active.

    Highest rather than first: during an upgrade both the old and new
    entitlement can be present in the same payload, and picking whichever came
    first in the list would sometimes charge someone for Voyager and give them
    Explorer. Ordering by what the tier actually buys makes that deterministic.

    None means "no entitlement we recognise", which is different from "free" —
    the caller decides what to do with it, because an unrecognised entitlement
    on a RENEWAL is a configuration mistake, not a downgrade.
    """
    if not entitlement_ids:
        return None
    tiers = [ENTITLEMENT_TO_TIER[e] for e in entitlement_ids
             if e in ENTITLEMENT_TO_TIER]
    if not tiers:
        return None
    return max(tiers, key=lambda t: TIER_LIMITS.get(t, 0))


def resolve_user(db, event: dict) -> str | None:
    """Which of our users this event belongs to, or None.

    RevenueCat can carry several ids for one subscriber, so all of them are
    tried: app_user_id first (what the app set), then original_app_user_id and
    aliases, which is how an account that purchased before logging in gets
    reconciled after the SDK aliases it.

    A candidate is only accepted if it is a real profile. That check is what
    stops a forged or stale id from creating a subscription row for a user
    that does not exist — and it is cheap, being a primary-key lookup.
    """
    candidates: list[str] = []
    for key in ("app_user_id", "original_app_user_id"):
        v = event.get(key)
        if isinstance(v, str) and v:
            candidates.append(v)
    aliases = event.get("aliases") or []
    candidates += [a for a in aliases if isinstance(a, str) and a]

    seen = set()
    for c in candidates:
        if c in seen:
            continue
        seen.add(c)
        # Anonymous ids can never be one of our users. Skipping them by shape
        # avoids a pointless query on every pre-login purchase.
        if c.startswith("$RCAnonymousID:"):
            continue
        rows = db.table("profiles").select("id").eq("id", c).limit(1).execute().data
        if rows:
            return rows[0]["id"]
    return None


def _iso(ms) -> str | None:
    """RevenueCat sends epoch milliseconds; Postgres wants a timestamp."""
    if not ms:
        return None
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).isoformat()
    except (ValueError, TypeError, OSError, OverflowError):
        return None


def plan(event: dict, current: dict | None) -> dict | None:
    """What should change on the subscription row, or None to change nothing.

    Pure — no database, no clock — so the lifecycle rules can be tested
    directly rather than through a stack of fakes. The caller applies it.

    UPGRADES APPLY NOW, DOWNGRADES AT PERIOD END

    A PRODUCT_CHANGE to a bigger tier is applied immediately: Apple can make
    an upgrade effective at once with a proration, and someone who has just
    paid more must not be told to wait a month — from where they sit that is
    "I paid and nothing happened". A change to a smaller tier keeps the larger
    tier until the period they already bought runs out, and arrives as a
    RENEWAL at the new level.
    """
    etype = event.get("type")
    incoming = tier_from_entitlements(event.get("entitlement_ids"))
    now_tier = (current or {}).get("tier") or DEFAULT_TIER
    renews = _iso(event.get("expiration_at_ms"))

    if etype in REVOKING:
        # The only downgrade. tier goes to free AND status to lapsed — either
        # alone would leave the row contradicting itself.
        return {"tier": DEFAULT_TIER, "status": "lapsed", "renews_at": renews}

    if etype in STATUS_ONLY:
        # Tier deliberately absent from this dict: they keep what they paid
        # for until it expires.
        out = {"status": STATUS_ONLY[etype]}
        if renews:
            out["renews_at"] = renews
        return out

    if etype in GRANTING:
        if incoming is None:
            # A granting event naming no entitlement we know. Do not guess and
            # do not downgrade — this is a mapping gap on our side, and the
            # ledger records it as unhandled so it can be found.
            return None

        if etype == "PRODUCT_CHANGE":
            bigger = TIER_LIMITS.get(incoming, 0) > TIER_LIMITS.get(now_tier, 0)
            if not bigger:
                # Downgrade: keep the current tier, let it ride to period end.
                return {"status": "active", **({"renews_at": renews} if renews else {})}

        out = {"tier": incoming, "status": "active"}
        if renews:
            out["renews_at"] = renews
        return out

    return None      # an event type we do not act on
