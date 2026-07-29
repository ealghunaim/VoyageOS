"""Family Play — a dedicated, richer generation for trips traveling with kids.
Its own model call so it can be detailed without truncating the main guide.
Per-activity fit across four age bands, logistics, and an honest verdict."""
import json

from api.ai_gateway import gateway
from api.guide.service import _parse, _s

FAMILY_PLAY_VERSION = "family-v1"

FAMILY_PLAY_PROMPT = """You are VoyageOS's family activities planner. For the destination, suggest
experiences and rate each for four age bands. Output ONLY valid JSON, no prose:
{"activities":[{
  "name":"...","note":"one line: what it is",
  "bands":{"toddlers":"great|okay|skip","young":"great|okay|skip",
           "older":"great|okay|skip","teens":"great|okay|skip"},
  "duration":"e.g. 2-3 hours","price":2,
  "indoor":"indoor|outdoor|mixed","stroller":true,
  "food_onsite":true,"booking":"walk-up|book ahead|either",
  "verdict":"honest one-line real-talk for parents"}]}

RULES
1. 5-7 activities, most family-friendly FIRST.
2. Age bands: toddlers 0-3, young kids 4-7, older kids 8-12, teens 13-17.
   great = genuinely good; okay = works with caveats; skip = unsuitable or boring for that age.
3. price: 1=cheap .. 4=expensive, family-of-four feel.
4. verdict is real talk, not marketing — name the catch (heat, queues, nap timing, cost).
5. Impressions for orientation only. NEVER invent exact prices, hours, or booking rules.
6. Keep every string under 120 characters."""

_BANDS = ("toddlers", "young", "older", "teens")
_FIT = {"great", "okay", "skip"}


def sanitize_family_play(raw: dict) -> dict:
    acts = []
    for item in (raw.get("activities") or [])[:8]:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        b = item.get("bands") or {}
        bands = {k: (b.get(k) if b.get(k) in _FIT else "okay") for k in _BANDS}
        rawp = item.get("price")
        try:
            price = int(rawp) if rawp is not None else 2
        except (TypeError, ValueError):
            price = 2
        indoor = item.get("indoor") if item.get("indoor") in ("indoor", "outdoor", "mixed") else "mixed"
        acts.append({
            "name": _s(item.get("name"), 60), "note": _s(item.get("note")),
            "bands": bands, "duration": _s(item.get("duration"), 30),
            "price": max(1, min(4, price)), "indoor": indoor,
            "stroller": bool(item.get("stroller")), "food_onsite": bool(item.get("food_onsite")),
            "booking": _s(item.get("booking"), 20), "verdict": _s(item.get("verdict"), 120),
        })
    return {"activities": acts, "version": FAMILY_PLAY_VERSION}


def generate_family_play(db, trip: dict, user_id: str, *, regenerate: bool = False) -> dict:
    tid = trip["id"]
    if not regenerate:
        cached = db.table("trip_family_play").select("payload").eq("trip_id", tid).limit(1).execute().data
        if cached and cached[0].get("payload", {}).get("activities"):
            return cached[0]["payload"]
    dests = db.table("destinations").select("place_name,country_code").eq("trip_id", tid).execute().data
    place = dests[0]["place_name"] if dests else trip.get("title", "")
    country = dests[0].get("country_code") if dests else ""
    gateway.check_budget(db, user_id)
    ctx = {"place": place, "country": country, "month": str(trip.get("start_date", ""))[:7]}
    result = gateway.complete("family_play", FAMILY_PLAY_PROMPT, json.dumps(ctx),
                              db=db, user_id=user_id, max_tokens=4000)
    data = sanitize_family_play(_parse(result.text))
    db.table("trip_family_play").upsert({
        "trip_id": tid, "payload": data, "model": result.model,
    }).execute()
    return data
