from fastapi import APIRouter, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db
from api.guide.service import get_guide

router = APIRouter(prefix="/v1/trips", tags=["guide"])


@router.get("/{trip_id}/guide")
def guide(trip_id: str, regenerate: bool = False, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = db.table("trips").select("*").eq("id", trip_id).eq("owner_id", user_id).execute().data
    if not rows:
        raise HTTPException(404, "Trip not found")
    return get_guide(db, rows[0], user_id, regenerate=regenerate)
