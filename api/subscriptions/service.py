"""Reading a user's tier, counting their trips, and spending the demo once.

NO CACHE, DELIBERATELY.

Tier is read in exactly two places — creating a trip and GET /v1/subscription
— both rare and both user-initiated. A primary-key select next to the three
writes create_trip already performs is not what makes that request slow.

An in-process cache would also not deliver what it appears to. Render runs
more than one instance during a deploy, so a webhook landing on one instance
leaves the others serving the old tier until their own TTL expires. That turns
"I paid and I am still blocked" from impossible into merely brief, which is
the wrong direction for the one moment where being wrong costs a refund.

tier_for() exists as the single accessor so that when phase 2 puts a tier read
behind every mutation — the locked-trip check — the cache lands in one
function body with write-through invalidation, rather than being retrofitted
across call sites.
"""
from __future__ import annotations

from datetime import datetime, timezone

from api.subscriptions.tiers import (DEFAULT_TIER, TIER_PRICES, label_for,
                                     limit_for, next_tier)


def get(db, user_id: str) -> dict | None:
    """The subscription row, or None. None is a real answer, not an error:
    users are only written here once they pay or spend their demo."""
    rows = db.table("subscriptions").select("*").eq("user_id", user_id) \
        .limit(1).execute().data
    return rows[0] if rows else None


def tier_for(db, user_id: str, sub: dict | None = None) -> str:
    """The tier this user may actually use right now.

    STATUS IS PART OF THE ANSWER, NOT DECORATION.

    Only 'lapsed' revokes. The other statuses all describe someone who has
    paid for the current period and has not reached the end of it:

      active     paid and renewing
      cancelled  will not renew, but the period bought is not over. Revoking
                 here would take away time they paid for.
      grace      a charge failed and is being retried. Dropping a user
                 because their card needed a second attempt is the worst
                 possible moment to do it — they are still a paying customer.

    EXPIRATION is the only RevenueCat event that ends access, and 'lapsed' is
    the only status it writes.

    This used to return row["tier"] alone, which was harmless only because
    nothing wrote status. Once the RevenueCat webhook does, a row reading
    tier='voyager', status='lapsed' would have kept serving Voyager forever —
    expiry that does not expire. The bug would have been invisible: no error,
    no failed request, just a user who stopped paying and kept everything.

    Unknown statuses are treated as entitled rather than revoked. A status
    this build has not heard of can only come from a newer deploy or a
    hand-edited row, and wrongly billing someone for access they have is
    recoverable while wrongly cutting off a paying customer is a refund and a
    review. The CHECK constraint on the column is the real guard.
    """
    row = sub if sub is not None else get(db, user_id)
    if not row:
        return DEFAULT_TIER

    status = row.get("status") or "active"
    if status == "lapsed":
        return DEFAULT_TIER

    # Safety net for an EXPIRATION that never arrived. 'cancelled' means "will
    # not renew", so once renews_at is in the past the period genuinely ended
    # and there is nothing more to honour. Deliberately NOT applied to
    # 'active' or 'grace': for those, a past renews_at means our copy is
    # stale, not that the subscription is over, and revoking on stale data
    # cuts off someone who is still paying.
    if status == "cancelled" and _period_over(row.get("renews_at")):
        return DEFAULT_TIER

    return row.get("tier") or DEFAULT_TIER


def _period_over(renews_at) -> bool:
    """True only when renews_at is present, parseable, and in the past.

    Every uncertain case answers False — a missing, malformed or unreadable
    date must never be the reason someone loses access they paid for.
    """
    if not renews_at:
        return False
    try:
        if isinstance(renews_at, str):
            renews_at = datetime.fromisoformat(renews_at.replace("Z", "+00:00"))
        if renews_at.tzinfo is None:
            renews_at = renews_at.replace(tzinfo=timezone.utc)
        return renews_at < datetime.now(timezone.utc)
    except (ValueError, TypeError, AttributeError):
        return False


def trip_count(db, user_id: str) -> int:
    """Trips owned. Deletes are hard, so this is a true count with no
    tombstones to exclude."""
    return len(db.table("trips").select("id").eq("owner_id", user_id).execute().data)


def has_used_demo(db, user_id: str, sub: dict | None = None) -> bool:
    row = sub if sub is not None else get(db, user_id)
    return bool((row or {}).get("premium_trip_used"))


def consume_demo(db, user_id: str, trip_id: str) -> None:
    """Spend the one-time premium demo on this trip.

    premium_trip_used is set once and never cleared by anything. Deleting the
    trip clears premium_trip_id through the foreign key but leaves the flag
    standing, which is what stops delete-and-recreate from handing out a
    second demo.

    Upsert because most users have no row until this moment.
    """
    now = datetime.now(timezone.utc).isoformat()
    db.table("subscriptions").upsert({
        "user_id": user_id,
        "premium_trip_id": trip_id,
        "premium_trip_used": True,
        "updated_at": now,
    }, on_conflict="user_id").execute()


def limit_body(tier: str, limit: int, used: int) -> dict:
    """The 402 payload.

    A dict rather than prose: the client shows a paywall, and parsing a
    sentence to decide which one is how that breaks. `message` is the fallback
    for anywhere that only has room for text.

    The upgrade fields describe the next rung, so the paywall never hardcodes
    the ladder. At the top of it they are null and the copy says so instead of
    offering an upgrade that does not exist.
    """
    nxt = next_tier(tier)
    body = {
        "code": "trip_limit_reached",
        "tier": tier,
        "tier_label": label_for(tier),
        "limit": limit,
        "trips_used": used,
        "upgrade_to": nxt,
        "upgrade_label": label_for(nxt) if nxt else None,
        "upgrade_limit": limit_for(nxt) if nxt else None,
        "upgrade_price": TIER_PRICES.get(nxt) if nxt else None,
    }
    trips = "trip" if limit == 1 else "trips"
    if nxt:
        body["message"] = (
            f"You've hit your {label_for(tier)} limit of {limit} {trips}. "
            f"{label_for(nxt)} adds {limit_for(nxt)} for {TIER_PRICES[nxt]}."
        )
    else:
        body["message"] = (
            f"You've hit your {label_for(tier)} limit of {limit} {trips} — "
            "our largest plan. Delete a trip to add another."
        )
    return body


def summary(db, user_id: str) -> dict:
    """What GET /v1/subscription returns."""
    sub = get(db, user_id)
    tier = tier_for(db, user_id, sub)
    nxt = next_tier(tier)
    return {
        "tier": tier,
        "tier_label": label_for(tier),
        "limit": limit_for(tier),
        "trips_used": trip_count(db, user_id),
        "premium_trip_used": has_used_demo(db, user_id, sub),
        "premium_trip_id": (sub or {}).get("premium_trip_id"),
        "status": (sub or {}).get("status") or "active",
        "renews_at": (sub or {}).get("renews_at"),
        "next_tier": None if not nxt else {
            "tier": nxt, "label": label_for(nxt),
            "limit": limit_for(nxt), "price": TIER_PRICES[nxt],
        },
    }
