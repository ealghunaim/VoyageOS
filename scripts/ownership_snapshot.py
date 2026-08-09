"""Record what every trip-guarded route answers, so a refactor can be proved.

2a consolidates fifteen hand-written trip-ownership checks into one function.
The guard itself is easy; the substitutions are where a refactor of this shape
goes wrong — one call site missed, one 404 that becomes a 403, one message
reworded. None of that raises, and none of it shows up in a unit test of the
new helper.

So: call every guarded route three ways — the trip is yours, the trip is
someone else's, the trip does not exist — and record (status, detail). Run it
before the refactor and after, and diff. Any difference at all is a
regression, including a message differing by one character.

Everything downstream of the guard is stubbed. These routes generate guides,
call models and write rows; none of that is under test here, and letting a
snapshot spend money on AI generation would be its own bug.

    .venv/bin/python3 scripts/ownership_snapshot.py before
    .venv/bin/python3 scripts/ownership_snapshot.py after
    .venv/bin/python3 scripts/ownership_snapshot.py diff
"""
from __future__ import annotations

import json
import os
import secrets
import sys
import uuid
from unittest.mock import patch

import httpx
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.core import config  # noqa: E402,F401
from api.core.db import get_db  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   ".ownership-snapshot")
SENTINEL = {"stubbed": True}


def scratch_user(db) -> tuple[str, str]:
    url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    email = f"ownsnap+{uuid.uuid4().hex[:10]}@voyageos.dev"
    r = httpx.post(f"{url}/auth/v1/admin/users",
                   headers={"apikey": key, "Authorization": f"Bearer {key}"},
                   json={"email": email, "password": secrets.token_urlsafe(18),
                         "email_confirm": True}, timeout=20)
    r.raise_for_status()
    uid = r.json()["id"]
    db.table("profiles").upsert({"id": uid, "email": email}).execute()
    return uid, email


def drop_user(uid: str) -> None:
    url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    httpx.delete(f"{url}/auth/v1/admin/users/{uid}",
                 headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=20)


def call(fn, **kw) -> tuple[int, str]:
    """(status, detail). 200 for anything that got past the guard — what the
    route then returns is not this snapshot's business."""
    try:
        fn(**kw)
        return 200, "OK"
    except HTTPException as e:
        d = e.detail
        return e.status_code, (json.dumps(d, sort_keys=True) if isinstance(d, dict) else str(d))
    except Exception as e:  # noqa: BLE001 — past the guard, into stubbed territory
        return 200, f"OK (downstream: {type(e).__name__})"


def routes():
    """(label, callable, kwargs-builder) for every trip-guarded route.

    kwargs-builder takes the trip id under test and returns the call kwargs, so
    the same route can be driven with an owned, a foreign and a missing id.
    """
    import api.trips.models as schemas
    import api.gear.router as gear
    import api.guide.router as guide
    import api.trips.models as schemas
    import api.history.router as history
    import api.notes.router as notes
    import api.packing.quick as quick
    import api.packing.router as packing
    import api.photos.router as photos
    import api.planner.router as planner
    import api.qa.router as qa
    import api.timeline.router as timeline
    import api.trips.router as trips
    import api.weather.router as weather

    return [
        ("trips.get_trip",        trips.get_trip,        lambda t: {"trip_id": t}),
        ("trips.patch_trip",      trips.patch_trip,      lambda t: {"trip_id": t, "body": schemas.TripPatch()}),
        ("trips.delete_trip",     trips.delete_trip,     lambda t: {"trip_id": t}),
        ("trips.add_destination", trips.add_destination, lambda t: {"trip_id": t, "body": schemas.DestinationCreate(place_name="X", seq=9)}),
        ("trips.add_activity",    trips.add_activity,    lambda t: {"trip_id": t, "body": schemas.ActivityCreate(type="hiking")}),
        ("packing.get_list",      packing.get_list,      lambda t: {"trip_id": t}),
        ("packing.weight",        packing.get_weight,    lambda t: {"trip_id": t}),
        ("quick.quick_add",       quick.quick_add,       lambda t: {"trip_id": t, "body": quick.QuickAdd(text="socks")}),
        ("timeline.get_timeline", timeline.get_timeline, lambda t: {"trip_id": t}),
        ("weather.get_weather",   weather.get_weather,   lambda t: {"trip_id": t}),
        ("weather.refresh",       weather.refresh,       lambda t: {"trip_id": t}),
        ("guide.guide",           guide.guide,           lambda t: {"trip_id": t}),
        ("guide.guide_part",      guide.guide_part,      lambda t: {"trip_id": t, "phase": "a"}),
        ("guide.family_play",     guide.family_play,     lambda t: {"trip_id": t}),
        ("guide.phrases",         guide.phrases,         lambda t: {"trip_id": t}),
        ("notes.list_notes",      notes.list_notes,      lambda t: {"trip_id": t}),
        ("notes.add_note",        notes.add_note,        lambda t: {"trip_id": t, "body": notes.NoteCreate(body="x")}),
        ("planner.list_plan",     planner.list_plan,     lambda t: {"trip_id": t}),
        ("qa.ask",                qa.ask,                lambda t: {"trip_id": t, "body": qa.Ask(question="what to pack")}),
        ("history.debrief",       history.debrief,       lambda t: {"trip_id": t, "body": history.DebriefBody()}),
    ]


