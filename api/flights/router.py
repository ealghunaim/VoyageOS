"""Flight lookup — server-side AeroDataBox call, key stays in the environment.
Returns clean origin/dest/times for one flight number + date. Never fabricates:
if the feed has nothing or the key is unset, it says so plainly."""
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException

from api.core.auth import current_user_id
from api.core.config import settings

router = APIRouter(prefix="/v1/flights", tags=["flights"])

ADB_HOST = "aerodatabox.p.rapidapi.com"


def _fmt(dt: dict | None) -> str | None:
    """AeroDataBox gives {'local': '2026-08-10 02:15+03:00', 'utc': ...}."""
    if not dt:
        return None
    local = dt.get("local")
    if not local:
        return None
    # '2026-08-10 02:15+03:00' -> ISO '2026-08-10T02:15'
    return local.replace(" ", "T")[:16]


@router.get("/{number}/{date}")
def lookup_flight(number: str, date: str, user_id: str = Depends(current_user_id)):
    if not settings.aerodatabox_api_key:
        raise HTTPException(503, "Flight lookup isn't configured yet.")
    num = number.strip().upper().replace(" ", "")

    # The plan is rate limited per second, so adding two legs in quick
    # succession trips it. That used to surface as a 502 "flight service is
    # busy", which blames the provider for our own throttle and tells the
    # traveller nothing useful. One short backoff clears it in practice.
    r = None
    for attempt in (1, 2):
        try:
            with httpx.Client(timeout=12) as c:
                r = c.get(
                    f"https://{ADB_HOST}/flights/number/{num}/{date}",
                    params={"withAircraftImage": "false", "withLocation": "false"},
                    headers={"x-rapidapi-host": ADB_HOST,
                             "x-rapidapi-key": settings.aerodatabox_api_key},
                )
        except Exception as e:
            print(f"[flights] {num} transport error: {type(e).__name__}: {e}")
            raise HTTPException(502, "Flight service is unreachable — try again in a moment.")

        if r.status_code == 429 and attempt == 1:
            print(f"[flights] {num} rate limited — backing off once")
            time.sleep(1.2)
            continue
        break

    if r.status_code == 429:
        raise HTTPException(429, "Too many lookups just now — wait a moment and try again.")
    # 204 with an empty body is how the feed says "that number does not fly on
    # that date" — a real answer, not an error, and it must not reach r.json().
    if r.status_code in (204, 404) or not r.content:
        raise HTTPException(404, "No flight found for that number and date.")
    if r.status_code >= 400:
        print(f"[flights] {num} upstream {r.status_code}: {r.text[:160]}")
        raise HTTPException(502, "Flight service is busy — try again in a moment.")
    try:
        data = r.json()
    except ValueError:
        print(f"[flights] {num} unparseable body: {r.text[:160]!r}")
        raise HTTPException(502, "Flight service returned something unreadable.")

    flights = data if isinstance(data, list) else [data]
    if not flights:
        raise HTTPException(404, "No flight found for that number and date.")
    f = flights[0]
    dep = f.get("departure") or {}
    arr = f.get("arrival") or {}
    dep_ap = dep.get("airport") or {}
    arr_ap = arr.get("airport") or {}
    return {
        "number": num,
        "origin": dep_ap.get("iata") or dep_ap.get("icao") or dep_ap.get("name"),
        "dest": arr_ap.get("iata") or arr_ap.get("icao") or arr_ap.get("name"),
        "depart": _fmt(dep.get("scheduledTime") or dep.get("revisedTime")),
        "arrive": _fmt(arr.get("scheduledTime") or arr.get("revisedTime")),
        "status": f.get("status"),
    }
