"""Timeline endpoints: lazy materialization + the reminder feed the phone mirrors."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from api.core.auth import current_user_id
from api.core.db import get_db
from api.timeline.materializer import materialize
from api.core.trips import owned_trip

router = APIRouter(prefix="/v1", tags=["timeline"])



@router.get("/trips/{trip_id}/timeline")
def get_timeline(trip_id: str, tz: str = "UTC", user_id: str = Depends(current_user_id)):
    db = get_db()
    trip = owned_trip(db, trip_id, user_id)
    created = materialize(db, trip, user_id, tz)  # lazy + idempotent
    tasks = db.table("tasks").select("*").eq("trip_id", trip_id).order("due_at").execute().data
    reminders = db.table("notification_schedule").select("id,send_at,payload,status,class") \
        .eq("trip_id", trip_id).eq("user_id", user_id).eq("status", "pending") \
        .order("send_at").execute().data
    return {"tasks": tasks, "reminders": reminders, "materialized_now": created}


class TaskPatch(BaseModel):
    status: Literal["done", "dismissed"]


@router.patch("/tasks/{task_id}")
def patch_task(task_id: str, body: TaskPatch, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = db.table("tasks").select("id,trip_id").eq("id", task_id).execute().data
    if not rows:
        raise HTTPException(404, "Task not found")
    owned_trip(db, rows[0]["trip_id"], user_id, writing=True)
    task = db.table("tasks").update({"status": body.status}).eq("id", task_id).execute().data[0]
    # done early → the pending reminder is cancelled, never "do the thing you did" (Part 3)
    db.table("notification_schedule").update({"status": "cancelled"}) \
        .eq("task_id", task_id).eq("status", "pending").execute()
    return task
