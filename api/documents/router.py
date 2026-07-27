"""Expiry-only document vault (v0.5). Fields only; files land with the security
foundation in the next phase — never half-ship Class C handling (Part 4 §1)."""
import uuid
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from api.core.auth import current_user_id
from api.core.db import get_db
from api.documents.expiry import evaluate

router = APIRouter(prefix="/v1/documents", tags=["documents"])

DocType = Literal["passport", "visa", "insurance", "vaccination", "ticket", "permit", "other"]


class DocCreate(BaseModel):
    type: DocType
    label: str = Field(min_length=1, max_length=60)
    expiry_date: date | None = None
    country_code: str | None = Field(default=None, max_length=2)


def _with_status(doc: dict) -> dict:
    if doc.get("expiry_date"):
        doc["expiry"] = evaluate(date.fromisoformat(doc["expiry_date"]), date.today())
    else:
        doc["expiry"] = {"level": "none", "message": "No expiry tracked.", "days_left": None}
    return doc


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
    }).execute().data[0]
    doc = _with_status(doc)

    # critical/expired + an upcoming trip → one governed document-class alert
    if doc["expiry"]["level"] in ("critical", "expired"):
        upcoming = db.table("trips").select("id").eq("owner_id", user_id) \
            .gte("start_date", date.today().isoformat()).limit(1).execute().data
        if upcoming:
            db.table("notification_schedule").insert({
                "user_id": user_id, "channel": "push", "class": "document",
                "topic": f"doc:{doc['id']}",
                "send_at": (datetime.now(timezone.utc) + timedelta(seconds=30)).isoformat(),
                "tz_name": "UTC",
                "payload": {"title": f"Check your {body.type}",
                            "body": doc["expiry"]["message"][:110]},
                "status": "pending",
                "idem_key": f"doc:{doc['id']}:{doc['expiry']['level']}:{uuid.uuid4().hex[:6]}",
            }).execute()
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    res = db.table("documents").delete().eq("id", doc_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Document not found")
