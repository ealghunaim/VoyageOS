"""Prove the trip gate and the demo loophole against a real database.

Two claims that only real rows can settle:

  the gate blocks at exactly the limit — not one early, not one late, and at
  every tier rather than only the one that happened to be configured

  the premium demo cannot be farmed — create it, delete it, create another,
  and the second must NOT be premium, however many times you go round

The second is the reason the flag exists. A count-based rule ("premium if this
is your first trip") passes every unit test and fails here, because deleting
the trip returns the count to zero.

Dev only. It creates and deletes trips under the dev user and puts the
subscription row back exactly as it found it, so the target is printed first
and --confirm is required.

    .venv/bin/python3 scripts/subscription_drill.py --confirm
"""
from __future__ import annotations

import os
import secrets
import sys
import uuid

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.core import config  # noqa: E402,F401
from api.core.db import get_db  # noqa: E402
from api.subscriptions import service  # noqa: E402
from api.subscriptions.tiers import TIER_LIMITS, limit_for  # noqa: E402

TITLE = "SUBSCRIPTION-DRILL"
ok_all = True


def check(label: str, ok: bool, detail: str = "") -> bool:
    global ok_all
    ok_all &= ok
    print(f"    {'PASS' if ok else 'FAIL'}  {label}" + (f"   {detail}" if detail else ""))
    return ok


def make_trip(db, uid: str, n: int) -> dict | None:
    """The gate lives in the route, so the drill applies it explicitly rather
    than inserting behind its back — otherwise it would prove nothing."""
    sub = service.get(db, uid)
    tier = service.tier_for(db, uid, sub)
    if service.trip_count(db, uid) >= limit_for(tier):
        return None
    trip = db.table("trips").insert({
        "owner_id": uid, "status": "upcoming", "title": f"{TITLE} {n}",
        "start_date": "2027-01-01", "end_date": "2027-01-05",
    }).execute().data[0]
    if not service.has_used_demo(db, uid, sub):
        service.consume_demo(db, uid, trip["id"])
    return trip


def wipe(db, uid: str) -> None:
    for t in db.table("trips").select("id,title").eq("owner_id", uid).execute().data:
        if (t.get("title") or "").startswith(TITLE):
            db.table("trips").delete().eq("id", t["id"]).execute()


def scratch_user(db) -> tuple[str, str]:
    """A real auth user with no trips, so a limit can be tested from zero.

    The dev account owns seven real trips, which makes every tier below seven
    allow zero new ones — the gate is right and the assertion was wrong. A
    boundary test has to start from an empty account or it tests nothing.

    profiles.id is a foreign key to auth.users, so this cannot be faked with a
    bare insert; the user is created through the admin API and deleted at the
    end, which cascades the profile, its trips and its subscription away.
    """
    url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    email = f"drill+{uuid.uuid4().hex[:10]}@voyageos.dev"
    r = httpx.post(f"{url}/auth/v1/admin/users",
                   headers={"apikey": key, "Authorization": f"Bearer {key}"},
                   json={"email": email, "password": secrets.token_urlsafe(18),
                         "email_confirm": True}, timeout=20)
    r.raise_for_status()
    uid = r.json()["id"]
    db.table("profiles").upsert({"id": uid, "email": email}).execute()
    return uid, email


def drop_scratch_user(uid: str) -> None:
    url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    httpx.delete(f"{url}/auth/v1/admin/users/{uid}",
                 headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=20)


def set_tier(db, uid: str, tier: str) -> None:
    db.table("subscriptions").upsert({"user_id": uid, "tier": tier},
                                     on_conflict="user_id").execute()


