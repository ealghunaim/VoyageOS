"""Packing endpoints — generate a list, read it back, update items from the app."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from api.core.auth import current_user_id
from api.core.db import get_db
from api.packing import service
from api.packing.weight import sum_weight

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
    qty: int | None = Field(default=None, ge=1, le=99)
    style_tag: str | None = Field(default=None, max_length=16)


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


PRESET_LIMITS_G = {"7kg": 7000, "10kg": 10000, "23kg": 23000}


class BagBody(BaseModel):
    limit_g: int | None = Field(default=None, ge=1000, le=40000)


def _main_bag(db, trip_id: str) -> dict | None:
    rows = db.table("bags").select("*").eq("trip_id", trip_id).limit(1).execute().data
    return rows[0] if rows else None


@router.put("/{trip_id}/bag")
def set_bag(trip_id: str, body: BagBody, user_id: str = Depends(current_user_id)):
    """Generic mode (v0.5): a user-picked target, plainly labeled — not an airline rule."""
    db = get_db()
    _owned_trip(db, trip_id, user_id)
    bag = _main_bag(db, trip_id)
    if bag:
        return db.table("bags").update({"target_limit_g": body.limit_g})             .eq("id", bag["id"]).execute().data[0]
    return db.table("bags").insert({"trip_id": trip_id, "name": "Main bag",
                                    "kind": "carryon",
                                    "target_limit_g": body.limit_g}).execute().data[0]


@router.get("/{trip_id}/weight")
def get_weight(trip_id: str, user_id: str = Depends(current_user_id)):
    """Deterministic sum — no model within a kilometer of this number (law 2)."""
    db = get_db()
    _owned_trip(db, trip_id, user_id)
    plist = service._latest_list(db, trip_id)
    if not plist:
        return {"total_g": 0, "counted": 0, "unweighed": 0, "limit_g": None}
    rows = db.table("packing_list_items")         .select("qty,status,category,style_tag,items(default_weight_g)")         .eq("list_id", plist["id"]).execute().data
    total, counted, unweighed = sum_weight(rows)
    # cumulative approximation: unlinked items get honest per-type estimates
    EST = {"underwear": 80, "sleep": 150, "casual": 200, "smart_casual": 250,
           "formal": 400, "traditional": 350, "outerwear": 600, "athleisure": 220,
           "footwear": 800, "toiletries": 120, "electronics": 250, "documents": 50,
           "medications": 100, "activity_gear": 400, "misc": 150, "clothing": 220}
    approx = False
    for row in rows:
        if row.get("status") == "rejected":
            continue
        linked = (row.get("items") or {}).get("default_weight_g") if row.get("items") else None
        if not linked:
            grams = EST.get(row.get("style_tag") or "", 0) or EST.get(row.get("category") or "", 150)
            total += grams * (row.get("qty") or 1)
            approx = True
    bag = _main_bag(db, trip_id)
    return {"total_g": total, "counted": counted, "unweighed": unweighed, "approx": approx,
            "limit_g": bag["target_limit_g"] if bag else None}
