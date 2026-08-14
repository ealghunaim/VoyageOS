"""The tier ladder and the 402 body. No database — pure arithmetic and copy.

The live half of this (the demo-trip loophole, the gate blocking at exactly
the limit) is in scripts/subscription_drill.py, because it needs real rows and
a real delete to prove anything.
"""
from api.subscriptions.service import limit_body
from api.subscriptions.tiers import (TIER_LIMITS, TIER_ORDER, TIER_PRICES, label_for,
                                     limit_for, next_tier)


def test_the_four_tiers_and_their_limits():
    assert TIER_LIMITS == {"free": 1, "explorer": 3, "traveler": 6, "voyager": 12}
    assert TIER_ORDER == ("free", "explorer", "traveler", "voyager")


def test_the_ladder_climbs_then_stops():
    assert next_tier("free") == "explorer"
    assert next_tier("explorer") == "traveler"
    assert next_tier("traveler") == "voyager"
    assert next_tier("voyager") is None       # top rung: nothing to sell


def test_an_unknown_tier_degrades_to_free_rather_than_raising():
    """A tier from a newer client or a hand-edited row must not 500 the
    request. The column's check constraint is the real guard; this is the
    behaviour when something slips past it anyway."""
    assert limit_for("enterprise") == 1
    assert label_for("enterprise") == "Free"
    assert next_tier("enterprise") == "explorer"


def test_402_body_carries_what_a_paywall_needs():
    b = limit_body("free", 1, 1)
    assert b["code"] == "trip_limit_reached"
    assert (b["tier"], b["limit"], b["trips_used"]) == ("free", 1, 1)
    # Read from TIER_PRICES rather than repeated as a literal. A hardcoded
    # price means two places to update whenever App Store Connect changes,
    # and the test is the one that gets missed. What is worth asserting is
    # that the body carries the price the ladder defines, not what that price
    # happens to be today.
    assert (b["upgrade_to"], b["upgrade_limit"], b["upgrade_price"]) == \
        ("explorer", 3, TIER_PRICES["explorer"])
    # The client should never have to parse prose to decide what to show.
    assert set(b) >= {"code", "tier", "limit", "trips_used", "upgrade_to",
                      "upgrade_limit", "upgrade_price", "message"}


def test_402_singular_and_plural_read_correctly():
    assert "1 trip." in limit_body("free", 1, 1)["message"]
    assert "3 trips." in limit_body("explorer", 3, 3)["message"]


def test_top_of_the_ladder_offers_no_upgrade():
    b = limit_body("voyager", 12, 12)
    assert b["upgrade_to"] is None
    assert b["upgrade_limit"] is None and b["upgrade_price"] is None
    assert "largest plan" in b["message"]
    assert "$" not in b["message"]            # never quote a price that is not for sale


def test_every_tier_produces_a_coherent_body():
    for tier in TIER_ORDER:
        b = limit_body(tier, TIER_LIMITS[tier], TIER_LIMITS[tier])
        assert b["limit"] == TIER_LIMITS[tier]
        assert b["message"] and not b["message"].endswith(" ")
        if b["upgrade_to"]:
            assert b["upgrade_limit"] > b["limit"]     # an upgrade must add trips
