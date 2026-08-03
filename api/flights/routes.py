"""Route browsing — "what flies BKK to SIN that day", metered carefully.

AeroDataBox charges by API unit. The airport-schedule endpoint measured at 2
units a call and refuses windows longer than 12 hours, so one full day costs
two calls and 4 units. Pro carries 6000 units a month: roughly 1500 whole-day
searches. That is enough for deliberate searching and nowhere near enough to
serve keystrokes, which is why this is a button and not an autocomplete.

Three guards, in order:
  1. the cache — a repeated (route, date) never reaches the provider again
  2. the budget — refuses before spending when the provider says we are low
  3. the ledger — every request is recorded, hit or miss, so spend is a query
"""
from __future__ import annotations

import time
from datetime import date, datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException

from api.core.auth import current_user_id
from api.core.config import settings
from api.core.db import get_db

router = APIRouter(prefix="/v1/flights", tags=["flights"])

ADB_HOST = "aerodatabox.p.rapidapi.com"

#: Measured, not documented: two consecutive calls moved the reported
#: remaining by exactly this much.
UNITS_PER_CALL = 2

#: The provider rejects anything longer, so a day is covered in two halves.
WINDOW_HOURS = 12

#: Stop spending while there is still a reserve, so number lookups — which a
#: traveller needs to finish an itinerary — keep working after browsing has
#: eaten the month. Browsing is the luxury; the lookup is the feature.
UNITS_RESERVE = 200

#: A schedule for a past-or-today date can still change; older cache is fine
#: for a date far out. One day is a reasonable blanket.
CACHE_TTL = timedelta(hours=24)


def _headers() -> dict:
    return {"x-rapidapi-host": ADB_HOST, "x-rapidapi-key": settings.aerodatabox_api_key}


def _log(db, user_id: str, *, kind: str, origin: str | None = None, dest: str | None = None,
         flight_date: str | None = None, calls: int = 0, units_remaining: int | None = None,
         cached: bool = False) -> None:
    """Ledger write must never break the search — same rule as the ai_runs log."""
    try:
        db.table("flight_api_usage").insert({
            "user_id": user_id, "kind": kind, "origin": origin, "dest": dest,
            "flight_date": flight_date, "calls": calls,
            "units_spent": calls * UNITS_PER_CALL if calls else 0,
            "units_remaining": units_remaining, "cached": cached,
        }).execute()
    except Exception as e:  # noqa: BLE001
        print(f"[flights] usage log failed ({type(e).__name__}: {str(e)[:120]})")


def _last_known_remaining(db) -> int | None:
    try:
        rows = (db.table("flight_api_usage").select("units_remaining")
                .not_.is_("units_remaining", "null")
                .order("created_at", desc=True).limit(1).execute()).data
        return rows[0]["units_remaining"] if rows else None
    except Exception:
        return None


def _fetch_window(origin: str, start: datetime) -> tuple[list, int | None]:
    """One 12-hour slice of an airport's departures. Returns (rows, units_left)."""
    end = start + timedelta(hours=WINDOW_HOURS)
    url = (f"https://{ADB_HOST}/flights/airports/iata/{origin}"
           f"/{start.strftime('%Y-%m-%dT%H:%M')}/{end.strftime('%Y-%m-%dT%H:%M')}")
    r = None
    for attempt in (1, 2):
        try:
            with httpx.Client(timeout=25) as c:
                r = c.get(url, headers=_headers(), params={
                    "withLeg": "true", "withCancelled": "false",
                    "withCodeshared": "false", "withCargo": "false",
                    "withPrivate": "false", "withLocation": "false",
                })
        except Exception as e:
            print(f"[flights] route transport error: {type(e).__name__}: {e}")
            raise HTTPException(502, "Flight service is unreachable — try again in a moment.")
        if r.status_code == 429 and attempt == 1:
            print("[flights] route rate limited — backing off once")
            time.sleep(1.2)
            continue
        break

    left = r.headers.get("x-ratelimit-api-units-remaining")
    left = int(left) if left and left.isdigit() else None
    if r.status_code == 429:
        raise HTTPException(429, "Too many lookups just now — wait a moment and try again.")
    if r.status_code in (204, 404) or not r.content:
        return [], left
    if r.status_code >= 400:
        print(f"[flights] route upstream {r.status_code}: {r.text[:160]}")
        raise HTTPException(502, "Flight service is busy — try again in a moment.")
    try:
        body = r.json()
    except ValueError:
        return [], left
    return (body.get("departures") or []), left


