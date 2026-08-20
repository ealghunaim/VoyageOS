"""Exercise the trip lock against dev, through the HTTP surface.

    set -a; . ./.env; set +a
    .venv/bin/python scripts/lock_check.py

Through HTTP deliberately, not by calling may_write(). The seam is only worth
anything if the ROUTES go through it, and the bug it exists to prevent — a
write that reaches the database without asking — is invisible to a test that
asks the seam directly. update_item is the case in point: it was a mutating
route that never declared itself, and no unit test could have noticed.

Creates its own trip and removes it afterwards.
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.core.db import get_db                        # noqa: E402

bad = 0


def check(label, got, want):
    global bad
    ok = got == want
    if not ok:
        bad += 1
    print(f"  {'✓' if ok else '✗'} {label}" + ("" if ok else f"   got {got!r} want {want!r}"))


db = get_db()
assert "phrimm" in os.environ["SUPABASE_URL"], "NOT DEV — refusing"
URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
uid = os.environ["DEV_USER_ID"]
API = "http://localhost:8000"

tok = json.load(urllib.request.urlopen(urllib.request.Request(
    f"{URL}/auth/v1/token?grant_type=password", method="POST",
    headers={"apikey": KEY, "Content-Type": "application/json"},
    data=json.dumps({"email": "dev@voyageos.dev",
                     "password": "meadow-ember-9899"}).encode())))["access_token"]


def call(method, path, body=None):
    """→ (status, json). Never raises: the status IS the assertion."""
    req = urllib.request.Request(
        f"{API}{path}", method=method,
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body is not None else None)
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return r.status, (json.load(r) if r.status != 204 else None)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, None


trip = None
try:
    trip = db.table("trips").insert(
        {"owner_id": uid, "title": "__lock check", "status": "upcoming",
         "start_date": "2026-07-01", "end_date": "2026-07-08"}).execute().data[0]
    tid = trip["id"]
    lid = db.table("packing_lists").insert({"trip_id": tid}).execute().data[0]["id"]
    item = db.table("packing_list_items").insert(
        {"list_id": lid, "name": "Boots", "category": "footwear",
         "qty": 1, "source": "ai"}).execute().data[0]

    print("\n  ── open trip: everything works ──")
    check("plan write allowed", call("PATCH", f"/v1/trips/{tid}", {"title": "__lock check"})[0], 200)
    check("record write allowed", call("POST", f"/v1/trips/{tid}/notes", {"body": "open"})[0], 201)

    print("\n  ── lock it ──")
    st, body = call("POST", f"/v1/trips/{tid}/lock", {"locked": True})
    check("lock returns 200", st, 200)
    first_lock = body.get("locked_at") if body else None
    check("locked_at is set", bool(first_lock), True)

    print("\n  ── PLAN scope is refused ──")
    for label, method, path, payload in [
        ("patch_trip",     "PATCH",  f"/v1/trips/{tid}", {"title": "nope"}),
        ("add_plan_item",  "POST",   f"/v1/trips/{tid}/plan", {"day": 1, "title": "nope"}),
        ("add_destination","POST",   f"/v1/trips/{tid}/destinations", {"place_name": "Nope"}),
        ("set_bag",        "PUT",    f"/v1/trips/{tid}/bag", {"limit_g": 9000}),
    ]:
        st, b = call(method, path, payload)
        detail = (b or {}).get("detail") if isinstance(b, dict) else None
        code = detail.get("code") if isinstance(detail, dict) else f"detail={detail!r}"
        check(f"{label} → 423 locked", (st, code), (423, "locked"))

    print("\n  ── content edit on an item is PLAN, and refused ──")
    check("update_item weight_g → 423",
          call("PATCH", f"/v1/packing-items/{item['id']}", {"weight_g": 250})[0], 423)

    print("\n  ── RECORD scope still passes ──")
    check("journal entry allowed",
          call("POST", f"/v1/trips/{tid}/notes", {"body": "written after closing"})[0], 201)
    check("ticking an item packed allowed",
          call("PATCH", f"/v1/packing-items/{item['id']}", {"status": "packed"})[0], 200)
    st, _ = call("POST", f"/v1/trips/{tid}/debrief",
                 {"forgot": ["Towel"], "unused": [], "confirm_early": True})
    check("debrief on a locked trip allowed", st, 201)

    print("\n  ── debrief on a locked trip still REPLACES ──")
    n1 = db.table("item_events").select("id", count="exact").eq("trip_id", tid).execute().count
    st, b = call("POST", f"/v1/trips/{tid}/debrief",
                 {"forgot": ["Towel"], "unused": [], "confirm_early": True})
    n2 = db.table("item_events").select("id", count="exact").eq("trip_id", tid).execute().count
    check("second debrief replaced rather than added", (st, n1, n2), (201, n1, n1))
    check("and said so", (b or {}).get("replaced_previous", 0) > 0, True)

    print("\n  ── a mixed patch is treated as PLAN ──")
    check("status + weight together → 423",
          call("PATCH", f"/v1/packing-items/{item['id']}",
               {"status": "packed", "weight_g": 300})[0], 423)

    print("\n  ── unlock restores ──")
    check("unlock returns 200", call("POST", f"/v1/trips/{tid}/lock", {"locked": False})[0], 200)
    check("plan write allowed again",
          call("PATCH", f"/v1/trips/{tid}", {"title": "__lock check"})[0], 200)
    ev = db.table("item_events").select("id", count="exact").eq("trip_id", tid).execute().count
    check("unlock did NOT undo the debrief", ev > 0, True)

    print("\n  ── relock keeps the LATEST timestamp ──")
    st, b2 = call("POST", f"/v1/trips/{tid}/lock", {"locked": True})
    check("relocked", st, 200)
    check("locked_at moved forward", (b2 or {}).get("locked_at") != first_lock, True)

    print("\n  ── client and server AGREE on what 'active' means ──")
    #
    # The drift test, applied across the wire. These are two codebases in two
    # languages answering one question, and they disagreed for two phases:
    # active_trip_count excluded locked trips from the tier limit while
    # classify() had never heard of locked_at, so closing a trip out freed a
    # slot and left it sitting under Upcoming.
    #
    # Asserted from BOTH ends: the server's count is measured by calling it,
    # and the client's rule is read out of its source — there is no way to
    # execute TypeScript from here, and asserting the predicate is still
    # stronger than assuming it.
    call("POST", f"/v1/trips/{tid}/lock", {"locked": True})
    sub = call("GET", "/v1/subscription")[1] or {}
    locked_counted = sub.get("trips_used", 0)
    call("POST", f"/v1/trips/{tid}/lock", {"locked": False})
    sub2 = call("GET", "/v1/subscription")[1] or {}
    check("server: locking removes the trip from trips_used",
          sub2.get("trips_used", 0) - locked_counted, 1)

    ts = (pathlib.Path(__file__).resolve().parents[1]
          / "app" / "src" / "tripStatus.ts").read_text()
    classify_src = ts[ts.index("export function classify"):]
    classify_src = classify_src[:classify_src.index("\n}")]
    check("client: classify() treats locked_at as finished",
          "trip.locked_at" in classify_src, True)
    check("client: it does so BEFORE consulting the calendar",
          classify_src.index("trip.locked_at") < classify_src.index("daysUntilDay"), True)

    call("POST", f"/v1/trips/{tid}/lock", {"locked": True})

    print("\n  ── delete is never trapped by a lock ──")
    check("delete on a locked trip allowed", call("DELETE", f"/v1/trips/{tid}")[0], 204)
    gone = db.table("trips").select("id", count="exact").eq("id", tid).execute().count
    check("trip is gone", gone, 0)
    trip = None

finally:
    if trip:
        db.table("item_events").delete().eq("trip_id", trip["id"]).execute()
        db.table("trips").delete().eq("id", trip["id"]).execute()
        print("\n  cleaned up")

print(f"\n  {'✓ all cases behave' if bad == 0 else f'✗ {bad} wrong'}\n")
sys.exit(0 if bad == 0 else 1)
