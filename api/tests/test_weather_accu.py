"""The AccuWeather mapper is pure and honest — real fields, no inventions."""
from api.weather.provider import accu_daily_from_forecasts

PAYLOAD = {"DailyForecasts": [{
    "Date": "2026-07-29T07:00:00+03:00",
    "Temperature": {"Minimum": {"Value": 33.1}, "Maximum": {"Value": 44.8}},
    "Day": {"PrecipitationProbability": 2, "Wind": {"Speed": {"Value": 24.1}}},
    "Night": {"PrecipitationProbability": 6},
    "AirAndPollen": [{"Name": "AirQuality", "Value": 40}, {"Name": "UVIndex", "Value": 11}],
}]}


def test_mapper_extracts_everything():
    (row,) = accu_daily_from_forecasts(PAYLOAD)
    assert row["date"] == "2026-07-29"
    assert row["temp_max"] == 44.8 and row["temp_min"] == 33.1
    assert row["precip_prob"] == 6          # max of day/night
    assert row["uv"] == 11 and row["wind_kph"] == 24.1
    assert row["provider"] == "accuweather"


def test_mapper_survives_gaps():
    assert accu_daily_from_forecasts({}) == []
    rows = accu_daily_from_forecasts({"DailyForecasts": [{"Date": "2026-07-29T07:00:00"}]})
    assert rows[0]["precip_prob"] is None and rows[0]["uv"] is None
