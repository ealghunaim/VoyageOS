"""Prove one device keeps one row, and one reminder builds one message per device.

The bug: device_tokens was keyed on the token, Expo mints a new token per
install, so every app update added a row instead of replacing one. A phone
accumulated five and received every reminder five times.

Three claims that need real rows:

  same device_id, new token   → still ONE row, holding the new token
  different device_id         → TWO rows, because they are two installs
  eight devices               → exactly MAX_DEVICES_PER_USER messages built

Nothing is sent. The push adapter is swapped for a recorder, so this cannot
buzz a phone even against a database full of live tokens.

Dev only. Requires migrations 0025 and 0026. Creates a throwaway auth user and
deletes it, so the dev account's own token is never touched.

    .venv/bin/python3 scripts/device_token_drill.py --confirm
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
from api.notifications import push, worker  # noqa: E402

ok_all = True


def check(label: str, ok: bool, detail: str = "") -> bool:
    global ok_all
    ok_all &= ok
    print(f"    {'PASS' if ok else 'FAIL'}  {label}" + (f"   {detail}" if detail else ""))
    return ok


class Recorder:
    """Stands in for ExpoPushAdapter. Records, never sends."""
    def __init__(self):
        self.msgs: list[dict] = []

    def deliver(self, user_id: str, payload: dict) -> None:
        rows = get_db().table("device_tokens").select("token,updated_at") \
            .eq("user_id", user_id).execute().data
        tokens, dropped = push.choose_tokens(rows)
        self.msgs = [{"to": t, **payload} for t in tokens]
        self.dropped = dropped


def register(db, uid: str, token: str, device_id: str) -> None:
    """What POST /v1/me/device-token does, applied directly so the drill
    tests the same upsert the route performs."""
    from datetime import datetime, timezone
    db.table("device_tokens").upsert(
        {"user_id": uid, "device_id": device_id, "token": token, "platform": "ios",
         "updated_at": datetime.now(timezone.utc).isoformat()},
        on_conflict="user_id,device_id").execute()
    db.table("device_tokens").delete().eq("user_id", uid) \
        .eq("token", token).neq("device_id", device_id).execute()


def rows_for(db, uid: str) -> list[dict]:
    return db.table("device_tokens").select("*").eq("user_id", uid).execute().data


def scratch_user(db) -> tuple[str, str]:
    url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    email = f"devicedrill+{uuid.uuid4().hex[:10]}@voyageos.dev"
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


def main() -> int:
    db = get_db()
    print(f"  target: {os.environ.get('SUPABASE_URL')}")
    if "--confirm" not in sys.argv:
        print("  dry run — pass --confirm to write. Dev only.")
        return 0
    try:
        db.table("device_tokens").select("device_id").limit(1).execute()
    except Exception as e:
        print(f"\n  ✗ device_id column missing — apply 0025 first.\n    {e}")
        return 2

    real, real_email = scratch_user(db)
    print(f"  scratch user {real[:8]}…  {real_email}\n")
    original, recorder = worker.adapter, Recorder()
    worker.adapter = recorder
    try:
        # ── 1 · a device keeps one row across token changes ──────────────
        print("  1 · same device, new token")
        d1 = str(uuid.uuid4())
        register(db, real, "ExponentPushToken[aaaaaaaaaaaaaaaaaaaa]", d1)
        check("first registration makes one row", len(rows_for(db, real)) == 1)

        register(db, real, "ExponentPushToken[bbbbbbbbbbbbbbbbbbbb]", d1)
        rows = rows_for(db, real)
        check("re-registering REPLACES it, not adds", len(rows) == 1, f"rows={len(rows)}")
        check("and the row holds the NEW token",
              rows[0]["token"].endswith("bbbb]"), rows[0]["token"][-12:])

        for i in range(4):                      # four more app updates
            register(db, real, f"ExponentPushToken[cc{i:018d}]", d1)
        check("four more updates still leave one row", len(rows_for(db, real)) == 1,
              f"rows={len(rows_for(db, real))}")

        # ── 2 · different devices are different rows ─────────────────────
        print("\n  2 · a second device")
        d2 = str(uuid.uuid4())
        register(db, real, "ExponentPushToken[dddddddddddddddddddd]", d2)
        check("a new device_id adds a row", len(rows_for(db, real)) == 2)

        # A token that migrates to another device_id must not leave a ghost.
        register(db, real, "ExponentPushToken[dddddddddddddddddddd]", d1)
        rows = rows_for(db, real)
        check("a token moving device leaves no duplicate", len(rows) == 1,
              f"rows={len(rows)}")

        # ── 3 · the cap ──────────────────────────────────────────────────
        print(f"\n  3 · eight devices → {push.MAX_DEVICES_PER_USER} messages")
        db.table("device_tokens").delete().eq("user_id", real).execute()
        for i in range(8):
            register(db, real, f"ExponentPushToken[ee{i:018d}]", str(uuid.uuid4()))
        check("eight rows exist", len(rows_for(db, real)) == 8)

        recorder.deliver(real, {"title": "Laundry tonight?", "body": "…"})
        check(f"but only {push.MAX_DEVICES_PER_USER} messages are built",
              len(recorder.msgs) == push.MAX_DEVICES_PER_USER, f"built={len(recorder.msgs)}")
        check("and the drop is reported, not silent", recorder.dropped == 3,
              f"dropped={recorder.dropped}")
        check("no message is sent twice to one token",
              len({m["to"] for m in recorder.msgs}) == len(recorder.msgs))
    finally:
        worker.adapter = original
        drop_scratch_user(real)
        print("\n    scratch user deleted (cascades its tokens)")

    print(f"\n  {'✓ ALL CHECKS PASSED' if ok_all else '✗ SOMETHING FAILED'}")
    return 0 if ok_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
