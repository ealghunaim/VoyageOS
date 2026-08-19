"""Exercise kit-apply against dev, end to end.

    set -a; . ./.env; set +a
    .venv/bin/python scripts/kit_apply_check.py

Not a unit test. The behaviour that matters here — does a second apply merge
again — only exists once rows are actually in a database, and the bug it
guards against (a kit that keeps inflating quantities every time it is tapped)
is invisible to anything that stubs the store out.

Creates its own kit, list rows and trip state, and removes them afterwards.
"""
import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.core.db import get_db                        # noqa: E402
from api.packing.limits import MAX_QTY                # noqa: E402

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

tok = json.load(urllib.request.urlopen(urllib.request.Request(
    f"{URL}/auth/v1/token?grant_type=password", method="POST",
    headers={"apikey": KEY, "Content-Type": "application/json"},
    data=json.dumps({"email": "dev@voyageos.dev",
                     "password": "meadow-ember-9899"}).encode())))["access_token"]

# A trip of our own, so the assertions read the rows we put there. Reusing a
# real trip's list meant an existing "Socks" row absorbed the merge while the
# checks inspected ours — the test agreeing with itself about the wrong row.
trip = db.table("trips").insert(
    {"owner_id": uid, "title": "__check trip", "status": "upcoming",
     "start_date": "2027-06-01", "end_date": "2027-06-08"}).execute().data[0]
list_id = db.table("packing_lists").insert({"trip_id": trip["id"]}).execute().data[0]["id"]

made_items, made_rows, kit = [], [], None


def apply_kit():
    req = urllib.request.Request(
        f"http://localhost:8000/v1/gear-profiles/{kit['id']}/apply/{trip['id']}",
        method="POST", headers={"Authorization": f"Bearer {tok}"})
    return json.load(urllib.request.urlopen(req, timeout=30))


def row(name):
    r = db.table("packing_list_items").select("qty,source,item_id,weight_g") \
        .eq("list_id", list_id).eq("name", name).execute().data
    return r[0] if r else None


try:
    kit = db.table("gear_profiles").insert(
        {"user_id": uid, "name": "__check kit"}).execute().data[0]

    # Three shapes, chosen for what each proves:
    #   Socks       — matches an existing row EXACTLY: merges 4+3
    #   Sunscreen   — matches only after normalisation ("Sunscreen " vs
    #                 "sunscreen"), which name.lower() would have missed
    #   Headlamp    — matches nothing: a plain insert
    #   Water purif — existing qty already at the ceiling: merge must cap
    spec = [("Socks", "clothing", 3, 200),
            ("Sunscreen", "toiletries", 1, 90),
            ("Headlamp", "activity_gear", 1, 80),
            ("Water purification tablets", "medications", 5, None)]
    for name, cat, qty, weight in spec:
        it = db.table("items").insert(
            {"owner_id": uid, "name": name, "category": cat,
             "default_weight_g": weight}).execute().data[0]
        made_items.append(it["id"])
        db.table("gear_profile_items").insert(
            {"profile_id": kit["id"], "item_id": it["id"], "qty": qty}).execute()

    # Pre-existing list rows the kit will meet.
    pre = [{"list_id": list_id, "name": "Socks", "category": "clothing",
            "qty": 4, "source": "ai", "weight_g": 150},          # weight already set
           {"list_id": list_id, "name": "sunscreen ", "category": "toiletries",
            "qty": 1, "source": "ai"},                           # blank weight
           {"list_id": list_id, "name": "Water purification tablets",
            "category": "medications", "qty": MAX_QTY - 2, "source": "ai"}]
    for r in db.table("packing_list_items").insert(pre).execute().data:
        made_rows.append(r["id"])

    print("\n  ── first apply ──")
    a = apply_kit()
    print(f"    {a}")
    check("Headlamp inserted", a["added"], 1)
    check("three matched", a["already_there"], 3)
    check("all three merged", a["merged"], 3)
    check("nothing skipped yet", a["skipped"], 0)
    check("one capped", a["capped"], 1)
    check("INVARIANT already_there == merged + skipped",
          a["already_there"], a["merged"] + a["skipped"])
    check("INVARIANT capped is a subset of merged", a["capped"] <= a["merged"], True)

    print("\n  ── what actually happened to the rows ──")
    check("Socks 4+3 → 7", row("Socks")["qty"], 7)
    check("normalised match merged (not duplicated)", row("sunscreen ")["qty"], 2)
    check("merge capped at the ceiling",
          row("Water purification tablets")["qty"], MAX_QTY)
    check("list weight wins — kit did not overwrite 150g",
          row("Socks")["weight_g"], 150)
    check("kit fills a blank weight", row("sunscreen ")["weight_g"], 90)
    check("merged row is stamped as kit-sourced", row("Socks")["source"], "profile")

    print("\n  ── re-apply twice: merging must not keep inflating ──")
    for n in (2, 3):
        b = apply_kit()
        print(f"    apply #{n}: {b}")
        check(f"#{n} added nothing", b["added"], 0)
        check(f"#{n} merged nothing", b["merged"], 0)
        check(f"#{n} all four skipped", b["skipped"], 4)
        check(f"#{n} already_there == merged + skipped",
              b["already_there"], b["merged"] + b["skipped"])
    check("Socks still 7 after three applies", row("Socks")["qty"], 7)
    check("capped row still at the ceiling",
          row("Water purification tablets")["qty"], MAX_QTY)

    print("\n  ── the conflicts array carries what the Review sheet needs ──")
    c = {x["name"]: x for x in a["conflicts"]}
    check("Socks reports the arithmetic",
          (c["Socks"]["from_qty"], c["Socks"]["added_qty"], c["Socks"]["to_qty"]),
          (4, 3, 7))
    check("capped entry says so",
          c["Water purification tablets"].get("capped_at"), MAX_QTY)

finally:
    if made_rows or kit:
        names = [s[0] for s in
                 [("Socks",), ("sunscreen ",), ("Headlamp",),
                  ("Water purification tablets",)]]
        got = db.table("packing_list_items").select("id,name") \
            .eq("list_id", list_id).in_("name", names).execute().data
        if got:
            db.table("packing_list_items").delete() \
                .in_("id", [g["id"] for g in got]).execute()
    if kit:
        db.table("gear_profiles").delete().eq("id", kit["id"]).execute()
    if made_items:
        db.table("items").delete().in_("id", made_items).execute()
    db.table("trips").delete().eq("id", trip["id"]).execute()   # cascades the list
    print("\n  cleaned up")

print(f"\n  {'✓ all cases behave' if bad == 0 else f'✗ {bad} wrong'}\n")
sys.exit(0 if bad == 0 else 1)
