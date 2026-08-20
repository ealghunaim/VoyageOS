"""Photos for the guide, from two sources with two different honesty rules.

Dishes use Pexels: a stock photo is an honest answer to "what does this dish
look like", and the endpoint has always refused to do specific restaurants for
the same reason.

Places use Wikimedia and nothing else. A stock photo captioned with a named
landmark is a claim about a real place, so the source has to be able to say it
does not know — see api/photos/wikimedia.py. Play items go through the same
path as Visit, because 12 of 15 of them in real guide data turn out to name a
specific place ("The Avenues Mall", "teamLab Planets") rather than a generic
activity, and no reliable signal separates the two from the text alone.
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from pydantic import BaseModel, Field

from api.core.auth import current_user_id
from api.core.config import settings
from api.core.db import get_db
from api.photos import wikimedia
from api.core.trips import owned_trip_via_destination, PLAN, RECORD

router = APIRouter(prefix="/v1/photos", tags=["photos"])


@router.get("/dish")
def dish_photo(name: str, place: str = "", user_id: str = Depends(current_user_id)):
    if not settings.pexels_api_key:
        raise HTTPException(503, "Dish photos aren't configured yet.")
    query = f"{name.strip()} food dish".strip()
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get(
                "https://api.pexels.com/v1/search",
                params={"query": query, "per_page": 1, "orientation": "landscape"},
                headers={"Authorization": settings.pexels_api_key},
            )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"[photos] lookup failed for {name!r}: {type(e).__name__}: {e}")
        raise HTTPException(502, "Photo service is busy.")
    photos = data.get("photos") or []
    if not photos:
        return {"name": name, "url": None}
    src = photos[0].get("src") or {}
    return {
        "name": name,
        "url": src.get("medium") or src.get("large") or src.get("original"),
        "credit": photos[0].get("photographer"),
    }


class PlacePhotoRequest(BaseModel):
    #: Typed as a UUID so a malformed id is rejected as a bad request rather
    #: than reaching Postgres and surfacing as a 500.
    destination_id: UUID
    #: Visit and Play names together. Five of them are typically the same
    #: entity in both sections, so they are deduplicated before any lookup.
    names: list[str] = Field(default_factory=list, max_length=60)


@router.post("/places")
def place_photos(body: PlacePhotoRequest, user_id: str = Depends(current_user_id)):
    """Landmark photos for a destination's guide items.

    Coordinates come from the destination row, never from the client — the
    100km gate is the main defence against a same-named landmark on another
    continent, and a gate whose bounds the caller supplies is not a gate.

    A name with no publishable photo maps to null. That is a real answer, not
    a failure: roughly a third of items legitimately have none, and a
    placeholder would only invite a caption over the wrong picture.
    """
    db = get_db()
    dest, _trip = owned_trip_via_destination(
        db, str(body.destination_id), user_id, writing=True, scope=PLAN)

    if dest.get("lat") is None or dest.get("lng") is None:
        # Without coordinates the distance gate cannot run, and the remaining
        # gates are not enough on their own.
        print(f"[photos] {dest['place_name']!r} has no coordinates — no photos")
        return {n: None for n in body.names}

    seen: dict[str, str] = {}
    for name in body.names:
        seen.setdefault(wikimedia.normalize(name), name)

    found = wikimedia.lookup_many(list(seen.values()), dest["place_name"],
                                  dest["lat"], dest["lng"])
    resolved = {wikimedia.normalize(n): photo for n, photo in found.items()}
    return {n: resolved.get(wikimedia.normalize(n)) for n in body.names}
