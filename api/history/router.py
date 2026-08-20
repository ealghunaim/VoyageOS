"""Debrief + catalog search endpoints — the moat's public doors."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from api.core.auth import current_user_id
from api.core.db import get_db
from api.history.service import submit_debrief
from api.core.trips import owned_trip, PLAN, RECORD

router = APIRouter(prefix="/v1", tags=["history"])


class DebriefBody(BaseModel):
    forgot: list[str] = Field(default_factory=list, max_length=25)
    unused: list[str] = Field(default_factory=list, max_length=50)
    #: Set after the traveller answers the "this trip hasn't ended" prompt.
    #: Absent on the first attempt, which is what makes the prompt appear.
    confirm_early: bool = False


def _ends_in_future(trip: dict, today: date | None = None) -> int:
    """Days remaining, or 0 if the trip has ended. Compared as calendar days."""
    end = trip.get("end_date")
    if not end:
        return 0
    try:
        remaining = (date.fromisoformat(str(end)) - (today or date.today())).days
    except ValueError:
        return 0
    return max(0, remaining)


@router.post("/trips/{trip_id}/debrief", status_code=201)
def debrief(trip_id: str, body: DebriefBody, user_id: str = Depends(current_user_id)):
    """Close out a trip.

    ASKS BEFORE CLOSING A TRIP THAT HAS NOT ENDED, rather than refusing. A trip
    cut short is a real thing and debriefing it early is the right call; what
    was wrong before was doing it SILENTLY. Submitting on a future-dated trip
    used to set status='completed' with no signal, and since a completed status
    outranks the calendar on the client, the trip simply vanished from Upcoming.

    409 rather than 400: the request is well-formed and will succeed unchanged
    once confirm_early is set. The body carries the day count so the client can
    say how early without computing it and risking a different answer.
    """
    db = get_db()
    trip = owned_trip(db, trip_id, user_id, writing=True, scope=RECORD)

    remaining = _ends_in_future(trip)
    if remaining and not body.confirm_early:
        raise HTTPException(409, {
            "code": "trip_not_ended",
            "days_remaining": remaining,
            "end_date": str(trip.get("end_date")),
            "message": (f"This trip doesn't end for {remaining} more "
                        f"{'day' if remaining == 1 else 'days'}. Close it out anyway?"),
        })

    return submit_debrief(db, trip, user_id, body.forgot, body.unused)


@router.get("/items/search")
def search_items(q: str, user_id: str = Depends(current_user_id)):
    if len(q.strip()) < 2:
        return []
    db = get_db()
    return db.table("items").select("id,name,category").is_("owner_id", "null") \
        .ilike("name", f"%{q.strip()}%").limit(8).execute().data
