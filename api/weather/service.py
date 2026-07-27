"""Weather service (Part 1 §12): ingest → rules → quiet apply → governed notify.

Silence is a feature: no forecast → no guesses; item already covered → no
duplicate; insight already notified → no repeat. Every applied item carries
source='weather' and a reason citing concrete provider data.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from api.weather import provider
from api.weather.rules import RULESET, evaluate


def _first_destination(db, trip_id: str) -> dict | None:
    rows = db.table("destinations").select("*").eq("trip_id", trip_id) \
        .order("seq").limit(1).execute().data
    return rows[0] if rows else None


def _ensure_coords(db, dest: dict) -> dict | None:
    if dest.get("lat") is not None and dest.get("lng") is not None:
        return dest
    coords = provider.geocode(dest["place_name"], dest.get("country_code"))
    if not coords:
        return None
    lat, lng = coords
    db.table("destinations").update({"lat": lat, "lng": lng}).eq("id", dest["id"]).execute()
    return {**dest, "lat": lat, "lng": lng}


def _upsert_snapshots(db, dest_id: str, days: list[dict]) -> int:
    """Atomic upsert on (destination_id, forecast_date) — concurrent refreshes
    (double-taps, job overlap) can no longer race into a unique-violation 500."""
    if not days:
        return 0
    now = datetime.now(timezone.utc).isoformat()
    rows = [{
        "destination_id": dest_id, "forecast_date": d["date"],
        "provider": d.get("provider", provider.PROVIDER),
        "temp_min": d["temp_min"], "temp_max": d["temp_max"],
        "precip_prob": d["precip_prob"], "wind_kph": d["wind_kph"],
        "payload": {"uv": d["uv"], "ruleset": RULESET}, "fetched_at": now,
    } for d in days]
    db.table("weather_snapshots").upsert(
        rows, on_conflict="destination_id,forecast_date").execute()
    return len(rows)


def load_snapshots(db, trip: dict) -> tuple[dict | None, list[dict]]:
    dest = _first_destination(db, trip["id"])
    if not dest:
        return None, []
    rows = db.table("weather_snapshots").select("*").eq("destination_id", dest["id"]) \
        .gte("forecast_date", trip["start_date"]).lte("forecast_date", trip["end_date"]) \
        .order("forecast_date").execute().data
    days = [{"date": r["forecast_date"], "temp_max": r["temp_max"], "temp_min": r["temp_min"],
             "precip_prob": r["precip_prob"], "wind_kph": r["wind_kph"],
             "uv": (r.get("payload") or {}).get("uv"),
             "provider": r.get("provider")} for r in rows]
    return dest, days


def _catalog_id(db, name: str) -> str | None:
    rows = db.table("items").select("id").is_("owner_id", "null") \
        .ilike("name", name).limit(1).execute().data
    return rows[0]["id"] if rows else None


def _apply_insights(db, trip: dict, insights: list[dict]) -> dict:
    """Adds only genuinely-missing items to the latest list. Dedupe by term
    containment, so the model's 'Sunscreen SPF 50' blocks our 'Sunscreen'."""
    lists = db.table("packing_lists").select("id").eq("trip_id", trip["id"]) \
        .order("generated_at", desc=True).limit(1).execute().data
    if not lists:
        return {"applied": [], "covered": [k["key"] for k in insights], "items_added": 0}
    list_id = lists[0]["id"]
    existing = [r["name"].lower() for r in
                db.table("packing_list_items").select("name").eq("list_id", list_id).execute().data]

    applied, covered, rows = [], [], []
    for ins in insights:
        added_here = 0
        for item in ins["items"]:
            terms = [t.lower() for t in item["dedupe"]] + [item["name"].lower()]
            if any(term in name for name in existing for term in terms):
                continue
            rows.append({
                "list_id": list_id, "item_id": _catalog_id(db, item["name"]),
                "name": item["name"], "category": item["category"], "qty": item["qty"],
                "status": "suggested", "source": "weather",
                "reason": ins["reason"], "confidence": 0.9, "sort": 998,
            })
            existing.append(item["name"].lower())
            added_here += 1
        (applied if added_here else covered).append(ins["key"])
    if rows:
        db.table("packing_list_items").insert(rows).execute()
    return {"applied": applied, "covered": covered, "items_added": len(rows)}


