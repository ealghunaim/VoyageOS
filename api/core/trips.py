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

#: Kept identical to what all fifteen call sites raised. Changing it is a
#: user-visible change, not a refactor.
NOT_FOUND = "Trip not found"


def owned_trip(db, trip_id: str, user_id: str, *, writing: bool = False) -> dict:
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
    return rows[0]


def owned_trip_via_destination(db, destination_id: str, user_id: str,
                               *, writing: bool = False) -> tuple[dict, dict]:
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
    return dest, trips[0]
