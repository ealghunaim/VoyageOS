"""Weather providers — resilient chain (v0.6.1).

Primary: Open-Meteo (rich daily data, but per-IP rate limits that shared
cloud egress IPs can exhaust). Fallback: MET Norway (cloud-friendly, needs
an identifying User-Agent per their ToS; no rain probability → the rain
rule stays honestly silent on fallback data). All failures LOG."""
from __future__ import annotations

import time as _time
from datetime import date, timedelta

import httpx

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MET_NO_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
ACCU_BASE = "https://dataservice.accuweather.com"
USER_AGENT = "VoyageOS/0.6 (+https://github.com/ealghunaim/VoyageOS)"
HORIZON_DAYS = 15
PROVIDER = "open-meteo"


def _search(place_name: str) -> list[dict]:
    try:
        with httpx.Client(timeout=10, headers={"User-Agent": USER_AGENT}) as c:
            r = c.get(GEOCODE_URL, params={"name": place_name, "count": 5, "language": "en"})
            r.raise_for_status()
            return r.json().get("results") or []
    except Exception as e:
        print(f"[weather] geocode failed for '{place_name}': {type(e).__name__}: {e}")
        return []


def geocode(place_name: str, country_code: str | None = None) -> tuple[float, float, str | None] | None:
    """Coordinates AND the country, because the geocoder returns both.

    This used to hand back only the latitude and longitude while reading
    country_code from the same response to disambiguate. Callers that had no
    country therefore had no way to learn one, which is how destinations ended
    up with coordinates and a null country_code — enough for weather, not
    enough for a flag.
    """
    results = _search(place_name)
    if not results:
        print(f"[weather] geocode: no results for '{place_name}'")
        return None
    if country_code:
        for res in results:
            if (res.get("country_code") or "").upper() == country_code.upper():
                return (res["latitude"], res["longitude"], (res.get("country_code") or "").upper() or None)
    top = results[0]
    return (top["latitude"], top["longitude"], (top.get("country_code") or "").upper() or None)


