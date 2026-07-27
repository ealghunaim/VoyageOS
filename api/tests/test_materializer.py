"""The timeline math must be exactly right — timezone bugs are trust-enders (Part 3 §3)."""
from datetime import datetime, timezone
from api.timeline.materializer import plan

TRIP = {"id": "abc12345-0000", "title": "Chamonix trip", "start_date": "2026-08-10"}
EARLY = datetime(2026, 7, 1, tzinfo=timezone.utc)


def test_offsets_resolve_in_local_zone():
    out = plan(TRIP, "Asia/Kuwait", EARLY)  # UTC+3
    by = {p.kind: p for p in out}
    assert by["laundry"].send_at_utc.startswith("2026-08-07T15:00")      # 18:00 KW = 15:00 UTC
    assert by["charge_weigh"].send_at_utc.startswith("2026-08-09T15:00")
    assert by["morning_of"].send_at_utc.startswith("2026-08-10T04:30")   # 07:30 KW
    assert by["laundry"].local_time == "18:00" and by["laundry"].tz_name == "Asia/Kuwait"


def test_past_offsets_are_skipped_not_spammed():
    late = datetime(2026, 8, 9, 20, 0, tzinfo=timezone.utc)  # T-1 evening, laundry+charge past
    kinds = {p.kind for p in plan(TRIP, "UTC", late)}
    assert kinds == {"morning_of"}


def test_unknown_timezone_fails_safe_to_utc():
    out = plan(TRIP, "Mars/Olympus", EARLY)
    assert all(p.tz_name == "UTC" for p in out)


def test_copy_respects_limits_and_classes():
    for p in plan(TRIP, "UTC", EARLY):
        assert len(p.title) <= 30 and len(p.body) <= 110
        assert "!" not in p.title + p.body
    assert {p.cls for p in plan(TRIP, "UTC", EARLY)} == {"task", "departure"}


def test_deterministic_idempotency_keys():
    a = plan(TRIP, "UTC", EARLY)
    b = plan(TRIP, "UTC", EARLY)
    assert [p.idem_key for p in a] == [p.idem_key for p in b]
