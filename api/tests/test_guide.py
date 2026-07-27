from api.guide.service import sanitize


def test_sanitize_clips_and_whitelists():
    raw = {"etiquette": [f"rule {i}" for i in range(20)],
           "eat": [{"name": "Machboos", "note": "x" * 500}, {"junk": True}],
           "evil_key": "dropped", "power": {"plugs": "Type G, 240V"},
           "go": {"from_airport": ["Metro", "Taxi", "Bus", "Careem", "Extra"]}}
    out = sanitize(raw)
    assert len(out["etiquette"]) == 6
    assert out["eat"] == [{"name": "Machboos", "note": "x" * 140}]
    assert "evil_key" not in out
    assert len(out["go"]["from_airport"]) == 4


def test_sanitize_survives_garbage():
    out = sanitize({})
    assert out["power"]["plugs"] == "" and out["eat"] == [] and out["go"]["around"] == []
