"""Planner times: what the column is allowed to hold.

The picker writes canonical "HH:MM", but `time` is free text and predates the
picker, so the server's job is narrower than validating a format — it must keep
what travellers typed and refuse to invent a second way of storing nothing.
"""
from api.planner.router import PlanItemCreate, PlanItemPatch, clean_time


def test_a_cleared_time_becomes_null_not_an_empty_string():
    """PlanItemPatch drops None, so the client clears a time by sending "".
    Stored verbatim that would leave the column holding both '' and NULL for
    the same idea, and every reader would have to know about both."""
    for blank in ("", "   ", "\t", "\n"):
        assert clean_time(blank) is None, repr(blank)


def test_absent_stays_absent():
    assert clean_time(None) is None


def test_real_times_pass_through_untouched():
    for t in ("09:00", "21:30", "00:00"):
        assert clean_time(t) == t


def test_legacy_free_text_is_preserved():
    """Rows written before the picker hold words, not times. "morning" is a
    real plan and deleting it would be data loss, not tidying."""
    for t in ("morning", "after lunch", "when we wake up"):
        assert clean_time(t) == t


def test_surrounding_whitespace_is_trimmed():
    assert clean_time("  09:00  ") == "09:00"


def test_the_patch_model_still_permits_an_empty_time():
    """If max_length or a min_length were ever added here, clearing a time
    would start failing validation instead of clearing."""
    assert PlanItemPatch(time="").time == ""


def test_the_column_length_cap_admits_a_canonical_time():
    assert PlanItemCreate(title="x", time="09:00").time == "09:00"
