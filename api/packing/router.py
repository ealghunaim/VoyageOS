"""Packing endpoints — generate a list, read it back, update items from the app."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from api.core.auth import current_user_id
from api.core.db import get_db
from api.packing import service

router = APIRouter(prefix="/v1/trips", tags=["packing"])
items_router = APIRouter(prefix="/v1/packing-items", tags=["packing"])


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


class ItemPatch(BaseModel):
    status: Literal["suggested", "accepted", "packed", "rejected"] | None = None
    qty: int | None = Field(default=None, ge=1, le=14)


@items_router.patch("/{item_id}")
def update_item(item_id: str, body: ItemPatch, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = db.table("packing_list_items").select("id,list_id").eq("id", item_id).execute().data
    if not rows:
        raise HTTPException(404, "Item not found")
    plist = db.table("packing_lists").select("trip_id").eq("id", rows[0]["list_id"]).execute().data
    _owned_trip(db, plist[0]["trip_id"], user_id)  # 404 if not the owner's

    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(422, "Nothing to update")
    return db.table("packing_list_items").update(changes).eq("id", item_id).execute().data[0]
