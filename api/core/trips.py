"""The one place trip ownership is decided.

Fifteen routes used to answer this question for themselves, in four helper
functions and eleven hand-written checks. They happened to agree — every one
selected the trip by id and owner_id and raised 404 "Trip not found" — but
agreement by coincidence is not a rule, and the sixteenth would have been
written by someone reading whichever neighbour they happened to open.

The reason to fix it now rather than when it bites: the subscription lock
needs exactly this seam. A locked trip stays readable and deletable but
refuses edits, and that has to hold on every route that can change a trip. As
fifteen copies it is fifteen chances to miss one, and the one missed is a way
to edit a trip you have not paid for. As one function it is a parameter.

WHY 404 AND NOT 403

Both "no such trip" and "not your trip" answer 404 with the same message, and
that is deliberate rather than lazy. A 403 would confirm the trip exists,
turning the endpoint into an oracle for other people's trip ids. The two cases
must stay indistinguishable from outside.
"""
from __future__ import annotations

from fastapi import HTTPException

#: What a write is trying to do, which decides whether the lock applies.
#:
#: PLAN changes what the trip WILL BE — destinations, dates, the packing list,
#: the itinerary. This is what a lock refuses.
#:
#: RECORD writes down what happened or what you thought about it — journal
#: entries, the debrief, ticking an item as actually packed. A closed trip
#: still accepts these; refusing them is what would make the lock hostile,
#: because the most considered record of a trip is written after it ends.
#:
#: Deletion is filed under RECORD, which reads oddly and is deliberate: a lock
#: that can trap data is not a lock, it is a hostage. owned_trip's own contract
#: has promised "readable and deletable but refuses edits" since it was written.
PLAN = "plan"
RECORD = "record"

#: Kept identical to what all fifteen call sites raised. Changing it is a
#: user-visible change, not a refactor.
NOT_FOUND = "Trip not found"


def may_write(trip: dict, user_id: str, scope: str) -> dict:
    """May this user change this trip, in this way? One place, one answer.

    Returns {"allowed": bool, "reason": str | None, "detail": dict}. The reason
    is a CODE, not a sentence — the client turns it into words and offers the
    matching remedy, because only the client knows what it is showing.

    THE SHAPE IS THE POINT. Locking is the first reason and will not be the
    last: Phase D adds "tier" (you are over your plan's limit) and Phase H adds
    "role" (you are a viewer on someone else's trip). Those arrive as further
    branches HERE, never as separate checks bolted alongside — the failure mode
    of permission systems is two places that disagree, and this file exists
    because fifteen routes once answered ownership for themselves.

    Exemptions live inside these branches too. A route does not get to skip the
    seam; it declares its scope and the seam decides.
    """
    if scope == RECORD:
        return {"allowed": True, "reason": None, "detail": {}}

    locked_at = trip.get("locked_at")
    if locked_at:
        return {"allowed": False, "reason": "locked",
                "detail": {"locked_at": str(locked_at), "trip_id": trip.get("id")}}

    return {"allowed": True, "reason": None, "detail": {}}


def owned_trip(db, trip_id: str, user_id: str, *, writing: bool = False,
               scope: str = PLAN) -> dict:
    """The trip, or 404 if it is missing or belongs to someone else.

    `writing` marks the callers that change something. It does nothing yet —
    the seam is here so that when locked trips arrive, "view and delete but do
    not edit" is one branch in one function rather than a rule reimplemented
    on every route that mutates. Passing it now means the lock does not have
    to revisit fifteen call sites to find out which are writes.
    """
    rows = db.table("trips").select("*").eq("id", trip_id) \
        .eq("owner_id", user_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, NOT_FOUND)
    trip = rows[0]

    if writing:
        verdict = may_write(trip, user_id, scope)
        if not verdict["allowed"]:
            # 423 Locked, not 403: the caller is permitted, the RESOURCE is
            # closed, and it reopens without any change to who they are.
            raise HTTPException(423, {"code": verdict["reason"], **verdict["detail"],
                                      "message": "This trip is closed out. "
                                                 "Unlock it to make changes."})
    return trip


def owned_trip_via_destination(db, destination_id: str, user_id: str,
                               *, writing: bool = False,
                               scope: str = PLAN) -> tuple[dict, dict]:
    """(destination, trip) for a destination the caller owns, or 404.

    Separate from owned_trip because the message must differ. This is reached
    through a destination id, so answering "Trip not found" would confirm the
    destination exists and belongs to a trip that is not yours — a smaller
    version of the oracle that 404-for-everything exists to prevent. Both
    failure modes answer "Destination not found".
    """
    rows = db.table("destinations").select("*").eq("id", destination_id) \
        .limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Destination not found")
    dest = rows[0]
    trips = db.table("trips").select("*").eq("id", dest["trip_id"]) \
        .eq("owner_id", user_id).limit(1).execute().data
    if not trips:
        raise HTTPException(404, "Destination not found")

    # Same seam. A second door into the same house needs the same lock, and
    # the way these drift is one of them being written later and forgetting.
    if writing:
        verdict = may_write(trips[0], user_id, scope)
        if not verdict["allowed"]:
            raise HTTPException(423, {"code": verdict["reason"], **verdict["detail"],
                                      "message": "This trip is closed out. "
                                                 "Unlock it to make changes."})
    return dest, trips[0]
