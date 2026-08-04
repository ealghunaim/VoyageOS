"""Prove the claim, the reaper, the ordering and the budget exemption — live.

The governor is pure and covered by unit tests. Everything else in this fix
touches Postgres and cannot be: whether a conditional update really hands a row
to exactly one worker, whether the reaper frees an abandoned claim, whether the
due query returns oldest-first, and whether a document reminder actually
survives an exhausted cap end to end.

Nothing is delivered. The push adapter is swapped for a recorder, so a drill
against a database with real device tokens cannot buzz a real phone.

Dev only. It writes and deletes schedule rows under a distinctive topic and
restores nothing else, so the target is printed first and --confirm is required.

    .venv/bin/python3 scripts/claim_drill.py --confirm
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.core import config  # noqa: E402,F401
from api.core.db import get_db  # noqa: E402
from api.notifications import worker  # noqa: E402

TOPIC = "claimdrill"
ok_all = True


def check(label: str, ok: bool, detail: str = "") -> bool:
    global ok_all
    ok_all &= ok
    print(f"    {'PASS' if ok else 'FAIL'}  {label}" + (f"   {detail}" if detail else ""))
    return ok


class Recorder:
    """Stands in for ExpoPushAdapter. Nothing leaves the process."""
    def __init__(self):
        self.sent: list[tuple[str, dict]] = []

    def deliver(self, user_id: str, payload: dict) -> None:
        self.sent.append((user_id, payload))


def row(uid: str, send_at: datetime, cls: str = "document", **kw) -> dict:
    r = {"user_id": uid, "send_at": send_at.isoformat(), "class": cls,
         "topic": f"{TOPIC}:{uuid.uuid4().hex[:6]}", "status": "pending",
         "payload": {"title": "drill", "body": "drill"},
         "idem_key": f"{TOPIC}:{uuid.uuid4().hex}", "tz_name": "UTC"}
    r.update(kw)
    return r


def cleanup(db) -> int:
    n = 0
    for tbl, col in (("notification_log", None), ("notification_schedule", "idem_key")):
        if col:
            res = db.table(tbl).delete().like(col, f"{TOPIC}:%").execute()
            n += len(res.data or [])
    return n


def main() -> int:
    db = get_db()
    print(f"  target: {os.environ.get('SUPABASE_URL')}")
    if "--confirm" not in sys.argv:
        print("  dry run — pass --confirm to write. Dev only.")
        return 0

    # ── 0 · is 0023 applied? ────────────────────────────────────────────
    try:
        db.table("notification_schedule").select("claimed_at").limit(1).execute()
    except Exception as e:
        print(f"\n  ✗ claimed_at is missing — apply migration 0023 first.\n    {e}")
        return 2
    print("  ✓ 0023 present (claimed_at readable)\n")

    uid = db.table("profiles").select("id").limit(1).execute().data[0]["id"]
    now = datetime.now(timezone.utc)
    cleanup(db)

    real_adapter = worker.adapter
    rec = Recorder()
    worker.adapter = rec
    try:
        # ── 1 · a claim is won exactly once ─────────────────────────────
        print("  1 · two workers, one row")
        rid = db.table("notification_schedule").insert(
            row(uid, now - timedelta(minutes=1))).execute().data[0]["id"]
        a = db.table("notification_schedule").update(
            {"status": "claimed", "claimed_at": now.isoformat()}) \
            .eq("id", rid).eq("status", "pending").execute().data
        b = db.table("notification_schedule").update(
            {"status": "claimed", "claimed_at": now.isoformat()}) \
            .eq("id", rid).eq("status", "pending").execute().data
        check("winner claims the row", len(a) == 1, f"{len(a)} row(s)")
        check("loser gets nothing", len(b) == 0, f"{len(b)} row(s)")

        # ── 2 · the reaper frees an abandoned claim ─────────────────────
        print("\n  2 · reaper")
        db.table("notification_schedule").update(
            {"status": "claimed",
             "claimed_at": (now - timedelta(minutes=20)).isoformat()}) \
            .eq("id", rid).execute()
        freed = worker._reap_stale_claims(db, now)
        after = db.table("notification_schedule").select("status") \
            .eq("id", rid).execute().data[0]["status"]
        check("stale claim returned to pending", after == "pending",
              f"freed={freed}, status={after}")

        db.table("notification_schedule").update(
            {"status": "claimed", "claimed_at": now.isoformat()}).eq("id", rid).execute()
        worker._reap_stale_claims(db, now)
        fresh = db.table("notification_schedule").select("status") \
            .eq("id", rid).execute().data[0]["status"]
        check("a FRESH claim is left alone", fresh == "claimed", f"status={fresh}")
        db.table("notification_schedule").delete().eq("id", rid).execute()

        # ── 3 · oldest first ────────────────────────────────────────────
        print("\n  3 · ordering under a backlog")
        rows = [row(uid, now - timedelta(minutes=i)) for i in range(1, 31)]
        db.table("notification_schedule").insert(rows).execute()
        due = db.table("notification_schedule").select("id,send_at") \
            .eq("status", "pending").lte("send_at", now.isoformat()) \
            .order("send_at").limit(worker.BATCH).execute().data
        sends = sorted(r["send_at"] for r in due)
        all_pending = db.table("notification_schedule").select("send_at") \
            .eq("status", "pending").like("idem_key", f"{TOPIC}:%").execute().data
        oldest25 = sorted(r["send_at"] for r in all_pending)[:worker.BATCH]
        check(f"batch is {worker.BATCH} rows", len(due) == worker.BATCH, f"{len(due)}")
        check("batch is the OLDEST rows", sends == oldest25)
        cleanup(db)

        # ── 4 · the sharp case, end to end ──────────────────────────────
        print("\n  4 · cap exhausted, then a document reminder comes due")
        prefs = db.table("user_preferences").select("notification_daily_cap") \
            .eq("user_id", uid).execute().data
        had_prefs = bool(prefs)
        prior_cap = prefs[0]["notification_daily_cap"] if prefs else None
        db.table("user_preferences").upsert(
            {"user_id": uid, "notification_daily_cap": 3}).execute()

        # Three sends already logged today — the 08:00 weather nudges.
        midnight = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0,
                                                      microsecond=0)
        log_ids = [db.table("notification_log").insert(
            {"user_id": uid, "class": "weather", "event": "sent",
             "at": (midnight + timedelta(hours=8, minutes=i)).isoformat()}
        ).execute().data[0]["id"] for i in range(3)]

        visa = db.table("notification_schedule").insert(
            row(uid, now - timedelta(minutes=1), cls="document",
                payload={"title": "KW visa needs renewing",
                         "body": "KW visa expires in 7 days."})).execute().data[0]
        rec.sent.clear()
        worker.run_due()
        state = db.table("notification_schedule").select("status") \
            .eq("id", visa["id"]).execute().data[0]["status"]
        check("visa reminder was SENT, not digested", state == "sent",
              f"status={state}")
        check("the push actually reached the adapter",
              any("visa" in (p.get("title") or "").lower() for _, p in rec.sent),
              f"{len(rec.sent)} delivered")

        for lid in log_ids:
            db.table("notification_log").delete().eq("id", lid).execute()
        db.table("notification_log").delete().eq("schedule_id", visa["id"]).execute()
        if had_prefs:
            db.table("user_preferences").update(
                {"notification_daily_cap": prior_cap}).eq("user_id", uid).execute()
        else:
            db.table("user_preferences").delete().eq("user_id", uid).execute()
    finally:
        worker.adapter = real_adapter
        left = cleanup(db)
        print(f"\n  cleaned up ({left} drill row(s) removed); "
              f"pending now: "
              f"{len(db.table('notification_schedule').select('id').eq('status','pending').execute().data)}")

    print(f"\n  {'✓ ALL CHECKS PASSED' if ok_all else '✗ SOMETHING FAILED'}")
    return 0 if ok_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
