"""Trip journal — private travel log v1; sharing arrives with TestFlight."""
import base64
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from api.core.auth import current_user_id
from api.core.db import get_db
from api.core import photo_urls

router = APIRouter(prefix="/v1/trips", tags=["journal"])


class NotePhoto(BaseModel):
    b64: str = Field(max_length=4_000_000)
    mime: str = Field(default="image/jpeg", max_length=40)


class NoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    photos: list[NotePhoto] = Field(default_factory=list, max_length=2)


def _own(db, trip_id, user_id):
    if not db.table("trips").select("id").eq("id", trip_id).eq("owner_id", user_id).execute().data:
        raise HTTPException(404, "Trip not found")


@router.get("/{trip_id}/notes")
def list_notes(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _own(db, trip_id, user_id)
    rows = db.table("trip_notes").select("*").eq("trip_id", trip_id) \
        .order("created_at", desc=True).execute().data
    for r in rows:
        r["photos"] = photo_urls.sign(db, r.get("photos"))
    return rows


@router.post("/{trip_id}/notes", status_code=201)
def add_note(trip_id: str, body: NoteCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    _own(db, trip_id, user_id)
    keys = []
    for p in body.photos[:2]:
        try:
            raw = base64.b64decode(p.b64)
            ext = "png" if "png" in p.mime else "jpg"
            key = f"{user_id}/{trip_id}/{uuid.uuid4().hex}.{ext}"
            db.storage.from_("journal").upload(key, raw, {"content-type": p.mime})
            # the KEY is stored, not a URL — see api/core/photo_urls.py
            keys.append(key)
        except Exception as e:
            print(f"[journal] photo upload failed: {type(e).__name__}: {e}")
    return db.table("trip_notes").insert(
        {"trip_id": trip_id, "user_id": user_id, "body": body.body,
         "photos": keys}).execute().data[0]
