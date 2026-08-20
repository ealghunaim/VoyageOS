"""What a tier limit counts, and what the paywall says about it.

The bug this closes: trip_count counted every trip ever owned, so "free = 1
trip" meant one trip EVER. Take it, close it, and the only ways to plan another
were to delete your history or to pay — a lifetime cap wearing a concurrency
cap's name, contradicting tiers.py's own docstring ("a tier buys a number of
trips").
"""
import inspect

from api.subscriptions import service
from api.subscriptions.service import limit_body
from api.subscriptions.tiers import TIER_LIMITS


def test_the_count_excludes_closed_out_trips():
    """Asserted against the source, since counting needs a database. The
    predicate IS the ruling: a closed trip stops occupying a slot."""
    src = inspect.getsource(service.active_trip_count)
    assert 'is_("locked_at", "null")' in src, (
        "active_trip_count no longer excludes closed-out trips — the free tier "
        "is a lifetime cap again")
    assert 'eq("owner_id", user_id)' in src, "count is no longer scoped to the owner"


def test_the_old_name_still_resolves():
    """Renaming a function nothing can find is how a count silently reverts."""
    assert service.trip_count is service.active_trip_count


def test_limits_are_unchanged():
    """1/3/6/12 are in App Store Connect and in paywall copy. Moving them is a
    price-page change, not a code change."""
    assert TIER_LIMITS == {"free": 1, "explorer": 3, "traveler": 6, "voyager": 12}


def test_the_free_remedy_comes_before_the_paid_one():
    """Someone at their limit can close out a finished trip and carry on for
    nothing. Leading with the upgrade sells a fix for a problem they can solve
    themselves."""
    for tier, limit in (("free", 1), ("explorer", 3), ("voyager", 12)):
        msg = limit_body(tier, limit, limit)["message"]
        free_at = msg.find("Close out a finished trip")
        assert free_at > 0, f"{tier}: no free remedy offered"
        for paid in ("$", "raises it to"):
            paid_at = msg.find(paid)
            if paid_at > 0:
                assert free_at < paid_at, f"{tier}: paid option precedes the free one"


def test_the_body_carries_the_free_remedy_as_a_field():
    """So a paywall can render it as its own affordance rather than parsing a
    sentence — the reason limit_body is a dict at all."""
    assert "Close out" in limit_body("free", 1, 1)["free_remedy"]


def test_the_copy_describes_a_concurrency_cap_not_a_lifetime_one():
    assert "active trip" in limit_body("free", 1, 1)["message"]
    assert "active trips" in limit_body("explorer", 3, 3)["message"]


def test_the_free_tier_reads_as_a_sentence():
    """The free tier is the one most people meet first, and "all 1 of your Free
    active trip" is grammatical and reads like a form letter."""
    msg = limit_body("free", 1, 1)["message"]
    assert "all 1 of" not in msg
    assert "covers one active trip" in msg


def test_the_top_of_the_ladder_offers_no_upgrade():
    body = limit_body("voyager", 12, 12)
    assert body["upgrade_to"] is None
    assert "$" not in body["message"]
    assert "Close out" in body["message"]


def test_tier_is_a_reserved_reason_with_no_branch_yet():
    """Phase D's limit is enforced at trip CREATION, which has no trip to ask
    about. The code is named so the client's rendering path exists before the
    case does (Phase H), but nothing returns it yet."""
    import api.core.trips as t
    src = inspect.getsource(t.may_write)
    assert '"tier"' in src, "the reserved reason code was removed"
    assert 'reason": "tier"' not in src.replace(' ', ''), \
        "may_write now returns 'tier' — that branch was meant to arrive with Phase H"
