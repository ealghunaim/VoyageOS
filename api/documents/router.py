"""Document vault.

Phase A stored what a renewal reminder needs: type, country, expiry, notes.
Phase B adds the Class C data — the document number and a photo — behind
envelope encryption (api/core/crypto.py) and a private bucket.

Two rules shape every endpoint here:

  Ciphertext never leaves the server. There is no reason for a client to hold
  an encrypted passport number, and returning it would make every list
  response a copy of the vault. Lists carry number_last4 and nothing more.

  The full number needs a deliberate request. Rendering a list must not
  decrypt every row — more key use, more exposure, and slower for no gain.
"""
import base64
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from typing import Literal
from api.core import crypto
from api.core.auth import current_user_id
from api.core.db import get_db
from api.documents import photos, reminders
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
    #: The document number. Encrypted before it touches the database and never
    #: returned by a list — only by an explicit reveal.
    number: str | None = Field(default=None, max_length=64)
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
    number: str | None = Field(default=None, max_length=64)
    tz: str = "UTC"


def _public(doc: dict) -> dict:
    """What a client is allowed to see.

    number_encrypted never leaves the server — there is no reason for a client
    to hold ciphertext, and shipping it turns every list response into a copy
    of the vault. number_last4 is what a list renders; the full number needs a
    deliberate request.
    """
    doc.pop("number_encrypted", None)
    # Dropped by migration 0022, but popped rather than assumed absent: this
    # code deploys before the column goes, and for that window the row still
    # carries it. It was never read by anything, here or in the app.
    doc.pop("key_version", None)
    doc["has_number"] = bool(doc.pop("_has_number", False))
    doc["has_photo"] = bool(doc.get("file_key"))
    doc.pop("file_key", None)
    return doc


def _with_status(doc: dict) -> dict:
    if doc.get("expiry_date"):
        doc["expiry"] = evaluate(date.fromisoformat(doc["expiry_date"]), date.today())
    else:
        doc["expiry"] = {"level": "none", "message": "No expiry tracked.", "days_left": None}
    return doc


def _seal_number(db, user_id: str, number: str) -> dict:
    """Encrypt a number into the columns that store it.

    No key version is recorded here. Which master key wraps a DEK is a fact
    about the DEK, and user_keys.key_version is where it lives; a copy on every
    document could only ever drift out of step with it — and did, the moment
    the master key was rotated. See migration 0022.
    """
    uk = crypto.get_or_create_user_key(db, user_id)
    return {
        "number_encrypted": crypto._encode(
            crypto.encrypt_field(uk.dek, user_id, "number", number)),
        "number_last4": crypto.last4(number),
    }


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
    for d in docs:
        d["_has_number"] = bool(d.get("number_encrypted"))
    return [_public(_with_status(d)) for d in docs]


