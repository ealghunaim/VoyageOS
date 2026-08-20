"""Weather endpoints: on-demand refresh + the forecast strip feed."""
from fastapi import APIRouter, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db
from api.weather.service import load_snapshots, refresh_trip
from api.core.trips import owned_trip, PLAN, RECORD

router = APIRouter(prefix="/v1/trips", tags=["weather"])



@router.post("/{trip_id}/weather/refresh")
def refresh(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    trip = owned_trip(db, trip_id, user_id, writing=True, scope=PLAN)
    return refresh_trip(db, trip, user_id)


@router.get("/{trip_id}/weather")
def get_weather(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    trip = owned_trip(db, trip_id, user_id)
    dest, days = load_snapshots(db, trip)
    return {"place": dest["place_name"] if dest else None, "days": days}
