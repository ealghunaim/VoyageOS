"""Ask this trip — grounded Q&A. Small model, trip context only, law-5 aware."""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.ai_gateway import gateway
from api.core.auth import current_user_id
from api.core.db import get_db

router = APIRouter(prefix="/v1/trips", tags=["qa"])

ASK_PROMPT = """You are VoyageOS's trip assistant. Answer the traveler's question using the
provided trip context plus general travel knowledge. Rules:
- NEVER state visa, vaccination, customs, or airline regulations — say "check the Know tab's
  official links" for those.
- If the context doesn't cover it (e.g. weather beyond the provided days), say so plainly.
- Be concrete and calm. Max 120 words. Plain text, no markdown."""


class Ask(BaseModel):
    question: str = Field(min_length=3, max_length=300)


@router.post("/{trip_id}/ask")
def ask(trip_id: str, body: Ask, user_id: str = Depends(current_user_id)):
    db = get_db()
    trips = db.table("trips").select("*").eq("id", trip_id).eq("owner_id", user_id).execute().data
    if not trips:
        raise HTTPException(404, "Trip not found")
    trip = trips[0]
    dests = db.table("destinations").select("place_name,country_code") \
        .eq("trip_id", trip_id).order("seq").limit(1).execute().data
    wx = db.table("weather_snapshots").select("forecast_date,temp_min,temp_max,precip_prob,provider") \
        .in_("destination_id", [d2["id"] for d2 in db.table("destinations").select("id")
             .eq("trip_id", trip_id).execute().data] or ["-"]) \
        .gte("forecast_date", trip["start_date"]).lte("forecast_date", trip["end_date"]) \
        .order("forecast_date").limit(16).execute().data
    lists = db.table("packing_lists").select("id").eq("trip_id", trip_id) \
        .order("generated_at", desc=True).limit(1).execute().data
    items = []
    if lists:
        items = [f"{r['name']}({r['status']})" for r in
                 db.table("packing_list_items").select("name,status").eq("list_id", lists[0]["id"])
                 .neq("status", "rejected").limit(60).execute().data]
    guides = db.table("trip_guides").select("payload").eq("trip_id", trip_id).limit(1).execute().data
    gpay = (guides[0].get("payload") or {}) if guides else {}
    ctx = {"trip": {"title": trip["title"], "start": trip["start_date"], "end": trip["end_date"],
                    "mode": trip.get("travel_mode"), "airline": trip.get("airline"),
                    "cabin": trip.get("cabin_class")},
           "destination": dests[0] if dests else None,
           "weather_days": wx,
           "packing": items,
           "guide_bits": {"plugs": (gpay.get("power") or {}).get("plugs"),
                          "eat": [e.get("name") for e in (gpay.get("eat") or [])[:5]],
                          "around": (gpay.get("go") or {}).get("around", [])[:3]}}
    gateway.check_budget(db, user_id)
    result = gateway.complete("trip_qa", ASK_PROMPT,
                              json.dumps({"context": ctx, "question": body.question}),
                              db=db, user_id=user_id, max_tokens=400)
    return {"answer": result.text.strip()[:1200]}
