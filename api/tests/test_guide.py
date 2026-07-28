from api.guide.service import sanitize


def test_sanitize_clips_and_whitelists():
    raw = {"etiquette": [f"rule {i}" for i in range(20)],
           "eat": [{"name": "Machboos", "note": "x" * 500}, {"junk": True}],
           "evil_key": "dropped", "power": {"plugs": "Type G, 240V"},
           "go": {"from_airport": ["Metro", "Taxi", "Bus", "Careem", "Extra"]}}
    out = sanitize(raw)
    assert len(out["etiquette"]) == 6
    assert len(out["eat"]) == 1
    assert out["eat"][0]["name"] == "Machboos" and out["eat"][0]["note"] == "x" * 140
    assert set(out["eat"][0]) == {"name", "note", "order", "when", "area"}
    assert "evil_key" not in out
    assert len(out["go"]["from_airport"]) == 4


def test_sanitize_survives_garbage():
    out = sanitize({})
    assert out["power"]["plugs"] == "" and out["eat"] == [] and out["go"]["around"] == []
