"""The moat's plumbing (Part 2 F2.4): writes to item_events, reads history flags.

aggregate() is pure and tested; the db wrappers are thin.
v1.0's materialized user_item_stats view replaces the in-Python fold later.
"""
from __future__ import annotations


def aggregate(rows: list[dict]) -> dict:
    """rows: item_events newest-first → the flags the generator consumes."""
    forgot: dict[str, str] = {}
    unused_counts: dict[str, int] = {}
    for r in rows:
        name = r["item_name"]
        if r["event"] == "forgot" and name not in forgot:
            forgot[name] = (r.get("noted_at") or "")[:10]
        elif r["event"] == "unused":
            unused_counts[name] = unused_counts.get(name, 0) + 1
    return {
        "previously_forgot": [{"name": n, "on": d} for n, d in list(forgot.items())[:10]],
        "often_unused": sorted(n for n, c in unused_counts.items() if c >= 2)[:10],
    }


def history_flags(db, user_id: str) -> dict:
    rows = db.table("item_events").select("item_name,event,noted_at") \
        .eq("user_id", user_id).order("noted_at", desc=True).limit(500).execute().data
    return aggregate(rows)


def _catalog_id(db, name: str) -> str | None:
    rows = db.table("items").select("id").is_("owner_id", "null") \
        .ilike("name", name).limit(1).execute().data
    return rows[0]["id"] if rows else None


def submit_debrief(db, trip: dict, user_id: str,
                   forgot: list[str], unused: list[str]) -> dict:
    events = []
    for name in forgot:
        events.append({"user_id": user_id, "trip_id": trip["id"], "event": "forgot",
                       "item_name": name.strip()[:60], "item_id": _catalog_id(db, name)})
    for name in unused:
        events.append({"user_id": user_id, "trip_id": trip["id"], "event": "unused",
                       "item_name": name.strip()[:60], "item_id": _catalog_id(db, name)})

    # packed items become 'packed' events — times_packed feeds future stats
    lists = db.table("packing_lists").select("id").eq("trip_id", trip["id"]) \
        .order("generated_at", desc=True).limit(1).execute().data
    packed_count = 0
    if lists:
        packed = db.table("packing_list_items").select("name,item_id") \
            .eq("list_id", lists[0]["id"]).eq("status", "packed").execute().data
        for p in packed:
            events.append({"user_id": user_id, "trip_id": trip["id"], "event": "packed",
                           "item_name": p["name"], "item_id": p.get("item_id")})
        packed_count = len(packed)

    if events:
        db.table("item_events").insert(events).execute()
    db.table("trips").update({"status": "completed"}).eq("id", trip["id"]).execute()

    return {"forgot": len(forgot), "unused": len(unused), "packed_recorded": packed_count,
            "promise": "Noted — your next trip will flag these."}
