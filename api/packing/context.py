"""Context builder (Part 2 §1.1): one canonical JSON, hashed for the generation cache."""
from __future__ import annotations

import hashlib
import json
from datetime import date

from api.history.service import history_flags
from api.weather.service import load_snapshots


def build_context(db, trip: dict, user_id: str) -> dict:
    trip_id = trip["id"]
    dests = db.table("destinations").select("place_name,country_code,seq") \
        .eq("trip_id", trip_id).order("seq").execute().data
    acts = db.table("activities").select("type,title").eq("trip_id", trip_id).execute().data

    prefs = db.table("user_preferences").select("packing_style") \
        .eq("user_id", user_id).execute().data
    style = prefs[0]["packing_style"] if prefs else "standard"

    start = date.fromisoformat(trip["start_date"])
    end = date.fromisoformat(trip["end_date"])
    duration = (end - start).days + 1

    history = history_flags(db, user_id)

    ctx = {
        "trip": {
            "travel_mode": trip.get("travel_mode"),
            "title": trip["title"], "trip_type": trip.get("trip_type"),
            "start_date": trip["start_date"], "end_date": trip["end_date"],
            "duration_days": duration, "month": start.strftime("%B"),
        },
        "destinations": dests,
        "activities": sorted({a["type"] for a in acts}),
        "traveler": {"packing_style": style},
        "laundry_available": False,  # v0.5: no accommodation data yet
        "note": "No weather data available in this version.",
    }
    if history["previously_forgot"] or history["often_unused"]:
        ctx["item_history"] = history
    _, wx_days = load_snapshots(db, trip)
    if wx_days:
        ctx["weather_daily"] = wx_days
        ctx["note"] = "weather_daily is a provider forecast (open-meteo). Treat as ground truth."
    return ctx


def context_hash(context: dict) -> str:
    canonical = json.dumps(context, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()[:32]
