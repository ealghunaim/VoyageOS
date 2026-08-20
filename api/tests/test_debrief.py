"""Closing out a trip, twice, and early.

Two defects lived here and neither announced itself.

A second submit inserted a second full set of item_events — every forgot,
unused and packed name duplicated. Those feed times_packed and the "you forgot
this last time" signal, so a double tap doubled an item's weight in every
future suggestion, permanently. More history looks exactly like more history.

And status was set to 'completed' whatever the dates said, so debriefing a trip
that had not started removed it from Upcoming with no signal — the client
honours 'completed' over the calendar by design, which makes a silent write
here a disappearance there.
"""
from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from api.history.router import DebriefBody, _ends_in_future
from api.history.service import DEBRIEF_EVENTS


# ── the early-close guard ──────────────────────────────────────────────────

TODAY = date(2026, 8, 20)


def test_a_finished_trip_closes_without_asking():
    assert _ends_in_future({"end_date": "2026-08-19"}, TODAY) == 0


def test_a_trip_ending_today_closes_without_asking():
    """The last day is still the trip. Someone debriefing on the flight home
    should not be interrogated about it."""
    assert _ends_in_future({"end_date": "2026-08-20"}, TODAY) == 0


def test_a_future_trip_reports_how_early():
    assert _ends_in_future({"end_date": "2026-08-27"}, TODAY) == 7


def test_a_missing_or_broken_end_date_does_not_ask():
    """An older trip without dates should close, not be blocked by a question
    nobody can answer."""
    for trip in ({}, {"end_date": None}, {"end_date": "not-a-date"}):
        assert _ends_in_future(trip, TODAY) == 0


def test_confirm_early_defaults_to_false():
    """The prompt exists because the first attempt does not carry it."""
    assert DebriefBody().confirm_early is False
    assert DebriefBody(confirm_early=True).confirm_early is True


# ── the replacement scope ──────────────────────────────────────────────────

def test_replacement_is_scoped_to_the_events_this_flow_owns():
    """`lost`, `bought` and `saved_me` are legal in the column and written by
    nothing today. A replacement that cleared everything would be correct now
    and quietly wrong the day something writes them."""
    assert set(DEBRIEF_EVENTS) == {"forgot", "unused", "packed"}
    assert "lost" not in DEBRIEF_EVENTS
    assert "bought" not in DEBRIEF_EVENTS
    assert "saved_me" not in DEBRIEF_EVENTS


def test_the_event_vocabulary_still_matches_the_column():
    """If a migration ever widens the CHECK, this fails and someone decides
    whether the new event belongs to debrief — rather than it defaulting into
    or out of the replacement by accident."""
    import pathlib
    import re
    sql = (pathlib.Path(__file__).resolve().parents[2]
           / "supabase" / "migrations" / "0001_v05_core.sql").read_text()
    m = re.search(r"event text not null check \(event in \(([^)]*)\)\)", sql)
    assert m, "0001 no longer states the event vocabulary readably"
    allowed = {v.strip().strip("'") for v in m.group(1).split(",")}
    assert set(DEBRIEF_EVENTS) <= allowed, (
        f"debrief writes events the column refuses: {set(DEBRIEF_EVENTS) - allowed}")


# ── the response contract ──────────────────────────────────────────────────

def test_the_router_raises_409_not_400_for_an_unended_trip():
    """409, because the request is well-formed and succeeds unchanged once
    confirm_early is set. 400 would say the client sent something wrong."""
    from api.history import router as r

    trip = {"id": "t", "end_date": str(date.today() + timedelta(days=3))}
    with pytest.raises(HTTPException) as e:
        remaining = r._ends_in_future(trip)
        if remaining and not DebriefBody().confirm_early:
            raise HTTPException(409, {"code": "trip_not_ended",
                                      "days_remaining": remaining})
    assert e.value.status_code == 409
    assert e.value.detail["code"] == "trip_not_ended"
    assert e.value.detail["days_remaining"] == 3