def _trip_tz(db, trip_id: str) -> str:
    rows = db.table("notification_schedule").select("tz_name").eq("trip_id", trip_id) \
        .not_.is_("tz_name", "null").limit(1).execute().data
    return rows[0]["tz_name"] if rows else "UTC"


def notify_send_at(start_date: date, tz_name: str, now_utc: datetime) -> datetime:
    """The actionable moment (§12): held to T-3 18:00 local; immediate inside T-3."""
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
    t3 = datetime.combine(start_date - timedelta(days=3), time(18, 0), tzinfo=tz) \
        .astimezone(timezone.utc)
    return max(now_utc + timedelta(seconds=30), t3) if t3 > now_utc \
        else now_utc + timedelta(seconds=30)


def _queue_notifications(db, trip: dict, user_id: str,
                         insights: list[dict], applied_keys: list[str]) -> int:
    queued = 0
    tz_name = _trip_tz(db, trip["id"])
    now_utc = datetime.now(timezone.utc)
    for ins in insights:
        if ins["key"] not in applied_keys:
            continue  # quiet diff: nothing new on the list → no ping
        idem = f"wx:{trip['id']}:{ins['key']}"
        if db.table("notification_schedule").select("id").eq("idem_key", idem).execute().data:
            continue  # already told them once — cooldown by construction
        db.table("notification_schedule").insert({
            "user_id": user_id, "trip_id": trip["id"], "channel": "push",
            "class": "weather", "topic": f"weather:{ins['key']}:{trip['id'][:8]}",
            "send_at": notify_send_at(date.fromisoformat(trip["start_date"]),
                                      tz_name, now_utc).isoformat(),
            "local_time": "18:00", "tz_name": tz_name,
            "payload": {"title": ins["reason"][:30],
                        "body": f"Added to your {trip['title']} list — open to review."[:110]},
            "status": "pending", "idem_key": idem,
        }).execute()
        queued += 1
    return queued


def _fresh_enough(db, dest_id: str, hours: int = 3) -> bool:
    rows = db.table("weather_snapshots").select("fetched_at").eq("destination_id", dest_id) \
        .order("fetched_at", desc=True).limit(1).execute().data
    if not rows:
        return False
    age = datetime.now(timezone.utc) - datetime.fromisoformat(rows[0]["fetched_at"])
    return age < timedelta(hours=hours)


def refresh_trip(db, trip: dict, user_id: str, *, force: bool = True) -> dict:
    dest = _first_destination(db, trip["id"])
    if not dest:
        return {"ok": False, "note": "Trip has no destination."}
    dest = _ensure_coords(db, dest)
    if not dest:
        return {"ok": False, "note": f"Could not locate '{trip['title']}' destination — "
                                     "check the place name."}
    if force or not _fresh_enough(db, dest["id"]):
        days = provider.fetch_daily(dest["lat"], dest["lng"],
                                    date.fromisoformat(trip["start_date"]),
                                    date.fromisoformat(trip["end_date"]))
        snap_count = _upsert_snapshots(db, dest["id"], days) if days else 0
    else:
        snap_count = 0  # fresh cache — provider spared (rate-limit hygiene)
    _, trip_days = load_snapshots(db, trip)
    if not [d for d in trip_days if d.get("provider") != "climatology"]:
        clim = provider.fetch_climatology(dest["lat"], dest["lng"],
                                          date.fromisoformat(trip["start_date"]),
                                          date.fromisoformat(trip["end_date"]))
        if clim:
            _upsert_snapshots(db, dest["id"], clim)
            _, trip_days = load_snapshots(db, trip)
    forecast_days = [d for d in trip_days if d.get("provider") != "climatology"]
    insights = evaluate(forecast_days, dest["place_name"])
    result = _apply_insights(db, trip, insights)
    queued = _queue_notifications(db, trip, user_id, insights, result["applied"])
    return {"ok": True, "place": dest["place_name"], "snapshots": snap_count,
            "days_in_range": len([d for d in trip_days if d.get("provider") != "climatology"]),
            "insights": [{"key": i["key"], "reason": i["reason"]} for i in insights],
            "applied": result["applied"], "covered": result["covered"],
            "items_added": result["items_added"], "notifications_queued": queued,
            "note": ("Forecast window hasn't reached this trip yet — I'll keep checking."
                     if not [d for d in trip_days if d.get("provider") != "climatology"] else None)}