def _shape(dep: dict) -> dict | None:
    """Keep only what a segment needs. Never invent a field."""
    num = (dep.get("number") or "").strip()
    arr = dep.get("arrival") or {}
    d = dep.get("departure") or {}
    arr_ap = arr.get("airport") or {}

    def when(slot: dict | None) -> str | None:
        t = (slot or {}).get("scheduledTime") or (slot or {}).get("revisedTime") or {}
        local = t.get("local")
        return local.replace(" ", "T")[:16] if local else None

    if not num:
        return None
    return {
        "number": num,
        "airline": ((dep.get("airline") or {}).get("name") or "").strip() or None,
        "dest": arr_ap.get("iata") or arr_ap.get("icao"),
        "depart": when(d), "arrive": when(arr),
        "status": dep.get("status"),
    }


@router.get("/route/{origin}/{dest}/{flight_date}")
def search_route(origin: str, dest: str, flight_date: str,
                 user_id: str = Depends(current_user_id)):
    if not settings.aerodatabox_api_key:
        raise HTTPException(503, "Flight lookup isn't configured yet.")
    o, d = origin.strip().upper(), dest.strip().upper()
    if len(o) != 3 or len(d) != 3:
        raise HTTPException(400, "Route search needs three-letter airport codes, e.g. BKK to SIN.")
    try:
        day = date.fromisoformat(flight_date)
    except ValueError:
        raise HTTPException(400, "Date must be YYYY-MM-DD.")

    db = get_db()

    # 1 — cache. The cheapest search is the one that never leaves the building.
    try:
        rows = (db.table("flight_route_cache").select("payload,fetched_at")
                .eq("origin", o).eq("dest", d).eq("flight_date", day.isoformat())
                .limit(1).execute()).data
    except Exception:
        rows = []
    if rows:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(rows[0]["fetched_at"])
        if age < CACHE_TTL:
            _log(db, user_id, kind="route", origin=o, dest=d,
                 flight_date=day.isoformat(), calls=0, cached=True)
            return {"origin": o, "dest": d, "date": day.isoformat(),
                    "flights": rows[0]["payload"], "cached": True, "units_spent": 0}

    # 2 — budget. Refuse before spending, using the provider's own counter.
    left = _last_known_remaining(db)
    if left is not None and left < UNITS_RESERVE:
        raise HTTPException(
            429,
            f"Flight search is paused for this month — {left} API units left, "
            f"held back for flight-number lookups. Resets when the plan does.",
        )

    # 3 — fetch: two 12-hour windows to cover the day, filtered to this route.
    calls, units_left = 0, None
    found: list[dict] = []
    for half in (0, WINDOW_HOURS):
        start = datetime.combine(day, datetime.min.time()) + timedelta(hours=half)
        deps, units_left = _fetch_window(o, start)
        calls += 1
        for dep in deps:
            shaped = _shape(dep)
            if shaped and shaped["dest"] == d:
                found.append(shaped)

    found.sort(key=lambda f: f["depart"] or "")
    _log(db, user_id, kind="route", origin=o, dest=d, flight_date=day.isoformat(),
         calls=calls, units_remaining=units_left, cached=False)

    try:
        db.table("flight_route_cache").upsert({
            "origin": o, "dest": d, "flight_date": day.isoformat(),
            "payload": found, "fetched_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="origin,dest,flight_date").execute()
    except Exception as e:  # noqa: BLE001 — caching is an optimisation, not the answer
        print(f"[flights] route cache write failed ({type(e).__name__}: {str(e)[:120]})")

    return {"origin": o, "dest": d, "date": day.isoformat(), "flights": found,
            "cached": False, "units_spent": calls * UNITS_PER_CALL,
            "units_remaining": units_left}