@router.post("", status_code=201)
def create_document(body: DocCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    row = {
        "user_id": user_id, "type": body.type, "label": body.label,
        "expiry_date": body.expiry_date.isoformat() if body.expiry_date else None,
        "country_code": body.country_code.upper() if body.country_code else None,
        "notes": body.notes,
    }
    if body.number and body.number.strip():
        row.update(_seal_number(db, user_id, body.number.strip()))
    doc = db.table("documents").insert(row).execute().data[0]

    # Scheduled unconditionally. This used to fire only when the traveller had
    # a trip already booked, which is backwards: a passport quietly expiring is
    # exactly the thing you need to hear about *before* you plan anything.
    doc["_has_number"] = bool(doc.get("number_encrypted"))
    doc["reminders"] = reminders.reschedule(db, doc, user_id, body.tz)
    return _public(_with_status(doc))


@router.patch("/{doc_id}")
def update_document(doc_id: str, body: DocPatch, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned(db, doc_id, user_id)

    fields = body.model_dump(exclude_unset=True, exclude={"tz", "number"})
    if "number" in body.model_fields_set:
        num = (body.number or "").strip()
        # Clearing the number clears the ciphertext too, rather than leaving an
        # unreferenced blob behind.
        fields.update(_seal_number(db, user_id, num) if num
                      else {"number_encrypted": None, "number_last4": None})
    if "expiry_date" in fields:
        fields["expiry_date"] = body.expiry_date.isoformat() if body.expiry_date else None
    if fields.get("country_code"):
        fields["country_code"] = fields["country_code"].upper()
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    doc = db.table("documents").update(fields).eq("id", doc_id) \
        .eq("user_id", user_id).execute().data[0]

    # Type, expiry and country all change what should be scheduled, so rebuild
    # rather than trying to work out which edits matter.
    doc["_has_number"] = bool(doc.get("number_encrypted"))
    doc["reminders"] = reminders.reschedule(db, doc, user_id, body.tz)
    return _public(_with_status(doc))


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned(db, doc_id, user_id)
    # Before the row goes: an orphaned pending reminder would push about a
    # document the traveller has already deleted.
    doc = _owned(db, doc_id, user_id)
    reminders.cancel(db, doc_id)
    if doc.get("file_key"):
        photos.remove(db, doc["file_key"])
    db.table("documents").delete().eq("id", doc_id).eq("user_id", user_id).execute()


@router.get("/{doc_id}/number")
def reveal_number(doc_id: str, user_id: str = Depends(current_user_id)):
    """The full number, decrypted, on an explicit request.

    Separate from the list on purpose: a list renders last4, and decrypting
    every row to draw a screen would mean more key use and more exposure for
    something nobody is reading.
    """
    db = get_db()
    doc = _owned(db, doc_id, user_id)
    if not doc.get("number_encrypted"):
        raise HTTPException(404, "No number stored for this document.")
    uk = crypto.get_or_create_user_key(db, user_id)
    try:
        number = crypto.decrypt_field(uk.dek, user_id, "number", doc["number_encrypted"])
    except crypto.DecryptionFailed:
        # Either the master key changed without a re-wrap, or the row was
        # tampered with. Both are the operator's problem, not the traveller's.
        print(f"[documents] could not decrypt number for {doc_id}")
        raise HTTPException(500, "This number could not be decrypted — contact support.")
    return {"id": doc_id, "number": number}


class PhotoUpload(BaseModel):
    b64: str
    mime: str = "image/jpeg"


@router.post("/{doc_id}/photo", status_code=201)
def upload_photo(doc_id: str, body: PhotoUpload, user_id: str = Depends(current_user_id)):
    """Encrypt, then store in the private bucket. One photo per document."""
    db = get_db()
    doc = _owned(db, doc_id, user_id)
    try:
        raw = base64.b64decode(body.b64)
    except Exception:
        raise HTTPException(400, "Photo is not valid base64.")
    if not raw:
        raise HTTPException(400, "Photo is empty.")
    uk = crypto.get_or_create_user_key(db, user_id)
    try:
        key = photos.upload(db, user_id, doc_id, raw, uk.dek)
    except ValueError as e:
        raise HTTPException(413, str(e))
    if doc.get("file_key"):
        photos.remove(db, doc["file_key"])      # replace, never accumulate
    db.table("documents").update({
        "file_key": key,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", doc_id).eq("user_id", user_id).execute()
    return {"id": doc_id, "has_photo": True, "bytes": len(raw)}


@router.get("/{doc_id}/photo")
def get_photo(doc_id: str, user_id: str = Depends(current_user_id)):
    """Decrypted bytes over an authenticated request — never a URL.

    The client is given the image itself, not a link to it. A link, however
    short-lived, is a credential that can be forwarded, logged by a proxy, or
    left in a history; the bytes cannot.
    """
    db = get_db()
    doc = _owned(db, doc_id, user_id)
    if not doc.get("file_key"):
        raise HTTPException(404, "No photo stored for this document.")
    uk = crypto.get_or_create_user_key(db, user_id)
    try:
        raw = photos.fetch(db, user_id, doc_id, doc["file_key"], uk.dek)
    except crypto.DecryptionFailed:
        print(f"[documents] could not decrypt photo for {doc_id}")
        raise HTTPException(500, "This photo could not be decrypted — contact support.")
    except Exception as e:  # noqa: BLE001
        print(f"[documents] photo fetch failed for {doc_id}: {type(e).__name__}: {e}")
        raise HTTPException(502, "Could not retrieve that photo.")
    return Response(content=raw, media_type="image/jpeg",
                    headers={"Cache-Control": "no-store"})


@router.delete("/{doc_id}/photo", status_code=204)
def delete_photo(doc_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    doc = _owned(db, doc_id, user_id)
    if doc.get("file_key"):
        photos.remove(db, doc["file_key"])
    db.table("documents").update({"file_key": None}).eq("id", doc_id) \
        .eq("user_id", user_id).execute()
