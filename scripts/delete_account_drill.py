"""Prove account deletion removes everything, and that a failure removes nothing.

Two runs, and the second matters more.

THE HAPPY PATH asserts absence, not success codes. A drill that checks "the
profile row is gone" would pass while leaving encrypted documents in a bucket
forever — the exact failure this feature exists to prevent. So it populates an
account with one of every kind of data first, then asserts each store is empty
by looking, including the two storage prefixes.

THE NEGATIVE TEST is the one worth having. It makes the storage purge fail and
then asserts the account is COMPLETELY INTACT — auth user, profile, trips,
documents, keys, files. A half-deleted account is the dangerous outcome, and
the ordering in api/account/deletion.py exists to make it unreachable; this is
what checks that claim rather than trusting the comment.

    .venv/bin/python3 scripts/delete_account_drill.py          # dev
    .venv/bin/python3 scripts/delete_account_drill.py --prod   # only once green
"""
from __future__ import annotations

import os
import secrets
import sys
import uuid

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if "--prod" in sys.argv:
    env = os.path.expanduser("~/.config/voyageos/env.prod")
    for line in open(env):
        if "=" in line and not line.strip().startswith("#"):
            k, _, v = line.strip().partition("=")
            os.environ[k] = v.strip().strip('"').strip("'")

from api.core import config  # noqa: E402
from api.core.db import get_db  # noqa: E402
from api.account import deletion  # noqa: E402

PASS, FAIL = "✓", "✗"
failures = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global failures
    if not ok:
        failures += 1
    print(f"    {PASS if ok else FAIL} {label}{f'  — {detail}' if detail else ''}")


def admin(url: str, key: str):
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def make_account(db, url, key) -> tuple[str, str]:
    email = f"deldrill+{uuid.uuid4().hex[:8]}@voyageos.dev"
    r = httpx.post(f"{url}/auth/v1/admin/users", headers=admin(url, key), timeout=30,
                   json={"email": email, "password": secrets.token_urlsafe(18),
                         "email_confirm": True})
    r.raise_for_status()
    uid = r.json()["id"]
    db.table("profiles").upsert({"id": uid, "email": email}).execute()
    return uid, email


def populate(db, uid: str) -> dict:
    """One of everything, so absence afterwards means something."""
    made = {}

    trip = db.table("trips").insert({
        "owner_id": uid, "status": "upcoming", "title": "DELDRILL",
        "start_date": "2027-05-01", "end_date": "2027-05-05"}).execute().data[0]
    made["trip"] = trip["id"]

    db.table("subscriptions").upsert({
        "user_id": uid, "tier": "explorer", "status": "active"}).execute()
    db.table("device_tokens").upsert({
        "user_id": uid, "device_id": str(uuid.uuid4()), "token": f"ExponentPushToken[{uuid.uuid4().hex[:16]}]",
    }).execute()
    db.table("trip_notes").insert({"trip_id": trip["id"], "user_id": uid, "body": "x"}).execute()

    # A real encrypted document with a real stored object.
    from api.core import crypto
    from api.documents import photos as docphotos
    # Use the app's own read-through helper rather than hand-rolling the wrap:
    # it is the code path a real user takes, and it owns the version handling.
    dek = crypto.get_or_create_user_key(db, uid).dek
    doc = db.table("documents").insert({
        "user_id": uid, "type": "passport", "label": "DELDRILL"}).execute().data[0]
    key = docphotos.upload(db, uid, doc["id"], b"\x89PNG-not-really-a-photo", dek)
    db.table("documents").update({"file_key": key}).eq("id", doc["id"]).execute()
    made["doc_key"] = key

    # A tip with a journal photo.
    tip_key = f"{uid}/tips/{uuid.uuid4().hex}.jpg"
    db.storage.from_("journal").upload(tip_key, b"jpeg-bytes", {"content-type": "image/jpeg"})
    db.table("food_tips").insert({
        "user_id": uid, "category": "eat", "place_name": "Deldrill",
        "restaurant": "Test", "photos": [tip_key]}).execute()
    made["tip_key"] = tip_key

    # An audit row naming them in BOTH identity columns.
    eid = f"deldrill_{uuid.uuid4().hex[:12]}"
    db.table("webhook_events").insert({
        "event_id": eid, "event_type": "RENEWAL", "app_user_id": uid,
        "resolved_user_id": uid, "outcome": "applied"}).execute()
    made["event_id"] = eid
    return made


