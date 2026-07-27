"""Trip journal — private travel log v1; sharing arrives with TestFlight."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from api.core.auth import current_user_id
from api.core.db import get_db

router = APIRouter(prefix="/v1/trips", tags=["journal"])


class NoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


def _own(db, trip_id, user_id):
    if not db.table("trips").select("id").eq("id", trip_id).eq("owner_id", user_id).execute().data:
        raise HTTPException(404, "Trip not found")


@router.get("/{trip_id}/notes")
def list_notes(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _own(db, trip_id, user_id)
    return db.table("trip_notes").select("*").eq("trip_id", trip_id) \
        .order("created_at", desc=True).execute().data


@router.post("/{trip_id}/notes", status_code=201)
def add_note(trip_id: str, body: NoteCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    _own(db, trip_id, user_id)
    return db.table("trip_notes").insert(
        {"trip_id": trip_id, "user_id": user_id, "body": body.body}).execute().data[0]
