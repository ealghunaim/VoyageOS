"""Notification endpoints: the demo pipe-prover and a status read for the smoke test."""
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db

router = APIRouter(prefix="/v1/notifications", tags=["notifications"])


@router.post("/demo", status_code=201)
def demo(user_id: str = Depends(current_user_id)):
    """Schedules a real row 5s out. The worker governs it within the minute."""
    db = get_db()
    row = db.table("notification_schedule").insert({
        "user_id": user_id,
        "send_at": (datetime.now(timezone.utc) + timedelta(seconds=5)).isoformat(),
        "tz_name": "UTC", "channel": "push", "class": "task",
        "topic": f"demo:{uuid.uuid4().hex[:6]}",
        "payload": {"title": "VoyageOS is live",
                    "body": "Governed before delivery — cap, quiet hours, cooldown all checked."},
        "status": "pending", "idem_key": f"demo:{uuid.uuid4().hex}",
    }).execute().data[0]
    return {"id": row["id"], "note": "worker will process this within ~60s"}


@router.get("/{schedule_id}")
def status(schedule_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = db.table("notification_schedule").select("*") \
        .eq("id", schedule_id).eq("user_id", user_id).execute().data
    if not rows:
        raise HTTPException(404, "Not found")
    log = db.table("notification_log").select("event,at") \
        .eq("schedule_id", schedule_id).execute().data
    return {"schedule": rows[0], "log": log}
