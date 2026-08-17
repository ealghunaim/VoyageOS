"""Which day a journal entry is filed under.

created_at answers "when was this typed" and never moves. entry_date answers
"which day is this about" and is the one a traveller can set — the two come
apart the moment somebody writes in the evening about the morning, or writes
the whole trip up on the flight home.
"""
from datetime import date, timedelta

from api.notes.router import NoteCreate, NotePatch, entry_date_for

TRIP = {"start_date": "2026-08-10", "end_date": "2026-08-20"}


def test_a_day_inside_the_trip_is_kept():
    assert entry_date_for(TRIP, date(2026, 8, 14)) == "2026-08-14"


def test_the_first_and_last_days_are_inside():
    """Off-by-one at the boundary would silently move an arrival-day or
    departure-day entry, which are the two most likely to be written late."""
    assert entry_date_for(TRIP, date(2026, 8, 10)) == "2026-08-10"
    assert entry_date_for(TRIP, date(2026, 8, 20)) == "2026-08-20"


def test_before_the_trip_clamps_to_the_first_day():
    assert entry_date_for(TRIP, date(1998, 3, 2)) == "2026-08-10"


def test_after_the_trip_clamps_to_the_last_day():
    """The case that matters: writing up a trip once you are home. Today is
    past the end date, and stamping entries with a day the traveller was not
    there would make the log wrong rather than merely late."""
    assert entry_date_for(TRIP, date(2026, 9, 1)) == "2026-08-20"


def test_omitting_a_date_means_today_clamped_the_same_way():
    past = {"start_date": "2020-01-01", "end_date": "2020-01-10"}
    assert entry_date_for(past, None) == "2020-01-10"

    future = {"start_date": "2099-01-01", "end_date": "2099-01-10"}
    assert entry_date_for(future, None) == "2099-01-01"

    today = date.today()
    ongoing = {"start_date": str(today - timedelta(days=1)),
               "end_date": str(today + timedelta(days=1))}
    assert entry_date_for(ongoing, None) == str(today)


def test_iso_strings_are_accepted_as_well_as_dates():
    """PostgREST hands dates back as strings; a round-tripped value must not
    take a different path through the clamp than a fresh one."""
    assert entry_date_for(TRIP, "2026-08-14") == "2026-08-14"


def test_a_trip_missing_dates_does_not_crash():
    """Older trips predate required dates. No bounds means no clamping, which
    is better than refusing to save what someone just wrote."""
    assert entry_date_for({}, date(2026, 8, 14)) == "2026-08-14"
    assert entry_date_for({"start_date": None, "end_date": None},
                          date(2026, 8, 14)) == "2026-08-14"


def test_writing_after_the_trip_ends_is_allowed_at_all():
    """There is no end-date gate on journal writes and there should not be —
    the most considered entries are written after you get home."""
    over = {"start_date": "2020-01-01", "end_date": "2020-01-10"}
    assert entry_date_for(over, date(2026, 8, 17)) == "2020-01-10"


# ── the wire shape ─────────────────────────────────────────────────────────

def test_entry_date_is_optional_on_create():
    """Clients that predate this column must keep working; the database
    default covers them."""
    assert NoteCreate(body="x").entry_date is None


def test_the_patch_model_carries_only_the_date():
    """Editing the words is a different feature with a different question
    behind it. If body ever appears here, that decision was made by accident."""
    assert set(NotePatch.model_fields) == {"entry_date"}
