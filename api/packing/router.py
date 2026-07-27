"""Packing endpoints — generate a list, read it back."""
from fastapi import APIRouter, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db
from api.packing import service

router = APIRouter(prefix="/v1/trips", tags=["packing"])


def _owned_trip(db, trip_id: str, user_id: str) -> dict:
    rows = db.table("trips").select("*").eq("id", trip_id).eq("owner_id", user_id).execute().data
    if not rows:
        raise HTTPException(404, "Trip not found")
    return rows[0]


@router.post("/{trip_id}/packing-lists/generate", status_code=201)
def generate_list(trip_id: str, regenerate: bool = False,
                  user_id: str = Depends(current_user_id)):
    db = get_db()
    trip = _owned_trip(db, trip_id, user_id)
    return service.generate(db, trip, user_id, regenerate=regenerate)


@router.get("/{trip_id}/packing-list")
def get_list(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned_trip(db, trip_id, user_id)
    plist = service._latest_list(db, trip_id)
    if not plist:
        raise HTTPException(404, "No packing list yet — generate one first")
    items = db.table("packing_list_items").select("*") \
        .eq("list_id", plist["id"]).order("sort").execute().data
    return {"list": plist, "items": items}
