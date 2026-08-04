"""Landmark photos from Wikimedia, or nothing.

A stock photo of a dish is honest — it shows what the dish looks like. A wrong
photo under a named landmark is a factual claim about a real place, which puts
it in the same family as Product Law #5. So the only source used here is one
that can answer "I don't know", and every gate below is tuned to fail closed.

Four gates, all measured against real guide data before being chosen:

  coordinates   the article must be a place at all. 'Japanese tea ceremony'
                and 'Sumo' have none, so a generic activity resolves to
                nothing rather than to an arbitrary building.

  100 km        from the trip's own destination. This is the one that matters
                most: searching 'Grand Mosque' alone returns 'Grand Mosque
                seizure' — the 1979 Mecca siege — which is 1204 km from Kuwait
                City and would have been captioned as a Kuwaiti landmark.

  similarity    ≥ 0.6 between the item name and the article title, both with
                parentheticals stripped, so 'Kinkaku-ji (Golden Pavilion)'
                matches 'Kinkaku-ji' and an unrelated article does not.

  attribution   CC BY and CC BY-SA both require the author and licence to be
                shown. If either cannot be read, the photo cannot be published,
                so it is dropped — Kuwait Towers loses its photo this way.

The destination name is appended to the search itself, which is what turns
'Grand Mosque' into 'Grand Mosque of Kuwait' rather than relying on the
distance gate to reject the wrong answer afterwards.
"""
from __future__ import annotations

import difflib
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import unquote

import httpx

from api.core.geo import km_between

WIKI_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

#: Wikimedia asks for a descriptive agent that identifies the caller. A generic
#: client string is grounds for being blocked, and rightly so.
USER_AGENT = "VoyageOS/1.0 (https://voyageos.app; contact via app store listing)"

MATCH_KM = 100                 # a landmark is in the city you are visiting
MIN_SIMILARITY = 0.6
SEARCH_CANDIDATES = 3
THUMB_PX = 1200
TIMEOUT_S = 8

#: Five at a time earned a wall of 429s from Wikipedia and turned two whole
#: destinations into zero matches — a rate limit reads exactly like "nothing
#: found" unless you are watching for it. Two is polite, and the cache means
#: the cost is paid once per destination rather than per viewer.
MAX_PARALLEL = 2

#: A 429 is transient, so it must not be cached for a week. But it must be
#: cached for something, or every render retries the same rejected item and
#: the storm feeds itself.
RATE_LIMIT_TTL_S = 120
RETRY_STATUSES = {429, 503}
MAX_RETRIES = 3

#: Activity phrasing wrapped around a place name. 'Hike the Fushimi Inari
#: trail' is a real landmark with a verb bolted on; stripping it is what lets
#: the Play section match at all.
_AFFIX = re.compile(
    r"^(hike the|hike|cycle through|cycle|evening walk through|walk through|"
    r"stroll through|explore|visit|see|tour)\s+|"
    r"\s+(visit|walk|hike|hopping|at night|at sunset|trail|experience)$",
    re.I)
_PAREN = re.compile(r"\s*\([^)]*\)")
_TAG = re.compile(r"<[^>]+>")
_NON_FREE = re.compile(r"fair use|non-free|nonfree|NC-|noncommercial|"
                       r"all rights reserved", re.I)


def strip_affixes(name: str) -> str:
    """'Hike the Fushimi Inari trail' → 'Fushimi Inari'. Applied repeatedly
    because an item can carry both a leading verb and a trailing noun."""
    out = name.strip()
    for _ in range(3):
        new = _AFFIX.sub("", out).strip()
        if new == out:
            break
        out = new
    return out or name.strip()


def normalize(s: str) -> str:
    """Comparison form: no parenthetical, no case, no padding."""
    return _PAREN.sub("", s).strip().lower()


_DAY_TRIP = re.compile(r"\bday trip\b", re.I)
MAX_VARIANTS = 3


