from datetime import date
from api.documents.expiry import evaluate
from api.packing.weight import sum_weight

TODAY = date(2026, 7, 27)


def test_expiry_levels_at_boundaries():
    assert evaluate(date(2026, 7, 26), TODAY)["level"] == "expired"
    assert evaluate(date(2026, 12, 27), TODAY)["level"] == "critical"   # ~5 months
    assert evaluate(date(2027, 6, 27), TODAY)["level"] == "soon"        # ~11 months
    assert evaluate(date(2028, 7, 27), TODAY)["level"] == "ok"


def test_expiry_wording_is_unsourced_law5():
    msg = evaluate(date(2026, 12, 27), TODAY)["message"]
    assert "check the official rule" in msg and "!" not in msg


def test_weight_counts_only_committed_items():
    rows = [
        {"qty": 2, "status": "packed", "items": {"default_weight_g": 150}},   # 300
        {"qty": 1, "status": "accepted", "items": {"default_weight_g": 1200}},  # 1200
        {"qty": 3, "status": "suggested", "items": {"default_weight_g": 999}},  # not committed
        {"qty": 1, "status": "rejected", "items": {"default_weight_g": 999}},   # gone
        {"qty": 1, "status": "packed", "items": None},                          # unweighed
    ]
    assert sum_weight(rows) == (1500, 2, 1)
