"""Trip CRUD — the week-2 slice. Create a trip, add destinations & activities, read it back."""
from fastapi import APIRouter, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db
from api.trips.models import ActivityCreate, DestinationCreate, TripCreate

router = APIRouter(prefix="/v1/trips", tags=["trips"])


def _ensure_profile(db, user_id: str) -> None:
    """profiles.id must exist before anything references it (FK to auth.users)."""
    db.table("profiles").upsert({"id": user_id}).execute()


def _owned_trip_or_404(db, trip_id: str, user_id: str) -> dict:
    res = db.table("trips").select("*").eq("id", trip_id).eq("owner_id", user_id).execute()
    if not res.data:
        raise HTTPException(404, "Trip not found")
    return res.data[0]


@router.post("", status_code=201)
def create_trip(body: TripCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    _ensure_profile(db, user_id)
    trip = (
        db.table("trips")
        .insert({"owner_id": user_id, "status": "upcoming", **body.model_dump(mode="json")})
        .execute()
    ).data[0]
    db.table("trip_travelers").insert(
        {"trip_id": trip["id"], "user_id": user_id, "role": "owner"}
    ).execute()
    return trip


@router.get("")
def list_trips(user_id: str = Depends(current_user_id)):
    db = get_db()
    return (
        db.table("trips").select("*").eq("owner_id", user_id)
        .order("start_date", desc=True).execute()
    ).data


@router.get("/{trip_id}")
def get_trip(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    trip = _owned_trip_or_404(db, trip_id, user_id)
    trip["destinations"] = (
        db.table("destinations").select("*").eq("trip_id", trip_id).order("seq").execute()
    ).data
    trip["activities"] = (
        db.table("activities").select("*").eq("trip_id", trip_id).execute()
    ).data
    return trip


@router.post("/{trip_id}/destinations", status_code=201)
def add_destination(trip_id: str, body: DestinationCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned_trip_or_404(db, trip_id, user_id)
    return (
        db.table("destinations").insert({"trip_id": trip_id, **body.model_dump()}).execute()
    ).data[0]


@router.post("/{trip_id}/activities", status_code=201)
def add_activity(trip_id: str, body: ActivityCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned_trip_or_404(db, trip_id, user_id)
    return (
        db.table("activities").insert({"trip_id": trip_id, **body.model_dump()}).execute()
    ).data[0]
