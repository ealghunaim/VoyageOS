"""The tier ladder — limits, labels, prices, and what comes next.

Count-based on purpose: a tier buys a number of trips, not a date range and
not a feature list. That keeps the gate a single comparison and keeps the
paywall honest about what is being sold.

Everything the client needs to render an upgrade prompt is here, so the app
never hardcodes the ladder. When a tier is added or a price changes, one file
moves and every 402 body and /v1/subscription response follows.
"""
from __future__ import annotations

#: Ascending. Order is meaningful — next_tier walks it.
TIER_ORDER: tuple[str, ...] = ("free", "explorer", "traveler", "voyager")

TIER_LIMITS: dict[str, int] = {
    "free": 1,
    "explorer": 3,
    "traveler": 6,
    "voyager": 12,
}

TIER_LABELS: dict[str, str] = {
    "free": "Free",
    "explorer": "Explorer",
    "traveler": "Traveler",
    "voyager": "Voyager",
}

#: Display only. Apple is the source of truth for what is actually charged —
#: these exist so a paywall can be drawn before StoreKit has loaded, and must
#: be kept in step with App Store Connect by hand.
TIER_PRICES: dict[str, str] = {
    "explorer": "$4.99/month",
    "traveler": "$6.99/month",
    "voyager": "$9.99/month",
}

DEFAULT_TIER = "free"


def limit_for(tier: str) -> int:
    """Unknown tiers fall back to free rather than raising.

    A tier this build has never heard of can arrive from a newer client or a
    hand-edited row. Refusing to serve is worse than serving the smallest
    allowance, and the check constraint on the column is the real guard.
    """
    return TIER_LIMITS.get(tier, TIER_LIMITS[DEFAULT_TIER])


def label_for(tier: str) -> str:
    return TIER_LABELS.get(tier, TIER_LABELS[DEFAULT_TIER])


def next_tier(tier: str) -> str | None:
    """The tier above this one, or None at the top of the ladder."""
    try:
        i = TIER_ORDER.index(tier)
    except ValueError:
        return TIER_ORDER[1]
    return TIER_ORDER[i + 1] if i + 1 < len(TIER_ORDER) else None