#: Everything past the guard. Patched so the snapshot measures ownership only —
#: and so it cannot trigger a paid guide generation.
STUBS = [
    "api.guide.router.get_guide", "api.guide.router.get_guide_part",
    "api.guide.router.generate_family_play", "api.guide.router.generate_phrases",
    "api.history.router.submit_debrief",
    "api.timeline.service.build_timeline",
    "api.weather.service.refresh_trip", "api.weather.service.load_snapshots",
    "api.packing.service.generate_list",
    "api.ai_gateway.gateway.complete",
]


def snapshot() -> dict:
    db = get_db()
    anchor = db.table("trips").select("owner_id").limit(1).execute().data
    if not anchor:
        print("  ✗ no trips on dev to identify a user"); sys.exit(2)
    user = anchor[0]["owner_id"]

    # A throwaway trip for the "owned" case. Half these routes write on
    # success — the first run of this script inserted a destination into a
    # real trip — so the owned target has to be disposable.
    owned = db.table("trips").insert({
        "owner_id": user, "status": "upcoming", "title": "OWNSNAP owned",
        "start_date": "2027-04-01", "end_date": "2027-04-05"}).execute().data[0]["id"]
    db.table("destinations").insert({
        "trip_id": owned, "place_name": "OWNSNAP", "seq": 1,
        "accommodation": {}}).execute()

    other, _ = scratch_user(db)
    foreign = db.table("trips").insert({
        "owner_id": other, "status": "upcoming", "title": "OWNSNAP foreign",
        "start_date": "2027-03-01", "end_date": "2027-03-05"}).execute().data[0]["id"]
    missing = str(uuid.uuid4())

    result: dict[str, dict[str, list]] = {}
    stack = []
    try:
        for target in STUBS:
            try:
                p = patch(target, return_value=SENTINEL); p.start(); stack.append(p)
            except (AttributeError, ModuleNotFoundError):
                pass                                    # not every stub exists
        for label, fn, mk in routes():
            result[label] = {}
            for case, tid in (("owned", owned), ("foreign", foreign), ("missing", missing)):
                # delete_trip on the owned case would actually delete it.
                if label == "trips.delete_trip" and case == "owned":
                    result[label][case] = ["SKIPPED", "destructive on the owned case"]
                    continue
                status, detail = call(fn, user_id=user, **mk(tid))
                result[label][case] = [status, detail]
        # photos guards a DESTINATION and must keep its own message
        import api.photos.router as photos
        d_mine = db.table("destinations").select("id").eq("trip_id", owned).limit(1).execute().data
        d_foreign = db.table("destinations").insert(
            {"trip_id": foreign, "place_name": "X", "seq": 1}).execute().data[0]["id"]
        result["photos.place_photos"] = {}
        for case, did in (("owned", d_mine[0]["id"] if d_mine else str(uuid.uuid4())),
                          ("foreign", d_foreign), ("missing", str(uuid.uuid4()))):
            status, detail = call(photos.place_photos, user_id=user,
                                  body=photos.PlacePhotoRequest(destination_id=did, names=[]))
            result["photos.place_photos"][case] = [status, detail]
        # gear/apply guards the kit AND the trip
        import api.gear.router as gear
        kit = db.table("gear_profiles").select("id").eq("user_id", user).limit(1).execute().data
        if kit:
            result["gear.apply"] = {}
            for case, tid in (("owned", owned), ("foreign", foreign), ("missing", missing)):
                status, detail = call(gear.apply_to_trip, user_id=user,
                                      profile_id=kit[0]["id"], trip_id=tid)
                result["gear.apply"][case] = [status, detail]
    finally:
        for p in reversed(stack):
            try: p.stop()
            except Exception: pass
        db.table("trips").delete().eq("id", owned).execute()   # cascades its rows
        drop_user(other)          # cascades the foreign trip and destination
    return result


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode in ("before", "after"):
        snap = snapshot()
        with open(f"{OUT}-{mode}.json", "w") as f:
            json.dump(snap, f, indent=2, sort_keys=True)
        print(f"  {mode}: {len(snap)} routes × 3 cases → {OUT}-{mode}.json")
        for label in sorted(snap):
            cells = "  ".join(f"{c}={snap[label][c][0]}" for c in ("owned", "foreign", "missing")
                              if c in snap[label])
            print(f"    {label:<26} {cells}")
        return 0
    if mode == "diff":
        a = json.load(open(f"{OUT}-before.json"))
        b = json.load(open(f"{OUT}-after.json"))
        diffs = []
        for label in sorted(set(a) | set(b)):
            for case in ("owned", "foreign", "missing"):
                x = a.get(label, {}).get(case)
                y = b.get(label, {}).get(case)
                if x != y:
                    diffs.append((label, case, x, y))
        if not diffs:
            print(f"  ✓ IDENTICAL — {len(a)} routes × 3 cases, no behavioural change")
            return 0
        print(f"  ✗ {len(diffs)} DIFFERENCE(S) — each one is a regression:")
        for label, case, x, y in diffs:
            print(f"    {label}[{case}]\n      before: {x}\n      after : {y}")
        return 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