def main() -> int:
    db = get_db()
    print(f"  target: {os.environ.get('SUPABASE_URL')}")
    if "--confirm" not in sys.argv:
        print("  dry run — pass --confirm to write. Dev only.")
        return 0
    try:
        db.table("subscriptions").select("user_id").limit(1).execute()
    except Exception as e:
        print(f"\n  ✗ subscriptions table missing — apply migration 0024 first.\n    {e}")
        return 2

    uid = db.table("profiles").select("id").limit(1).execute().data[0]["id"]
    before = service.get(db, uid)
    print(f"  user  : {uid[:8]}…")
    print(f"  before: {before}\n")

    try:
        # ── 1 · the demo cannot be farmed ────────────────────────────────
        print("  1 · demo trip: create → delete → recreate")
        wipe(db, uid)
        db.table("subscriptions").delete().eq("user_id", uid).execute()   # fresh user
        set_tier(db, uid, "voyager")        # room to spare, so only the demo is tested

        a = make_trip(db, uid, 1)
        sub = service.get(db, uid)
        check("first trip is granted the demo",
              sub and sub["premium_trip_used"] and sub["premium_trip_id"] == a["id"],
              f"id={str(sub.get('premium_trip_id'))[:8]}…")

        db.table("trips").delete().eq("id", a["id"]).execute()
        sub = service.get(db, uid)
        check("deleting it clears the pointer", sub["premium_trip_id"] is None)
        check("but the used flag SURVIVES the delete", sub["premium_trip_used"] is True)

        b = make_trip(db, uid, 2)
        sub = service.get(db, uid)
        check("the replacement trip is NOT premium",
              sub["premium_trip_id"] is None and sub["premium_trip_used"] is True,
              f"id={sub['premium_trip_id']}")

        for i in range(2):
            db.table("trips").delete().eq("id", b["id"]).execute()
            b = make_trip(db, uid, 3 + i)
        sub = service.get(db, uid)
        check("still not premium after repeated delete/recreate",
              sub["premium_trip_id"] is None and sub["premium_trip_used"] is True)

        # ── 2 · the gate blocks at exactly the limit, at every tier ──────
        #
        # On a fresh account, so "exactly N" means N and not "N minus whatever
        # this user already had".
        print("\n  2 · the gate, at each tier (fresh account)")
        scratch, email = scratch_user(db)
        print(f"      scratch user {scratch[:8]}…  {email}")
        try:
            check("starts with no trips", service.trip_count(db, scratch) == 0)
            for tier, limit in TIER_LIMITS.items():
                wipe(db, scratch)
                set_tier(db, scratch, tier)
                made = [t for t in (make_trip(db, scratch, i) for i in range(limit + 2)) if t]
                n = service.trip_count(db, scratch)
                check(f"{tier:<9} allows exactly {limit:>2}, blocks the next",
                      len(made) == limit and n == limit,
                      f"created={len(made)} counted={n}")
                body = service.limit_body(tier, limit, n)
                check(f"{tier:<9} 402 body reports {limit:>2}",
                      body["limit"] == limit and body["trips_used"] == limit)

            # ── 3 · no row at all reads as free ─────────────────────────
            print("\n  3 · a fresh account with no subscription row")
            wipe(db, scratch)
            db.table("subscriptions").delete().eq("user_id", scratch).execute()
            check("tier_for resolves to free", service.tier_for(db, scratch) == "free")
            made = [t for t in (make_trip(db, scratch, i) for i in range(3)) if t]
            check("and is allowed exactly 1 trip", len(made) == 1, f"created={len(made)}")
        finally:
            drop_scratch_user(scratch)
            print("\n    scratch user deleted (cascades its trips and subscription)")

    finally:
        wipe(db, uid)
        db.table("subscriptions").delete().eq("user_id", uid).execute()
        if before:
            db.table("subscriptions").upsert(before, on_conflict="user_id").execute()
            print("\n    restored the pre-existing subscription row")
        else:
            print("\n    removed the drill's subscription row (there was none before)")
        left = len([t for t in db.table("trips").select("title").eq("owner_id", uid)
                    .execute().data if (t.get("title") or "").startswith(TITLE)])
        print(f"    drill trips left behind: {left}")

    print(f"\n  {'✓ ALL CHECKS PASSED' if ok_all else '✗ SOMETHING FAILED'}")
    return 0 if ok_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
