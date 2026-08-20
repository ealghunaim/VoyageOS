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


def active_trip_count(db, user_id: str) -> int:
    """Trips that still occupy a slot: owned AND not closed out.

    This counted every trip ever owned, which turned the ladder's own promise
    inside out. tiers.py says a tier buys "a number of trips"; with a lifetime
    count, free meant one trip EVER — take it, close it, and the only ways to
    plan another were to delete your history or to pay. That is a lifetime cap
    wearing a concurrency cap's name.

    A closed-out trip is a record, not a workspace (Phase C), so it stops
    consuming a slot. Closing out is therefore a reward rather than a toll,
    which is the whole shape of the ruling behind this.

    NOTHING IS DELETED, and nothing becomes unreadable. Locked trips stay
    readable, their journals stay writable (RECORD scope), and unlock stays
    free. "Removed" means removed from this COUNT and nowhere else.

    Unlocking can put someone over their limit, and that is allowed. Over-limit
    is a state, not an error: it blocks the next POST /v1/trips and nothing
    else. Refusing an unlock to protect a count would make undo a purchase,
    which is the one thing the lock design rules out.
    """
    return len(db.table("trips").select("id")
               .eq("owner_id", user_id).is_("locked_at", "null").execute().data)


#: Old name, kept pointing at the new meaning so nothing calls a count that no
#: longer exists. Remove once nothing imports it.
trip_count = active_trip_count


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
    # ACTIVE trips, and the word matters: closing a trip out frees its slot, so
    # the limit is a concurrency cap and the copy has to read like one. The old
    # wording ("limit of 1 trip") described a lifetime cap, which is what this
    # actually was before active_trip_count.
    # The singular gets its own sentence rather than a pluralisation switch.
    # "You're using all 1 of your Free active trip" is grammatical and reads
    # like a form letter; the free tier is the one most people meet first.
    at_limit = (f"Your {label_for(tier)} plan covers one active trip, and it's in use."
                if limit == 1 else
                f"You're using all {limit} of your {label_for(tier)} active trips.")

    # THE FREE REMEDY FIRST. Someone at their limit can always close out a
    # finished trip and carry on for nothing. Leading with the paid option
    # would be selling a fix for a problem they can solve themselves, and a
    # paywall that mentions the free path first is the one worth defending.
    free_remedy = "Close out a finished trip to free a slot, or delete one."
    body["free_remedy"] = free_remedy

    if nxt:
        body["message"] = (
            f"{at_limit} {free_remedy} "
            f"{label_for(nxt)} raises it to {limit_for(nxt)} for {TIER_PRICES[nxt]}."
        )
    else:
        body["message"] = (
            f"{at_limit} It is our largest plan. {free_remedy}"
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
        "trips_used": active_trip_count(db, user_id),
        "premium_trip_used": has_used_demo(db, user_id, sub),
        "premium_trip_id": (sub or {}).get("premium_trip_id"),
        "status": (sub or {}).get("status") or "active",
        "renews_at": (sub or {}).get("renews_at"),
        "next_tier": None if not nxt else {
            "tier": nxt, "label": label_for(nxt),
            "limit": limit_for(nxt), "price": TIER_PRICES[nxt],
        },
    }
