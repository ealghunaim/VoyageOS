"""Open-Meteo adapter — free, keyless, 16-day horizon. Provider details stay HERE
so a vendor swap never touches the rules engine (Part 1 §6 adapter doctrine)."""
from __future__ import annotations

from datetime import date, timedelta

import httpx

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
HORIZON_DAYS = 15
PROVIDER = "open-meteo"


def geocode(place_name: str, country_code: str | None = None) -> tuple[float, float] | None:
    """Best-effort place → (lat, lng). None on miss; caller decides what that means."""
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get(GEOCODE_URL, params={"name": place_name, "count": 5, "language": "en"})
            r.raise_for_status()
            results = r.json().get("results") or []
    except Exception:
        return None
    if not results:
        return None
    if country_code:
        for res in results:
            if (res.get("country_code") or "").upper() == country_code.upper():
                return (res["latitude"], res["longitude"])
    return (results[0]["latitude"], results[0]["longitude"])


def fetch_daily(lat: float, lng: float, start: date, end: date) -> list[dict]:
    """Per-day forecast rows, clamped to provider horizon. Empty list on any failure —
    the caller treats missing weather as 'stay silent', never as 'guess' (law 5 spirit)."""
    today = date.today()
    start = max(start, today)
    end = min(end, today + timedelta(days=HORIZON_DAYS))
    if end < start:
        return []
    try:
        with httpx.Client(timeout=15) as c:
            r = c.get(FORECAST_URL, params={
                "latitude": lat, "longitude": lng,
                "daily": "temperature_2m_max,temperature_2m_min,"
                         "precipitation_probability_max,wind_speed_10m_max,uv_index_max",
                "timezone": "auto",
                "start_date": start.isoformat(), "end_date": end.isoformat(),
            })
            r.raise_for_status()
            d = r.json().get("daily") or {}
    except Exception:
        return []
    days = []
    for i, day in enumerate(d.get("time", [])):
        def g(key):
            arr = d.get(key) or []
            return arr[i] if i < len(arr) else None
        days.append({
            "date": day,
            "temp_max": g("temperature_2m_max"),
            "temp_min": g("temperature_2m_min"),
            "precip_prob": g("precipitation_probability_max"),
            "wind_kph": g("wind_speed_10m_max"),
            "uv": g("uv_index_max"),
        })
    return days
