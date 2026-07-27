"""The moat's fold must be exactly right — it decides what the generator remembers."""
from api.history.service import aggregate

ROWS = [  # newest first, as queried
    {"item_name": "Sunglasses", "event": "forgot", "noted_at": "2026-07-27T10:00:00Z"},
    {"item_name": "Travel yoga mat", "event": "unused", "noted_at": "2026-07-20"},
    {"item_name": "Sunglasses", "event": "forgot", "noted_at": "2026-05-01T09:00:00Z"},
    {"item_name": "Travel yoga mat", "event": "unused", "noted_at": "2026-05-01"},
    {"item_name": "Book", "event": "unused", "noted_at": "2026-05-01"},
    {"item_name": "T-shirt", "event": "packed", "noted_at": "2026-05-01"},
]


def test_forgot_keeps_most_recent_date_once():
    out = aggregate(ROWS)
    assert out["previously_forgot"] == [{"name": "Sunglasses", "on": "2026-07-27"}]


def test_unused_needs_two_strikes():
    out = aggregate(ROWS)
    assert out["often_unused"] == ["Travel yoga mat"]  # Book only once — not demoted


def test_empty_history_yields_empty_flags():
    assert aggregate([]) == {"previously_forgot": [], "often_unused": []}
