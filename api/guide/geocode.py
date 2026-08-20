"""Coordinates for the places a guide recommends.

WHY NOT THE MODEL

An invented latitude is a specific, checkable falsehood that puts a restaurant
in the sea. Product Law #5 in its clearest form, so these come from a real
geocoder or not at all.

WHY NOT OPEN-METEO

The geocoder behind the wizard is a CITY database. Measured on eight real Kyoto
places it located two — and the misses were Nishiki Market, Fushimi Inari and
Kinkaku-ji. A radius filter over a sixth of the entries is not a feature. The
same eight against Nominatim: seven, the only miss being a café invented for
the test.

WHY IN THE BACKGROUND

Nominatim's usage policy caps clients at one request per second. Sixteen
lookups is therefore ~16 seconds, and a guide generation already takes ten or
twenty — doubling the wait to add a filter is a bad trade. Guides are cached
and read many times, so the lookups run after the guide is stored and returned.
The first read may say "0 of 12 located" and improve, which is true, rather
than a spinner pretending otherwise.

IDEMPOTENT, AND RESUMABLE MID-GUIDE

Each row records what happened to it, so a task that dies halfway can be run
again without redoing work or losing the record of a failure:

    coords absent      never tried
    coords: {...}      located
    coords: null       tried and failed, with geo_tries counting attempts

A never-tried row is attempted. A failed row is retried only while it is under
MAX_TRIES — a name that is not in OpenStreetMap will never be in
OpenStreetMap, and retrying it forever is exactly the unbounded traffic the
policy asks us not to generate.
"""
from __future__ import annotations

import threading
import time

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

#: Required by Nominatim's usage policy: identify the application and provide a
#: way to be contacted. https://operations.osmfoundation.org/policies/nominatim/
USER_AGENT = "VoyageOS/1.2 (+https://ealghunaim.github.io/voyageos-legal/)"

#: Their policy: "No heavy uses (an absolute maximum of 1 request per second)."
#: Enforced here rather than trusted to call sites, because a second caller is
#: how a polite client becomes an impolite one.
MIN_INTERVAL_S = 1.1

#: Fields holding place-like rows worth locating.
LOCATABLE = ("restaurants", "play", "visit")

#: A guide is bounded (16 restaurants, 6 play, 6 visit) but a future cap change
#: should not silently turn into a hundred requests.
MAX_LOOKUPS = 40

#: How many times a failing name is retried across separate runs. A place that
#: is not in OSM stays not in OSM; three attempts covers a transient outage and
#: then stops.
MAX_TRIES = 3

#: GLOBAL, deliberately. The throttle protects a shared external service, so it
#: has to hold across every task in this process — if these ever run in
#: parallel, a per-client interval would let N tasks send N requests a second
#: while each believed it was behaving.
_rate_lock = threading.Lock()
_last_request_at = 0.0


def _throttled_get(client: httpx.Client, params: dict) -> httpx.Response:
    """One request, never sooner than MIN_INTERVAL_S after the last."""
    global _last_request_at
    with _rate_lock:
        wait = MIN_INTERVAL_S - (time.monotonic() - _last_request_at)
        if wait > 0:
            time.sleep(wait)
        _last_request_at = time.monotonic()
    return client.get(NOMINATIM_URL, params=params)


def _lookup(client: httpx.Client, name: str, city: str, cc: str | None) -> dict | None:
    """One place → {lat, lng}, or None. Never raises: a miss is a normal answer."""
    query = f"{name}, {city}".strip(", ") if city else name
    params = {"q": query, "format": "json", "limit": 1}
    if cc:
        # Constrained to the destination's country: a hit in the wrong one is
        # worse than no hit, because the distance filter would silently exclude
        # a place that is actually round the corner.
        params["countrycodes"] = cc.lower()
    try:
        r = _throttled_get(client, params)
        r.raise_for_status()
        results = r.json() or []
    except Exception:
        return None
    if not results:
        return None
    try:
        return {"lat": round(float(results[0]["lat"]), 4),
                "lng": round(float(results[0]["lon"]), 4)}
    except (KeyError, TypeError, ValueError):
        return None


def _rows(guide: dict):
    for field in LOCATABLE:
        for row in guide.get(field) or []:
            if isinstance(row, dict) and (row.get("name") or "").strip():
                yield row


def pending(guide: dict) -> int:
    """Rows still worth attempting. Zero means the task has nothing to do."""
    return sum(1 for r in _rows(guide)
               if "coords" not in r
               or (r.get("coords") is None and (r.get("geo_tries") or 0) < MAX_TRIES))


def locate(guide: dict, city: str, cc: str | None) -> dict:
    """Attach coords to rows that need them. Mutates and returns the guide.

    Safe to call repeatedly: located rows are untouched, and failed rows are
    retried only while under MAX_TRIES.
    """
    seen: dict[str, dict | None] = {}
    budget = MAX_LOOKUPS

    with httpx.Client(timeout=10, headers={"User-Agent": USER_AGENT}) as client:
        for row in _rows(guide):
            tried = "coords" in row
            failed_before = tried and row.get("coords") is None
            if tried and not failed_before:
                continue                                  # already located
            if failed_before and (row.get("geo_tries") or 0) >= MAX_TRIES:
                continue                                  # given up on, deliberately
            if budget <= 0:
                break                                     # resume on the next run
            name = row["name"].strip()
            if name not in seen:
                seen[name] = _lookup(client, name, city, cc)
                budget -= 1
            row["coords"] = seen[name]
            if seen[name] is None:
                row["geo_tries"] = (row.get("geo_tries") or 0) + 1
            else:
                row.pop("geo_tries", None)

    located = [r for r in _rows(guide) if r.get("coords")]
    guide["located"] = {"found": len(located), "total": sum(1 for _ in _rows(guide))}
    return guide
