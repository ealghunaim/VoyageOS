"""The MET fallback fold must be honest: real temps and wind, no invented rain."""
from api.weather.provider import met_daily_from_timeseries

TS = [
    {"time": "2026-08-10T06:00:00Z", "data": {"instant": {"details":
        {"air_temperature": 31.0, "wind_speed": 5.0}}}},
    {"time": "2026-08-10T13:00:00Z", "data": {"instant": {"details":
        {"air_temperature": 43.2, "wind_speed": 8.0}}}},
    {"time": "2026-08-11T13:00:00Z", "data": {"instant": {"details":
        {"air_temperature": 44.0, "wind_speed": 6.0}}}},
    {"time": "2026-08-11T23:00:00Z", "data": {"instant": {"details":
        {"air_temperature": 33.5}}}},
]


def test_daily_fold_min_max_and_kph():
    days = met_daily_from_timeseries(TS)
    assert [d["date"] for d in days] == ["2026-08-10", "2026-08-11"]
    d0 = days[0]
    assert d0["temp_max"] == 43.2 and d0["temp_min"] == 31.0
    assert round(d0["wind_kph"], 1) == 28.8  # 8 m/s → kph
    assert d0["provider"] == "met-no"


def test_no_invented_rain_probability():
    assert all(d["precip_prob"] is None for d in met_daily_from_timeseries(TS))


def test_doha_fallback_still_fires_sun_rule_via_temperature():
    from api.weather.rules import evaluate
    keys = {i["key"] for i in evaluate(met_daily_from_timeseries(TS), "Doha")}
    assert "sun_kit" in keys  # 44°C carries it even with uv unknown
