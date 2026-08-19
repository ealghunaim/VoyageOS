"""Gear profiles (F2.2 basic) — reusable kits that merge into any trip's list."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from api.core.auth import current_user_id
from api.core.db import get_db
from api.core.trips import owned_trip
from api.packing.limits import MAX_QTY, MIN_QTY

router = APIRouter(prefix="/v1/gear-profiles", tags=["gear"])


class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    trip_type: str | None = None


class ItemAdd(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    qty: int = Field(default=1, ge=MIN_QTY, le=MAX_QTY)


def _owned(db, profile_id: str, user_id: str) -> dict:
    rows = db.table("gear_profiles").select("*").eq("id", profile_id) \
        .eq("user_id", user_id).execute().data
    if not rows:
        raise HTTPException(404, "Kit not found")
    return rows[0]


def _resolve_item(db, user_id: str, name: str) -> dict:
    """Catalog match first; else a user-owned item is born (the catalog grows from use)."""
    n = name.strip()
    rows = db.table("items").select("id,name,category").ilike("name", n).limit(1).execute().data
    if rows:
        return rows[0]
    return db.table("items").insert(
        {"owner_id": user_id, "name": n[:60], "category": "misc"}).execute().data[0]


@router.get("")
def list_profiles(user_id: str = Depends(current_user_id)):
    db = get_db()
    profiles = db.table("gear_profiles").select("id,name,trip_type") \
        .eq("user_id", user_id).order("created_at").execute().data
    for p in profiles:
        p["item_count"] = len(db.table("gear_profile_items").select("item_id")
                              .eq("profile_id", p["id"]).execute().data)
    return profiles


@router.post("", status_code=201)
def create_profile(body: ProfileCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    return db.table("gear_profiles").insert(
        {"user_id": user_id, **body.model_dump()}).execute().data[0]


@router.get("/{profile_id}")
def get_profile(profile_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    p = _owned(db, profile_id, user_id)
    items = db.table("gear_profile_items").select("qty,items(id,name,category)") \
        .eq("profile_id", profile_id).execute().data
    p["items"] = [{"item_id": r["items"]["id"], "name": r["items"]["name"],
                   "category": r["items"]["category"], "qty": r["qty"]}
                  for r in items if r.get("items")]
    return p


@router.post("/{profile_id}/items", status_code=201)
def add_item(profile_id: str, body: ItemAdd, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned(db, profile_id, user_id)
    item = _resolve_item(db, user_id, body.name)
    db.table("gear_profile_items").upsert(
        {"profile_id": profile_id, "item_id": item["id"], "qty": body.qty}).execute()
    return {"item_id": item["id"], "name": item["name"], "qty": body.qty}


@router.delete("/{profile_id}/items/{item_id}", status_code=204)
def remove_item(profile_id: str, item_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned(db, profile_id, user_id)
    db.table("gear_profile_items").delete().eq("profile_id", profile_id) \
        .eq("item_id", item_id).execute()


@router.post("/{profile_id}/apply/{trip_id}", status_code=201)
def apply_to_trip(profile_id: str, trip_id: str, user_id: str = Depends(current_user_id)):
    """Merge the kit into the trip's list — dedupe by name, precedence to what exists."""
    db = get_db()
    p = _owned(db, profile_id, user_id)
    owned_trip(db, trip_id, user_id, writing=True)

    lists = db.table("packing_lists").select("id").eq("trip_id", trip_id) \
        .order("generated_at", desc=True).limit(1).execute().data
    if lists:
        list_id = lists[0]["id"]
    else:
        list_id = db.table("packing_lists").insert({"trip_id": trip_id}).execute().data[0]["id"]

    existing = {r["name"].lower() for r in
                db.table("packing_list_items").select("name").eq("list_id", list_id).execute().data}
    kit = db.table("gear_profile_items").select("qty,items(id,name,category)") \
        .eq("profile_id", profile_id).execute().data

    rows, skipped = [], 0
    for r in kit:
        it = r.get("items")
        if not it:
            continue
        if it["name"].lower() in existing:
            skipped += 1
            continue
        rows.append({"list_id": list_id, "item_id": it["id"], "name": it["name"],
                     "category": it["category"], "qty": r["qty"], "status": "accepted",
                     "source": "profile", "reason": f"From your {p['name']} kit",
                     "confidence": 1.0, "sort": 999})
    if rows:
        db.table("packing_list_items").insert(rows).execute()
    return {"added": len(rows), "already_there": skipped, "kit": p["name"]}
