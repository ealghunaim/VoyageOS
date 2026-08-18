"""Debrief + catalog search endpoints — the moat's public doors."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from api.core.auth import current_user_id
from api.core.db import get_db
from api.history.service import submit_debrief
from api.core.trips import owned_trip

router = APIRouter(prefix="/v1", tags=["history"])


class DebriefBody(BaseModel):
    forgot: list[str] = Field(default_factory=list, max_length=25)
    unused: list[str] = Field(default_factory=list, max_length=50)


@router.post("/trips/{trip_id}/debrief", status_code=201)
def debrief(trip_id: str, body: DebriefBody, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = [owned_trip(db, trip_id, user_id, writing=True)]
    return submit_debrief(db, rows[0], user_id, body.forgot, body.unused)


@router.get("/items/search")
def search_items(q: str, user_id: str = Depends(current_user_id)):
    if len(q.strip()) < 2:
        return []
    db = get_db()
    return db.table("items").select("id,name,category").is_("owner_id", "null") \
        .ilike("name", f"%{q.strip()}%").limit(8).execute().data
