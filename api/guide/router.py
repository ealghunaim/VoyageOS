from fastapi import APIRouter, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db
from api.guide.service import get_guide, get_guide_part
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
def guide_part(trip_id: str, phase: str, destination_id: str | None = None,
                regenerate: bool = False, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = [owned_trip(db, trip_id, user_id)]
    return get_guide_part(db, rows[0], user_id, phase, destination_id=destination_id, regenerate=regenerate)


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
