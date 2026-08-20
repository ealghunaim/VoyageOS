from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db
from api.guide.service import get_guide, get_guide_part, locate_part_safely
from api.guide.family import generate_family_play
from api.guide.phrases import generate_phrases
from api.core.trips import owned_trip

router = APIRouter(prefix="/v1/trips", tags=["guide"])


@router.get("/{trip_id}/guide")
def guide(trip_id: str, regenerate: bool = False, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = [owned_trip(db, trip_id, user_id)]
    return get_guide(db, rows[0], user_id, regenerate=regenerate)


@router.get("/{trip_id}/guide/part/{phase}")
def guide_part(trip_id: str, phase: str, background: BackgroundTasks,
               destination_id: str | None = None,
               regenerate: bool = False, user_id: str = Depends(current_user_id)):
    db = get_db()
    trip = owned_trip(db, trip_id, user_id)
    out = get_guide_part(db, trip, user_id, phase,
                         destination_id=destination_id, regenerate=regenerate)

    # Coordinates are filled in AFTER this response. Nominatim allows one
    # request a second, so locating a guide's places takes about as long as
    # generating it did; doing that inline would double a wait the traveller is
    # already watching.
    #
    # Scheduled on cached reads too, not just fresh generations. The task is
    # idempotent and returns immediately when there is nothing pending, so this
    # is what makes a half-finished run resume — and what lets a guide written
    # before this feature existed acquire coordinates the next time it is
    # opened, rather than staying blank forever.
    dest = _destination_for(db, trip_id, destination_id)
    background.add_task(locate_part_safely, db, trip_id,
                        dest.get("id"), phase,
                        dest.get("place_name") or trip.get("title") or "",
                        dest.get("country_code"))
    return out


def _destination_for(db, trip_id: str, destination_id: str | None) -> dict:
    """The stop this guide part belongs to. Mirrors the resolution in
    get_guide_part: an explicit id, else the first by seq."""
    q = db.table("destinations").select("id,place_name,country_code").eq("trip_id", trip_id)
    rows = (q.eq("id", destination_id) if destination_id else q.order("seq").limit(1)).execute().data
    return rows[0] if rows else {}


@router.get("/{trip_id}/family-play")
def family_play(trip_id: str, regenerate: bool = False, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = [owned_trip(db, trip_id, user_id)]
    return generate_family_play(db, rows[0], user_id, regenerate=regenerate)


@router.get("/{trip_id}/phrases")
def phrases(trip_id: str, regenerate: bool = False, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = [owned_trip(db, trip_id, user_id)]
    return generate_phrases(db, rows[0], user_id, regenerate=regenerate)
