"""Token selection and ticket parsing — the two halves of the duplicate flood.

One laundry reminder arrived four or five times on one phone. The schedule row
was claimed once, sent once, logged once; the fan-out multiplied it, because
device_tokens is keyed on the token and Expo mints a new one per install.

Expo returns tickets positionally with no id in the error branch, so a token is
matched to its ticket by index. That makes misalignment the dangerous failure:
it would not raise, it would delete a live token and leave the dead one — the
worst possible outcome, silently. Most of what follows is about alignment.
"""
from api.notifications.push import (MAX_DEVICES_PER_USER, choose_tokens,
                                    dead_tokens)


def rows(*pairs):
    return [{"token": t, "updated_at": u} for t, u in pairs]


# ── the cap ─────────────────────────────────────────────────────────────────

def test_under_the_cap_everything_is_kept():
    tokens, dropped = choose_tokens(rows(("a", "2026-01-01"), ("b", "2026-01-02")))
    assert set(tokens) == {"a", "b"} and dropped == 0


def test_eight_devices_yield_exactly_five():
    """The flood case: however many rows accumulate, one reminder cannot
    become more than MAX_DEVICES_PER_USER notifications."""
    tokens, dropped = choose_tokens(rows(*[(f"t{i}", f"2026-01-{i:02d}") for i in range(1, 9)]))
    assert len(tokens) == MAX_DEVICES_PER_USER == 5
    assert dropped == 3


def test_the_cap_keeps_the_newest_not_the_first_seen():
    """The current install is the one in the traveller's hand; a row from two
    builds ago is what should be sacrificed."""
    tokens, _ = choose_tokens(rows(
        ("oldest", "2024-01-01"), ("newest", "2026-12-31"), ("middle", "2025-06-01")))
    assert tokens[0] == "newest" and tokens[-1] == "oldest"


def test_missing_timestamps_do_not_crash_the_sort():
    tokens, _ = choose_tokens([{"token": "a"}, {"token": "b", "updated_at": "2026-01-01"}])
    assert tokens[0] == "b"          # a real timestamp beats an absent one


def test_rows_without_a_token_are_skipped():
    tokens, _ = choose_tokens([{"token": None, "updated_at": "2026-01-01"},
                               {"token": "a", "updated_at": "2026-01-02"}])
    assert tokens == ["a"]


# ── ticket parsing ──────────────────────────────────────────────────────────

def test_all_ok_deletes_nothing():
    body = {"data": [{"status": "ok", "id": "1"}, {"status": "ok", "id": "2"}]}
    assert dead_tokens(["a", "b"], body) == []


def test_the_dead_token_is_the_one_at_that_index():
    """Alignment. The error carries no token and no id, so position is the
    only link — picking the wrong index deletes a live device."""
    body = {"data": [
        {"status": "ok", "id": "1"},
        {"status": "error", "message": "…", "details": {"error": "DeviceNotRegistered"}},
        {"status": "ok", "id": "3"},
    ]}
    assert dead_tokens(["live1", "dead", "live2"], body) == ["dead"]


def test_several_dead_among_several_live():
    body = {"data": [
        {"status": "error", "details": {"error": "DeviceNotRegistered"}},
        {"status": "ok", "id": "2"},
        {"status": "error", "details": {"error": "DeviceNotRegistered"}},
        {"status": "ok", "id": "4"},
    ]}
    assert dead_tokens(["d1", "live1", "d2", "live2"], body) == ["d1", "d2"]


def test_other_errors_are_not_deletions():
    """MessageTooBig and MessageRateExceeded are our problem or transient.
    Deleting a token over either would silence a working device."""
    body = {"data": [
        {"status": "error", "details": {"error": "MessageTooBig"}},
        {"status": "error", "details": {"error": "MessageRateExceeded"}},
        {"status": "error", "details": {"error": "InvalidCredentials"}},
    ]}
    assert dead_tokens(["a", "b", "c"], body) == []


def test_a_short_data_array_deletes_only_what_it_covers():
    """A truncated reply must not let the tail drift onto wrong tokens."""
    body = {"data": [{"status": "error", "details": {"error": "DeviceNotRegistered"}}]}
    assert dead_tokens(["dead", "untouched1", "untouched2"], body) == ["dead"]


def test_a_longer_data_array_cannot_reach_past_the_tokens():
    body = {"data": [{"status": "error", "details": {"error": "DeviceNotRegistered"}}] * 5}
    assert dead_tokens(["only"], body) == ["only"]


def test_malformed_replies_delete_nothing():
    """Every one of these would be a plausible outage response, and none of
    them justifies removing a device."""
    for body in (None, {}, {"data": None}, {"data": "nope"}, {"errors": [{"code": "x"}]},
                 {"data": [None, "junk", 7]}):
        assert dead_tokens(["a", "b", "c"], body) == []


def test_an_error_without_details_is_ignored():
    body = {"data": [{"status": "error", "message": "something went wrong"}]}
    assert dead_tokens(["a"], body) == []