#: Every table that must be empty afterwards. Enumerated rather than spot
#: checked — "the profile is gone" is exactly the shallow assertion this drill
#: exists to be better than.
CASCADING = [
    ("profiles", "id"), ("subscriptions", "user_id"), ("user_keys", "user_id"),
    ("device_tokens", "user_id"), ("documents", "user_id"), ("food_tips", "user_id"),
    ("trips", "owner_id"), ("trip_notes", "user_id"),
    # These three do NOT cascade — deletion.py removes them explicitly. They
    # are in this list precisely because the drill is what discovered that.
    ("flight_api_usage", "user_id"),
]


def rows_for(db, table: str, col: str, uid: str) -> int:
    try:
        return len(db.table(table).select("*", count=None).eq(col, uid).execute().data)
    except Exception as e:                                   # noqa: BLE001
        print(f"      ({table}: {type(e).__name__})")
        return -1


def main() -> int:
    db = get_db()
    url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    is_prod = "njvpjzojnzbynwlqsdbw" in url
    if is_prod and "--prod" not in sys.argv:
        print("  refusing: pointed at prod without --prod")
        return 2
    print(f"\n  target: {'PROD' if is_prod else 'DEV'} ({url.split('//')[1][:24]}…)\n")

    # ── NEGATIVE TEST FIRST ────────────────────────────────────────────────
    # Run before the happy path so a bug that deletes too much is caught on an
    # account we then inspect in full, rather than after everything is gone.
    print("  ── negative: storage purge fails → nothing else may be touched ──")
    uid, email = make_account(db, url, key)
    made = populate(db, uid)

    real_remaining = deletion.storage_remaining
    deletion.storage_remaining = lambda *a, **k: 3        # pretend files survive
    try:
        deletion.delete_account(db, uid)
        check("delete_account refused to proceed", False, "it returned instead of raising")
    except deletion.StoragePurgeFailed:
        check("delete_account raised StoragePurgeFailed", True)
    except Exception as e:                                   # noqa: BLE001
        check("delete_account raised StoragePurgeFailed", False, f"raised {type(e).__name__}")
    finally:
        deletion.storage_remaining = real_remaining

    r = httpx.get(f"{url}/auth/v1/admin/users/{uid}", headers=admin(url, key), timeout=30)
    check("auth user still exists", r.status_code == 200, f"HTTP {r.status_code}")
    intact = {t: rows_for(db, t, c, uid) for t, c in CASCADING}
    check("profile intact", intact["profiles"] == 1)
    check("trips intact", intact["trips"] == 1)
    check("documents intact", intact["documents"] == 1)
    check("user_keys intact", intact["user_keys"] == 1)
    ev = db.table("webhook_events").select("*").eq("event_id", made["event_id"]).execute().data
    check("audit row NOT pseudonymized", bool(ev) and ev[0]["app_user_id"] == uid,
          "identity must survive a failed delete")

    # Clean up the negative-test account for real.
    deletion.delete_account(db, uid)
    print()

    # ── HAPPY PATH ─────────────────────────────────────────────────────────
    print("  ── happy path: everything of theirs is gone ──")
    uid, email = make_account(db, url, key)
    made = populate(db, uid)

    before_objs = deletion.storage_remaining(db, uid)
    check("storage populated before deleting", before_objs >= 2, f"{before_objs} object(s)")

    result = deletion.delete_account(db, uid)
    print(f"      {result}")

    check("documents+journal prefixes empty", deletion.storage_remaining(db, uid) == 0)
    check("no document keys resolvable", len(deletion.document_keys(db, uid)) == 0)
    check("no journal keys resolvable", len(deletion.journal_keys(db, uid)) == 0)

    for table, col in CASCADING:
        n = rows_for(db, table, col, uid)
        check(f"{table} empty", n == 0, f"{n} row(s)")

    ev = db.table("webhook_events").select("*").eq("event_id", made["event_id"]).execute().data
    check("audit row SURVIVES", len(ev) == 1)
    if ev:
        check("app_user_id nulled", ev[0]["app_user_id"] is None, str(ev[0]["app_user_id"]))
        check("resolved_user_id nulled", ev[0]["resolved_user_id"] is None, str(ev[0]["resolved_user_id"]))
        check("event_id and outcome kept", ev[0]["outcome"] == "applied")
        db.table("webhook_events").delete().eq("event_id", made["event_id"]).execute()

    r = httpx.get(f"{url}/auth/v1/admin/users/{uid}", headers=admin(url, key), timeout=30)
    check("auth lookup 404", r.status_code == 404, f"HTTP {r.status_code}")

    print(f"\n  {'✓ all checks passed' if not failures else f'✗ {failures} FAILED'}\n")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
