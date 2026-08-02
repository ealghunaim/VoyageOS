"""Document vault, phase A — what a renewal reminder needs, nothing more.

A document here is: what it is, which country it is for, when it expires, and
optional free text. Document numbers and photo scans are Class C data and are
deliberately absent; they arrive in phase B behind encryption and a private
bucket. Never half-ship Class C handling (Part 4 §1).
"""
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from api.core.auth import current_user_id
from api.core.db import get_db
from api.documents import reminders
from api.documents.expiry import evaluate

router = APIRouter(prefix="/v1/documents", tags=["documents"])

DocType = Literal["passport", "visa", "insurance", "vaccination",
                  "driving_license", "ticket", "permit", "other"]


class DocCreate(BaseModel):
    type: DocType
    # Optional: a visa is identified by its country, a passport by being your
    # passport. Requiring a label made people type "Passport" into a box.
    label: str | None = Field(default=None, max_length=60)
    expiry_date: date | None = None
    country_code: str | None = Field(default=None, max_length=2)
    notes: str | None = Field(default=None, max_length=500)
    #: IANA zone from the device, so a reminder lands at 09:00 where the
    #: traveller is. No timezone is stored per user anywhere, so the client
    #: sends it exactly as getTimeline already does.
    tz: str = "UTC"


class DocPatch(BaseModel):
    type: DocType | None = None
    label: str | None = Field(default=None, max_length=60)
    expiry_date: date | None = None
    country_code: str | None = Field(default=None, max_length=2)
    notes: str | None = Field(default=None, max_length=500)
    tz: str = "UTC"


def _with_status(doc: dict) -> dict:
    if doc.get("expiry_date"):
        doc["expiry"] = evaluate(date.fromisoformat(doc["expiry_date"]), date.today())
    else:
        doc["expiry"] = {"level": "none", "message": "No expiry tracked.", "days_left": None}
    return doc


def _owned(db, doc_id: str, user_id: str) -> dict:
    rows = db.table("documents").select("*").eq("id", doc_id) \
        .eq("user_id", user_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Document not found")
    return rows[0]


@router.get("")
def list_documents(user_id: str = Depends(current_user_id)):
    db = get_db()
    docs = db.table("documents").select("*").eq("user_id", user_id) \
        .order("created_at").execute().data
    return [_with_status(d) for d in docs]


@router.post("", status_code=201)
def create_document(body: DocCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    doc = db.table("documents").insert({
        "user_id": user_id, "type": body.type, "label": body.label,
        "expiry_date": body.expiry_date.isoformat() if body.expiry_date else None,
        "country_code": body.country_code.upper() if body.country_code else None,
        "notes": body.notes,
    }).execute().data[0]

    # Scheduled unconditionally. This used to fire only when the traveller had
    # a trip already booked, which is backwards: a passport quietly expiring is
    # exactly the thing you need to hear about *before* you plan anything.
    doc["reminders"] = reminders.reschedule(db, doc, user_id, body.tz)
    return _with_status(doc)


@router.patch("/{doc_id}")
def update_document(doc_id: str, body: DocPatch, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned(db, doc_id, user_id)

    fields = body.model_dump(exclude_unset=True, exclude={"tz"})
    if "expiry_date" in fields:
        fields["expiry_date"] = body.expiry_date.isoformat() if body.expiry_date else None
    if fields.get("country_code"):
        fields["country_code"] = fields["country_code"].upper()
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    doc = db.table("documents").update(fields).eq("id", doc_id) \
        .eq("user_id", user_id).execute().data[0]

    # Type, expiry and country all change what should be scheduled, so rebuild
    # rather than trying to work out which edits matter.
    doc["reminders"] = reminders.reschedule(db, doc, user_id, body.tz)
    return _with_status(doc)


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned(db, doc_id, user_id)
    # Before the row goes: an orphaned pending reminder would push about a
    # document the traveller has already deleted.
    reminders.cancel(db, doc_id)
    db.table("documents").delete().eq("id", doc_id).eq("user_id", user_id).execute()