def _km_between(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    from math import asin, cos, radians, sin, sqrt
    dlat, dlng = radians(b_lat - a_lat), radians(b_lng - a_lng)
    h = sin(dlat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlng / 2) ** 2
    return 2 * 6371 * asin(sqrt(h))


#: How far a named candidate may sit from stored coordinates and still be
#: believed. Generous, because a country-level name resolves to a centroid that
#: can be a long way from the island someone is staying on — but not so
#: generous that a same-named place on another continent slips through.
COUNTRY_MATCH_KM = 300


def country_near(place_name: str, lat: float, lng: float) -> str | None:
    """The country for a destination that already has coordinates.

    Open-Meteo offers no reverse endpoint, so this searches the name and takes
    the candidate closest to the coordinates already on the row. Proximity is
    what makes it safe: "Springfield" returns a dozen answers, and only one of
    them is near the point already stored.
    """
    best, best_km = None, None
    for res in _search(place_name):
        km = _km_between(lat, lng, res["latitude"], res["longitude"])
        if best_km is None or km < best_km:
            best, best_km = res, km
    if best is None:
        return None
    if best_km > COUNTRY_MATCH_KM:
        print(f"[weather] country_near('{place_name}'): nearest match is "
              f"{best_km:.0f}km away — too far to trust, leaving it null")
        return None
    cc = (best.get("country_code") or "").upper() or None
    print(f"[weather] country_near('{place_name}') → {cc} ({best_km:.0f}km)")
    return cc


def _fetch_open_meteo(lat: float, lng: float) -> list[dict]:
    """Retries on 429 (shared-IP congestion often clears within seconds)."""
    for attempt in (1, 2, 3):
        try:
            with httpx.Client(timeout=15, headers={"User-Agent": USER_AGENT}) as c:
                r = c.get(FORECAST_URL, params={
                    "latitude": lat, "longitude": lng,
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,"
                             "wind_speed_10m_max,uv_index_max,snowfall_sum",
                    "timezone": "auto", "forecast_days": 16,
                })
                if r.status_code == 429:
                    wait = min(int(r.headers.get("Retry-After", 2 * attempt)), 8)
                    print(f"[weather] open-meteo 429 (attempt {attempt}) — waiting {wait}s")
                    _time.sleep(wait)
                    continue
                r.raise_for_status()
                body = r.json()
                if body.get("error"):
                    print(f"[weather] open-meteo error: {body.get('reason')}")
                    return []
                d = body.get("daily") or {}
        except Exception as e:
            print(f"[weather] open-meteo fetch failed: {type(e).__name__}: {e}")
            return []
        days = []
        for i, day in enumerate(d.get("time", [])):
            def g(key):
                arr = d.get(key) or []
                return arr[i] if i < len(arr) else None
            days.append({"date": day, "temp_max": g("temperature_2m_max"),
                         "temp_min": g("temperature_2m_min"),
                         "precip_prob": g("precipitation_probability_max"),
                         "wind_kph": g("wind_speed_10m_max"),
                         "uv": g("uv_index_max"), "snow_cm": g("snowfall_sum"),
                         "provider": "open-meteo"})
        return days
    print("[weather] open-meteo: rate-limited after retries — falling back")
    return []


def met_daily_from_timeseries(timeseries: list[dict]) -> list[dict]:
    """Pure fold: MET's hourly entries → daily rows. No rain probability
    exists in this feed, so precip_prob stays None — never invented."""
    by_date: dict[str, dict] = {}
    for entry in timeseries:
        day = (entry.get("time") or "")[:10]
        details = ((entry.get("data") or {}).get("instant") or {}).get("details") or {}
        if not day or "air_temperature" not in details:
            continue
        b = by_date.setdefault(day, {"temps": [], "winds": []})
        b["temps"].append(details["air_temperature"])
        if "wind_speed" in details:
            b["winds"].append(details["wind_speed"] * 3.6)  # m/s → kph
    return [{"date": day, "temp_max": max(b["temps"]), "temp_min": min(b["temps"]),
             "precip_prob": None,
             "wind_kph": max(b["winds"]) if b["winds"] else None,
             "uv": None, "provider": "met-no"}
            for day, b in sorted(by_date.items())]


def _fetch_met_no(lat: float, lng: float) -> list[dict]:
    try:
        with httpx.Client(timeout=15, headers={"User-Agent": USER_AGENT}) as c:
            r = c.get(MET_NO_URL, params={"lat": round(lat, 4), "lon": round(lng, 4)})
            r.raise_for_status()
            ts = ((r.json().get("properties") or {}).get("timeseries")) or []
    except Exception as e:
        print(f"[weather] met.no fetch failed: {type(e).__name__}: {e}")
        return []
    days = met_daily_from_timeseries(ts)
    if days:
        print(f"[weather] met.no fallback delivered {len(days)} day(s)")
    return days


def _accu_headers(key: str) -> dict:
    return {"Authorization": f"Bearer {key}", "User-Agent": USER_AGENT,
            "Accept-Encoding": "gzip,deflate"}


def accu_locate(lat: float, lng: float, key: str) -> str | None:
    """Coordinates → AccuWeather location key. One call, cached forever."""
    try:
        with httpx.Client(timeout=10, headers=_accu_headers(key)) as c:
            r = c.get(f"{ACCU_BASE}/locations/v1/cities/geoposition/search",
                      params={"q": f"{lat},{lng}", "apikey": key})
            r.raise_for_status()
            loc = r.json()
        return str(loc.get("Key")) if loc and loc.get("Key") else None
    except Exception as e:
        print(f"[weather] accuweather locate failed: {type(e).__name__}: {e}")
        return None


def accu_daily_from_forecasts(payload: dict) -> list[dict]:
    """Pure mapper: 5-day response → provider rows. Tested offline."""
    rows = []
    for f in payload.get("DailyForecasts") or []:
        day = (f.get("Date") or "")[:10]
        temp = f.get("Temperature") or {}
        uv = None
        for a in f.get("AirAndPollen") or []:
            if a.get("Name") == "UVIndex":
                uv = a.get("Value")
        probs = [((f.get("Day") or {}).get("PrecipitationProbability")),
                 ((f.get("Night") or {}).get("PrecipitationProbability"))]
        probs = [p for p in probs if p is not None]
        wind = (((f.get("Day") or {}).get("Wind") or {}).get("Speed") or {}).get("Value")
        if not day:
            continue
        rows.append({"date": day,
                     "temp_max": (temp.get("Maximum") or {}).get("Value"),
                     "temp_min": (temp.get("Minimum") or {}).get("Value"),
                     "precip_prob": max(probs) if probs else None,
                     "wind_kph": wind, "uv": uv, "provider": "accuweather"})
    return rows


def fetch_accuweather(location_key: str, key: str) -> list[dict]:
    try:
        with httpx.Client(timeout=12, headers=_accu_headers(key)) as c:
            r = c.get(f"{ACCU_BASE}/forecasts/v1/daily/5day/{location_key}",
                      params={"metric": "true", "details": "true", "apikey": key})
            r.raise_for_status()
            remaining = r.headers.get("RateLimit-Remaining") or r.headers.get("ratelimit-remaining")
            rows = accu_daily_from_forecasts(r.json())
            note = f" ({remaining} calls left today)" if remaining else ""
            print(f"[weather] accuweather delivered {len(rows)} day(s){note}")
            return rows
    except Exception as e:
        print(f"[weather] accuweather fetch failed: {type(e).__name__}: {e}")
        return []


def fetch_daily(lat: float, lng: float, start: date, end: date,
                accu: tuple[str, str] | None = None) -> list[dict]:
    """Priority merge: AccuWeather (near window) > Open-Meteo > MET Norway.
    If AccuWeather alone covers the whole trip window, the free providers
    are spared entirely — fast path for final-approach refreshes."""
    today = date.today()
    lo_d, hi_d = max(start, today), min(end, today + timedelta(days=HORIZON_DAYS))
    if hi_d < lo_d:
        return []
    lo, hi = lo_d.isoformat(), hi_d.isoformat()
    need = {(lo_d + timedelta(days=i)).isoformat()
            for i in range((hi_d - lo_d).days + 1)}
    by_date: dict[str, dict] = {}

    def absorb(rows):
        for d in rows:
            by_date.setdefault(d["date"], d)

    if accu:
        absorb(fetch_accuweather(*accu))
        if need <= set(by_date):
            return [by_date[k] for k in sorted(by_date) if lo <= k <= hi]
    om = _fetch_open_meteo(lat, lng)
    absorb(om)
    if not om:
        absorb(_fetch_met_no(lat, lng))
    return [by_date[k] for k in sorted(by_date) if lo <= k <= hi]


def fetch_climatology(lat: float, lng: float, start: date, end: date) -> list[dict]:
    """Same dates LAST YEAR from the archive — honest 'typical' temps for trips
    beyond every forecast horizon. Display-only: rules never fire on these."""
    try:
        with httpx.Client(timeout=15, headers={"User-Agent": USER_AGENT}) as c:
            r = c.get(ARCHIVE_URL, params={
                "latitude": lat, "longitude": lng,
                "start_date": start.replace(year=start.year - 1).isoformat(),
                "end_date": end.replace(year=end.year - 1).isoformat(),
                "daily": "temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
                "timezone": "auto",
            })
            r.raise_for_status()
            d = r.json().get("daily") or {}
    except Exception as e:
        print(f"[weather] climatology fetch failed: {type(e).__name__}: {e}")
        return []
    days = []
    for i, day in enumerate(d.get("time", [])):
        try:
            this_year = date.fromisoformat(day)
            shifted = this_year.replace(year=this_year.year + 1).isoformat()
        except ValueError:
            continue
        def g(key):
            arr = d.get(key) or []
            return arr[i] if i < len(arr) else None
        days.append({"date": shifted, "temp_max": g("temperature_2m_max"),
                     "temp_min": g("temperature_2m_min"), "precip_prob": None,
                     "wind_kph": g("wind_speed_10m_max"), "uv": None,
                     "provider": "climatology"})
    if days:
        print(f"[weather] climatology delivered {len(days)} typical day(s)")
    return days
