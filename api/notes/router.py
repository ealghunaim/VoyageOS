"""Trip journal — private travel log v1; sharing arrives with TestFlight."""
import base64
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from api.core.auth import current_user_id
from api.core.db import get_db
from api.core import photo_urls
from api.core.trips import owned_trip, PLAN, RECORD

router = APIRouter(prefix="/v1/trips", tags=["journal"])
#: The cross-trip hub. Separate prefix, same tag — it is the same
#: feature read from the other end.
hub_router = APIRouter(prefix="/v1/notes", tags=["journal"])


class NotePhoto(BaseModel):
    b64: str = Field(max_length=4_000_000)
    mime: str = Field(default="image/jpeg", max_length=40)


class NoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    photos: list[NotePhoto] = Field(default_factory=list, max_length=2)
    # The day the entry is ABOUT, which is not always the day it was typed —
    # see 0029. Omitted means "today", the column default.
    entry_date: date | None = None


class NotePatch(BaseModel):
    entry_date: date | None = None


def entry_date_for(trip: dict, requested):
    """Which day an entry belongs to, clamped to the trip.

    A date picker with no bounds lets a stray scroll file a Kyoto entry under
    1998, and the trip it belongs to is the one piece of context that makes
    that recoverable. Clamping rather than rejecting: the traveller's intent is
    obvious at either edge, and an error message for an off-by-one scroll would
    be pedantry.

    Absent means today, and today is itself clamped — writing up a trip two
    weeks after getting home should file under the last day of the trip, not
    invent a day the traveller was not there.
    """
    start, end = trip.get("start_date"), trip.get("end_date")
    d = requested or date.today()
    if isinstance(d, str):
        d = date.fromisoformat(d)
    if start and d < date.fromisoformat(str(start)):
        return str(start)
    if end and d > date.fromisoformat(str(end)):
        return str(end)
    return str(d)



@hub_router.get("")
def list_all_notes(user_id: str = Depends(current_user_id)):
    """Every entry this person has written, across every trip.

    A READ VIEW over data 2d already shaped. entry_date exists, is backfilled
    and is what "when did this happen" means — created_at only breaks ties
    within a day, which is the right tiebreak and the wrong sort key.

    Grouped by trip on the client rather than here: the server returns a flat,
    ordered list plus the trip fields needed to group it, because the grouping
    is a presentation choice and a second endpoint shape would freeze it.

    Trips are joined for title, country and locked_at — locked_at so a closed
    trip's entries can carry the glyph. The entries stay WRITABLE: journal is
    RECORD scope, and the glyph says "this trip is closed", not "this entry is
    frozen".
    """
    db = get_db()
    rows = db.table("trip_notes") \
        .select("*, trips(id,title,locked_at)") \
        .eq("user_id", user_id) \
        .order("entry_date", desc=True).order("created_at", desc=True) \
        .limit(500).execute().data

    # country_code is NOT a column on trips — it is enriched from the trip's
    # first destination, exactly as list_trips does. The client's Trip type
    # carries the field, which is what made it look like one; selecting it
    # directly returned 42703. Same derivation here so a flag on the hub
    # matches the flag on the trip card.
    trip_ids = {(r.get("trips") or {}).get("id") for r in rows} - {None}
    country: dict[str, str] = {}
    if trip_ids:
        for d in (db.table("destinations").select("trip_id,country_code,seq")
                  .in_("trip_id", list(trip_ids)).order("seq").execute().data):
            country.setdefault(d["trip_id"], d.get("country_code"))
    for r in rows:
        t = r.get("trips") or {}
        if t:
            t["country_code"] = country.get(t.get("id"))
        r["photos"] = photo_urls.sign(db, r.get("photos"))
    return rows


@router.get("/{trip_id}/notes")
def list_notes(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    owned_trip(db, trip_id, user_id)
    # By the day written about, newest first — created_at only breaks ties
    # between entries filed on the same day, where it is the right tiebreak.
    rows = db.table("trip_notes").select("*").eq("trip_id", trip_id) \
        .order("entry_date", desc=True).order("created_at", desc=True).execute().data
    for r in rows:
        r["photos"] = photo_urls.sign(db, r.get("photos"))
    return rows


@router.post("/{trip_id}/notes", status_code=201)
def add_note(trip_id: str, body: NoteCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    trip = owned_trip(db, trip_id, user_id, writing=True, scope=RECORD)
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
         "entry_date": entry_date_for(trip, body.entry_date),
         "photos": keys}).execute().data[0]


@router.patch("/{trip_id}/notes/{note_id}")
def patch_note(trip_id: str, note_id: str, body: NotePatch,
               user_id: str = Depends(current_user_id)):
    """Re-file an entry under a different day.

    Only the date. Editing the words of a journal entry is a different feature
    with a different question behind it — whether a log you can rewrite is
    still a log — and this endpoint should not quietly decide it.
    """
    db = get_db()
    trip = owned_trip(db, trip_id, user_id, writing=True, scope=RECORD)
    if body.entry_date is None:
        raise HTTPException(400, "Nothing to update")
    rows = db.table("trip_notes") \
        .update({"entry_date": entry_date_for(trip, body.entry_date)}) \
        .eq("id", note_id).eq("trip_id", trip_id).eq("user_id", user_id).execute().data
    if not rows:
        raise HTTPException(404, "Entry not found")
    rows[0]["photos"] = photo_urls.sign(db, rows[0].get("photos"))
    return rows[0]
