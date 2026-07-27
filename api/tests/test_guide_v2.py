from api.guide.service import sanitize


def test_health_list_survives_and_clips():
    out = sanitize({"health": [f"tip {i}" for i in range(9)]})
    assert len(out["health"]) == 5
