"""Daily planner — day-by-day itinerary items for a trip.
Forward-looking (what to do each day), distinct from the journal log."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.core.auth import current_user_id
from api.core.db import get_db

router = APIRouter(prefix="/v1/trips", tags=["planner"])


class PlanItemCreate(BaseModel):
    day: int = Field(default=1, ge=1, le=366)
    time: str | None = Field(default=None, max_length=20)
    title: str = Field(min_length=1, max_length=140)
    note: str | None = Field(default=None, max_length=500)
    seq: int = 0


class PlanItemPatch(BaseModel):
    day: int | None = Field(default=None, ge=1, le=366)
    time: str | None = Field(default=None, max_length=20)
    title: str | None = Field(default=None, min_length=1, max_length=140)
    note: str | None = Field(default=None, max_length=500)
    done: bool | None = None
    seq: int | None = None


def _own(db, trip_id, user_id):
    if not db.table("trips").select("id").eq("id", trip_id).eq("owner_id", user_id).execute().data:
        raise HTTPException(404, "Trip not found")


@router.get("/{trip_id}/plan")
def list_plan(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _own(db, trip_id, user_id)
    return db.table("trip_plan_items").select("*").eq("trip_id", trip_id) \
        .order("day").order("seq").order("created_at").execute().data


@router.post("/{trip_id}/plan", status_code=201)
def add_plan_item(trip_id: str, body: PlanItemCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    _own(db, trip_id, user_id)
    row = {"trip_id": trip_id, "day": body.day, "time": (body.time or None),
           "title": body.title.strip()[:140], "note": (body.note or None), "seq": body.seq}
    return db.table("trip_plan_items").insert(row).execute().data[0]


@router.patch("/{trip_id}/plan/{item_id}")
def patch_plan_item(trip_id: str, item_id: str, body: PlanItemPatch,
                    user_id: str = Depends(current_user_id)):
    db = get_db()
    _own(db, trip_id, user_id)
    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(400, "Nothing to update")
    if "title" in patch:
        patch["title"] = patch["title"].strip()[:140]
    rows = db.table("trip_plan_items").update(patch) \
        .eq("id", item_id).eq("trip_id", trip_id).execute().data
    if not rows:
        raise HTTPException(404, "Item not found")
    return rows[0]


@router.delete("/{trip_id}/plan/{item_id}", status_code=204)
def delete_plan_item(trip_id: str, item_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _own(db, trip_id, user_id)
    db.table("trip_plan_items").delete().eq("id", item_id).eq("trip_id", trip_id).execute()
    return None