def query_variants(name: str) -> list[str]:
    """Ordered guesses at the entity inside a guide item.

    Live guide phrasing is not a bare landmark name. It carries a district
    after a comma ("Senso-ji Temple, Asakusa"), pairs two places with an
    ampersand ("Meiji Shrine & Yoyogi Park"), or buries the real subject in a
    parenthetical ("Nikko day trip (Toshogu Shrine)").

    The comma is genuinely ambiguous — "Senso-ji Temple, Asakusa" leads with
    the entity, "TeamLab aside, Shinjuku Gyoen National Garden" trails it — so
    rather than guess a side, both are offered and the gates decide. Nothing
    here loosens a gate; it only gives the matcher better things to ask about.
    """
    out: list[str] = []

    def add(candidate: str) -> None:
        c = strip_affixes(candidate.strip(" ,.-"))
        if c and c.lower() not in {o.lower() for o in out}:
            out.append(c)

    # "A & B" names a pair, and the first is the headline — "Westminster Abbey
    # & Parliament Square" is about the abbey. Tried before the full string,
    # because searching the whole phrase tends to land on whichever of the two
    # the search engine likes and that was reliably the second one.
    if "&" in name:
        add(name.split("&")[0])

    add(name)

    # "Nikko day trip (Toshogu Shrine)" — the parenthetical is the real subject
    # when the outer text is a trip rather than a place.
    inner = re.search(r"\(([^)]+)\)", name)
    if inner and _DAY_TRIP.search(name):
        add(inner.group(1))

    if "," in name:
        head, _, tail = name.rpartition(",")
        add(head)
        add(tail)

    return out[:MAX_VARIANTS]


# ── cache ────────────────────────────────────────────────────────────────────
#
# Nulls are cached too. Roughly a third of items legitimately have no usable
# photo, and without caching the misses every guide open would re-run three
# API calls per item to learn the same thing.

_CACHE: dict[tuple[str, str], tuple[dict | None, float]] = {}
_CACHE_TTL_S = 7 * 24 * 60 * 60
_CACHE_MAX = 2000
_LOCK = threading.Lock()


def _cache_get(key):
    with _LOCK:
        hit = _CACHE.get(key)
        if not hit:
            return False, None
        value, expires = hit
        if expires < time.time():
            _CACHE.pop(key, None)
            return False, None
        return True, value


def _cache_put(key, value, ttl: float = _CACHE_TTL_S):
    with _LOCK:
        if len(_CACHE) >= _CACHE_MAX:
            _CACHE.clear()          # crude, but a photo cache has no hot set
        _CACHE[key] = (value, time.time() + ttl)


# ── the pipeline ─────────────────────────────────────────────────────────────

def _get(client: httpx.Client, url: str, params: dict) -> dict:
    """One call, backing off if Wikimedia asks us to.

    Retry-After is honoured when sent; otherwise the wait doubles. Giving up
    raises, and the caller caches that briefly so a limited item stops being
    re-requested on every render.
    """
    for attempt in range(MAX_RETRIES):
        r = client.get(url, params={**params, "format": "json"})
        if r.status_code not in RETRY_STATUSES:
            r.raise_for_status()
            return r.json()
        wait = float(r.headers.get("Retry-After") or 0) or 2 ** attempt
        time.sleep(min(wait, 8))
    r.raise_for_status()
    return r.json()


def _commons_filename(image_url: str) -> str:
    """Last URL segment → Commons title.

    The URL carries a utm_* query string that must go before unquoting, or the
    lookup asks Commons for a file whose name ends in '?utm_source=...' and is
    told, accurately, that no such file exists.
    """
    return "File:" + unquote(image_url.rsplit("/", 1)[-1].split("?")[0])


def _attribution(client: httpx.Client, image_url: str) -> dict | None:
    """Artist and licence, or None if the photo cannot be published."""
    data = _get(client, COMMONS_API, {
        "action": "query", "titles": _commons_filename(image_url),
        "prop": "imageinfo", "iiprop": "extmetadata|url"})
    page = next(iter(data.get("query", {}).get("pages", {}).values()), {})
    info = (page.get("imageinfo") or [{}])[0]
    meta = info.get("extmetadata") or {}
    artist = _TAG.sub("", (meta.get("Artist") or {}).get("value", "")).strip()
    licence = (meta.get("LicenseShortName") or {}).get("value", "").strip()
    if not artist or not licence or _NON_FREE.search(licence):
        return None
    return {"credit": artist[:120], "license": licence,
            "license_url": (meta.get("LicenseUrl") or {}).get("value", ""),
            "page": info.get("descriptionurl", "")}


