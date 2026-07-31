"""Trip CRUD — the week-2 slice. Create a trip, add destinations & activities, read it back."""
from fastapi import APIRouter, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db
from api.trips.models import TripPatch, ActivityCreate, DestinationCreate, TripCreate

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
    trips = (
        db.table("trips").select("*").eq("owner_id", user_id)
        .order("start_date", desc=True).execute()
    ).data
    if not trips:
        return trips
    # enrich each trip with its first destination's place + country_code so the
    # app's accent, currency, and landmark resolve correctly (they read trip.country_code)
    ids = [t["id"] for t in trips]
    dests = (
        db.table("destinations").select("trip_id,place_name,country_code,seq")
        .in_("trip_id", ids).order("seq").execute()
    ).data
    first: dict = {}
    for d in dests:
        first.setdefault(d["trip_id"], d)
    for t in trips:
        d = first.get(t["id"])
        if d:
            t["place"] = d.get("place_name")
            t["country_code"] = t.get("country_code") or d.get("country_code")
    return trips


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
    row = {
        "trip_id": trip_id,
        "place_name": (body.place_name or "").strip()[:120] or "Trip",
        "country_code": (body.country_code or "").upper()[:2] or None,
        "lat": body.lat, "lng": body.lng,
        "accommodation": body.accommodation if isinstance(body.accommodation, dict) else None,
        "seq": body.seq or 1,
    }
    try:
        return db.table("destinations").insert(row).execute().data[0]
    except Exception as e:
        # Never fail the whole build on a destination hiccup — retry without the
        # optional/blob fields, which are the usual culprits, so the trip still forms.
        print(f"[destinations] insert failed ({type(e).__name__}: {str(e)[:200]}); retrying lean")
        lean = {"trip_id": trip_id, "place_name": row["place_name"],
                "country_code": row["country_code"], "seq": row["seq"]}
        return db.table("destinations").insert(lean).execute().data[0]


@router.post("/{trip_id}/activities", status_code=201)
def add_activity(trip_id: str, body: ActivityCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned_trip_or_404(db, trip_id, user_id)
    return (
        db.table("activities").insert({"trip_id": trip_id, **body.model_dump()}).execute()
    ).data[0]


@router.patch("/{trip_id}")
def patch_trip(trip_id: str, body: TripPatch, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = db.table("trips").select("*").eq("id", trip_id).eq("owner_id", user_id).execute().data
    if not rows:
        raise HTTPException(404, "Trip not found")
    changes = body.model_dump(mode="json", exclude_none=True)
    if not changes:
        return rows[0]
    start = changes.get("start_date", rows[0]["start_date"])
    end = changes.get("end_date", rows[0]["end_date"])
    if end < start:
        raise HTTPException(422, "end_date must be on or after start_date")
    updated = db.table("trips").update(changes).eq("id", trip_id).execute().data[0]
    if "start_date" in changes or "end_date" in changes:
        # stale schedules die; the timeline lazily rebuilds on next open
        db.table("notification_schedule").delete().eq("trip_id", trip_id) \
            .eq("status", "pending").execute()
        db.table("tasks").delete().eq("trip_id", trip_id).execute()
    return updated


@router.delete("/{trip_id}", status_code=204)
def delete_trip(trip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    if not db.table("trips").select("id").eq("id", trip_id).eq("owner_id", user_id).execute().data:
        raise HTTPException(404, "Trip not found")
    # notification_log has no trip_id — it reaches a trip only via schedule_id,
    # so collect those ids BEFORE the schedules they point at are deleted.
    sched_ids = [r["id"] for r in db.table("notification_schedule").select("id")
                 .eq("trip_id", trip_id).execute().data]
    if sched_ids:
        db.table("notification_log").delete().in_("schedule_id", sched_ids).execute()
    db.table("notification_schedule").delete().eq("trip_id", trip_id).execute()
    db.table("trips").delete().eq("id", trip_id).execute()  # FK cascade takes the rest
