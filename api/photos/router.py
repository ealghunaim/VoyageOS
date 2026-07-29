"""Dish photos — server-side Pexels lookup, key stays in the environment.
Returns one image URL for a dish name. Generic dish photo (honest for 'what
this dish looks like'); never used for a specific restaurant."""
import httpx
from fastapi import APIRouter, Depends, HTTPException

from api.core.auth import current_user_id
from api.core.config import settings

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
