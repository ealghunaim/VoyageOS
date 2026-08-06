"""Trip CRUD — the week-2 slice. Create a trip, add destinations & activities, read it back."""
from fastapi import APIRouter, Depends, HTTPException
from api.core.auth import current_user_id
from api.core.db import get_db
from api.subscriptions import service as subscriptions
from api.subscriptions.tiers import limit_for
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

    # The one choke point. Every trip in the system is inserted here, so the
    # tier limit needs to exist in exactly one place — unlike the lock in
    # phase 2, which has to reach a dozen mutation paths.
    #
    # 402 rather than 429: a paywall is not a rate limit. 429 tells clients,
    # proxies and SDKs "transient, back off and retry", which is wrong in both
    # halves — this will not clear on its own, and retrying cannot help.
    sub = subscriptions.get(db, user_id)
    tier = subscriptions.tier_for(db, user_id, sub)
    limit = limit_for(tier)
    used = subscriptions.trip_count(db, user_id)
    if used >= limit:
        raise HTTPException(402, subscriptions.limit_body(tier, limit, used))

    trip = (
        db.table("trips")
        .insert({"owner_id": user_id, "status": "upcoming", **body.model_dump(mode="json")})
        .execute()
    ).data[0]

    # First trip is on us, once ever. Granted whatever the tier — the promise
    # is about the first trip, not about being unpaid, and a subscriber who
    # later lapses keeps premium on the trip they made, which sits better with
    # "existing trips are never deleted" than revoking it would.
    if not subscriptions.has_used_demo(db, user_id, sub):
        subscriptions.consume_demo(db, user_id, trip["id"])
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
        db.table("destinations").select("id,trip_id,place_name,country_code,seq")
        .in_("trip_id", ids).order("seq").execute()
    ).data
    first: dict = {}
    by_trip: dict = {}
    for d in dests:
        first.setdefault(d["trip_id"], d)
        by_trip.setdefault(d["trip_id"], []).append(d)
    for t in trips:
        d = first.get(t["id"])
        if d:
            t["place"] = d.get("place_name")
            t["country_code"] = t.get("country_code") or d.get("country_code")
        # the full stop list costs nothing here — the query above already read
        # every destination — and lets the trip list render the same
        # multi-country hero as the trip screen instead of only the first flag
        t["destinations"] = by_trip.get(t["id"], [])
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
    # Three attempts, shedding as little as possible at each step. The wizard
    # wraps a whole trip build in one try/catch, so an insert that escapes here
    # costs the traveller their stops and their packing list — the retry must
    # stay as forgiving as it was.
    #
    # What changed is the order in which things are given up. The old fallback
    # dropped lat and lng together with accommodation, reasoning that "optional
    # fields are the usual culprits". They are not: accommodation is a JSON
    # blob and the plausible failure, while coordinates are two floats no
    # insert has rejected. Losing them is silent and permanent — a destination
    # without coordinates can fetch neither forecast nor climatology, so its
    # trip shows no weather while its neighbours show theirs, and nothing says
    # why. Eight of fourteen destinations on dev had been created that way.
    #
    # So coordinates are surrendered last, and only to keep a trip build alive.
    minimal = {"trip_id": trip_id, "place_name": row["place_name"],
               "country_code": row["country_code"], "seq": row["seq"]}
    attempts = [
        ("full", row),
        ("without accommodation", {k: v for k, v in row.items() if k != "accommodation"}),
        ("minimal", minimal),
    ]
    last: Exception | None = None
    for i, (label, payload) in enumerate(attempts):
        try:
            saved = db.table("destinations").insert(payload).execute().data[0]
            if i and "lat" not in payload:
                print(f"[destinations] {row['place_name']!r} saved WITHOUT coordinates "
                      f"({label}) — weather will be unavailable until it is backfilled; "
                      "see scripts/backfill_coords.py")
            elif i:
                print(f"[destinations] {row['place_name']!r} saved on retry ({label})")
            return saved
        except Exception as e:  # noqa: BLE001 — try the next, narrower payload
            last = e
            detail = str(e)
            # Name what the database actually complained about instead of
            # asserting which fields are usually to blame.
            culprit = next((f for f in ("accommodation", "country_code", "place_name",
                                        "seq", "lat", "lng") if f in detail), "unknown")
            print(f"[destinations] insert failed for {row['place_name']!r} "
                  f"[{label}] ({type(e).__name__}: {detail[:160]}) — "
                  f"field named in the error: {culprit}")
    raise last  # type: ignore[misc]


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