def _candidate(client: httpx.Client, title: str, lat: float, lng: float,
               target: str) -> tuple[float, str] | None:
    """Score one article. Returns (similarity, image_url) or None."""
    data = _get(client, WIKI_API, {
        "action": "query", "titles": title,
        "prop": "coordinates|pageimages", "piprop": "original|thumbnail",
        "pithumbsize": THUMB_PX})
    page = next(iter(data.get("query", {}).get("pages", {}).values()), {})

    coords = (page.get("coordinates") or [{}])[0]
    if not coords:
        return None                                   # not a place
    if km_between(lat, lng, coords["lat"], coords["lon"]) > MATCH_KM:
        return None                                   # a place, elsewhere
    similarity = difflib.SequenceMatcher(None, target, normalize(title)).ratio()
    if similarity < MIN_SIMILARITY:
        return None
    image = ((page.get("original") or {}).get("source")
             or (page.get("thumbnail") or {}).get("source"))
    return (similarity, image) if image else None


def _lookup_one(client: httpx.Client, name: str, place_name: str,
                lat: float, lng: float) -> dict | None:
    key = (normalize(name), f"{place_name}:{round(lat, 2)}:{round(lng, 2)}")
    cached, value = _cache_get(key)
    if cached:
        return value

    result = None
    try:
        best = None
        # Variants are tried in order and the first gated match wins, so a
        # plain landmark still costs a single search and only the awkward
        # phrasings pay for a second or third.
        for query in query_variants(name):
            target = normalize(query)
            found = _get(client, WIKI_API, {
                "action": "query", "list": "search",
                "srsearch": f"{query} {place_name}", "srlimit": SEARCH_CANDIDATES})
            for hit in found.get("query", {}).get("search", []):
                scored = _candidate(client, hit["title"], lat, lng, target)
                if scored and (best is None or scored[0] > best[0]):
                    best = (scored[0], scored[1], hit["title"])
            if best:
                break
        if best:
            attribution = _attribution(client, best[1])
            if attribution:
                result = {"name": name, "url": best[1], "source": "wikimedia",
                          "title": best[2], **attribution}
    except httpx.HTTPStatusError as e:
        if e.response.status_code in RETRY_STATUSES:
            # Still limited after backing off. Remember it briefly so the next
            # render does not immediately ask again and make it worse.
            print(f"[photos] rate limited on {name!r} — parking it for "
                  f"{RATE_LIMIT_TTL_S}s")
            _cache_put(key, None, RATE_LIMIT_TTL_S)
            return None
        print(f"[photos] wikimedia lookup failed for {name!r}: {e}")
        return None
    except Exception as e:  # noqa: BLE001 — a missing photo is not an error
        print(f"[photos] wikimedia lookup failed for {name!r}: "
              f"{type(e).__name__}: {e}")
        return None            # not cached: a transient outage should retry

    _cache_put(key, result)
    return result


def lookup(name: str, place_name: str, lat: float, lng: float) -> dict | None:
    """One item → a publishable photo, or None. Never raises."""
    with httpx.Client(timeout=TIMEOUT_S,
                      headers={"User-Agent": USER_AGENT}) as client:
        return _lookup_one(client, name, place_name, lat, lng)


def lookup_many(names: list[str], place_name: str, lat: float,
                lng: float) -> dict[str, dict | None]:
    """A whole guide's worth, concurrently. One client, shared."""
    if not names:
        return {}
    with httpx.Client(timeout=TIMEOUT_S,
                      headers={"User-Agent": USER_AGENT}) as client:
        with ThreadPoolExecutor(max_workers=min(MAX_PARALLEL, len(names))) as pool:
            results = pool.map(
                lambda n: _lookup_one(client, n, place_name, lat, lng), names)
            return dict(zip(names, results))
