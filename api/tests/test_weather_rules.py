"""The rules engine is the decision-maker — it gets the strictest tests (law 2)."""
from api.weather.rules import evaluate

DOHA_AUG = [
    {"date": "2026-08-10", "temp_max": 43, "temp_min": 31, "precip_prob": 0, "wind_kph": 22, "uv": 11},
    {"date": "2026-08-11", "temp_max": 44, "temp_min": 32, "precip_prob": 0, "wind_kph": 25, "uv": 11},
]
MILD = [
    {"date": "2026-08-10", "temp_max": 24, "temp_min": 12, "precip_prob": 20, "wind_kph": 15, "uv": 5},
]


def test_doha_august_fires_sun_kit_only():
    keys = {i["key"] for i in evaluate(DOHA_AUG, "Doha")}
    assert keys == {"sun_kit"}


def test_sun_reason_cites_concrete_data():
    (ins,) = evaluate(DOHA_AUG, "Doha")
    assert "44°C" in ins["reason"] and "Doha" in ins["reason"] and "!" not in ins["reason"]


def test_rain_triggers_at_threshold_not_below():
    wet = [{**MILD[0], "precip_prob": 60}]
    assert {i["key"] for i in evaluate(wet, "Kyoto")} == {"rain_kit"}
    assert evaluate(MILD, "Kyoto") == []


def test_cold_and_wind():
    rough = [{"date": "2026-12-01", "temp_max": 8, "temp_min": 2, "precip_prob": 10,
              "wind_kph": 55, "uv": 1}]
    keys = {i["key"] for i in evaluate(rough, "Tromsø")}
    assert keys == {"cold_layer", "wind_layer"}


def test_every_item_carries_dedupe_terms():
    for ins in evaluate(DOHA_AUG, "X") + evaluate([{**MILD[0], "precip_prob": 90}], "X"):
        for item in ins["items"]:
            assert item["dedupe"], item["name"]


def test_empty_days_stay_silent():
    assert evaluate([], "Anywhere") == []
