"""Open-Meteo adapter — free, keyless. Uses the canonical forecast_days=16 mode
(the date-bounded mode has known edge bugs) and filters to the trip window
locally. Provider failures are LOGGED, never swallowed — silence is only ever
a product decision, not an accident.
"""
from __future__ import annotations

from datetime import date, timedelta

import httpx

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
HORIZON_DAYS = 15
PROVIDER = "open-meteo"


def geocode(place_name: str, country_code: str | None = None) -> tuple[float, float] | None:
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get(GEOCODE_URL, params={"name": place_name, "count": 5, "language": "en"})
            r.raise_for_status()
            results = r.json().get("results") or []
    except Exception as e:
        print(f"[weather] geocode failed for '{place_name}': {type(e).__name__}: {e}")
        return None
    if not results:
        print(f"[weather] geocode: no results for '{place_name}'")
        return None
    if country_code:
        for res in results:
            if (res.get("country_code") or "").upper() == country_code.upper():
                return (res["latitude"], res["longitude"])
    return (results[0]["latitude"], results[0]["longitude"])


def fetch_daily(lat: float, lng: float, start: date, end: date) -> list[dict]:
    today = date.today()
    lo = max(start, today).isoformat()
    hi = min(end, today + timedelta(days=HORIZON_DAYS)).isoformat()
    if hi < lo:
        return []
    try:
        with httpx.Client(timeout=15) as c:
            r = c.get(FORECAST_URL, params={
                "latitude": lat, "longitude": lng,
                "daily": "temperature_2m_max,temperature_2m_min,"
                         "precipitation_probability_max,wind_speed_10m_max,uv_index_max",
                "timezone": "auto",
                "forecast_days": 16,
            })
            r.raise_for_status()
            body = r.json()
            if body.get("error"):
                print(f"[weather] provider error: {body.get('reason')}")
                return []
            d = body.get("daily") or {}
    except Exception as e:
        print(f"[weather] fetch failed: {type(e).__name__}: {e}")
        return []
    days = []
    for i, day in enumerate(d.get("time", [])):
        if not (lo <= day <= hi):
            continue
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
