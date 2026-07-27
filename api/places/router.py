"""Place autocomplete — proxies Open-Meteo's geocoder so the wizard offers
real places (exact names + coordinates stored at creation). Misspellings die
here, and the weather engine never needs to geocode later."""
import httpx
from fastapi import APIRouter, Depends
from api.core.auth import current_user_id

router = APIRouter(prefix="/v1/places", tags=["places"])
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


@router.get("/search")
def search(q: str, user_id: str = Depends(current_user_id)):
    if len(q.strip()) < 2:
        return []
    try:
        with httpx.Client(timeout=8) as c:
            r = c.get(GEOCODE_URL, params={"name": q.strip(), "count": 6, "language": "en"})
            r.raise_for_status()
            results = r.json().get("results") or []
    except Exception:
        return []
    return [{
        "name": res.get("name"),
        "admin": res.get("admin1"),
        "country_code": (res.get("country_code") or "").upper(),
        "lat": res.get("latitude"), "lng": res.get("longitude"),
    } for res in results]
