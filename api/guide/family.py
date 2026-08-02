"""Party Play — a dedicated, richer generation for the trip's travel party.
Its own model call so it can be detailed without truncating the main guide.
Per-activity fit across the selected cohorts (solo/partner/adults/teens/
elderly, plus kid age bands), logistics, and an honest verdict.
"""
import json

from api.ai_gateway import gateway
from api.guide.service import _parse, _s

# bumped from family-v1: payload now carries dynamic cohorts, not fixed kid bands
FAMILY_PLAY_VERSION = "party-v2"

# Every cohort we can rate, with the definition fed to the model. Order here
# fixes both prompt order and display order. 'kids' is NOT here — it expands
# into the three under-13 bands so it can coexist with a separate 'teens' pick.
COHORT_DEFS = {
    "toddlers": "toddlers aged 0-3",
    "young":    "young kids aged 4-7",
    "older":    "older kids aged 8-12",
    "teens":    "teenagers aged 13-17",
    "solo":     "a solo adult traveler",
    "partner":  "a couple traveling together",
    "adults":   "a group of adults",
    "elderly":  "elderly travelers who want a gentle pace, seating, and low mobility demands",
}
_ORDER = ("toddlers", "young", "older", "teens", "solo", "partner", "adults", "elderly")
_FIT = {"great", "okay", "skip"}


def cohorts_for(trip: dict) -> list[str]:
    """The cohorts to rate for this trip, from its selected traveler_types.
    'kids' expands into the three under-13 bands. Falls back gracefully for
    legacy trips created before traveler_types existed."""
    types = trip.get("traveler_types") or []
    if not types:
        if trip.get("with_kids"):            # legacy kids trip
            return ["toddlers", "young", "older", "teens"]
        return ["adults"]
    picked: set[str] = set()
    for t in types:
        if t == "kids":
            picked.update(("toddlers", "young", "older"))
        elif t in COHORT_DEFS:
            picked.add(t)
    return [c for c in _ORDER if c in picked] or ["adults"]


def _build_prompt(cohorts: list[str]) -> str:
    party = "\n".join(f"   - {c}: {COHORT_DEFS[c]}" for c in cohorts)
    keys = ",".join(f'"{c}":"great|okay|skip"' for c in cohorts)
    return f"""You are VoyageOS's activities planner. For the destination, suggest
experiences and rate each for the travel party below. Output ONLY valid JSON, no prose:
{{"activities":[{{
  "name":"...","note":"one line: what it is",
  "bands":{{{keys}}},
  "duration":"e.g. 2-3 hours","price":2,
  "indoor":"indoor|outdoor|mixed","stroller":true,
  "food_onsite":true,"booking":"walk-up|book ahead|either",
  "verdict":"honest one-line real-talk for this party"}}]}}

PARTY — rate every activity for each of these, using the "bands" keys shown:
{party}

RULES
1. 5-7 activities, best-fit-for-this-party FIRST.
2. great = genuinely good for that cohort; okay = works with caveats; skip = unsuitable or dull for them.
3. price: 1=cheap .. 4=expensive.
4. verdict is real talk, not marketing — name the catch (heat, queues, pace, cost, mobility, nap timing).
5. Impressions for orientation only. NEVER invent exact prices, hours, or booking rules.
6. Keep every string under 120 characters."""


def sanitize_family_play(raw: dict, cohorts: list[str]) -> dict:
    acts = []
    for item in (raw.get("activities") or [])[:8]:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        b = item.get("bands") or {}
        bands = {k: (b.get(k) if b.get(k) in _FIT else "okay") for k in cohorts}
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
    return {"activities": acts, "version": FAMILY_PLAY_VERSION, "cohorts": cohorts}


def generate_family_play(db, trip: dict, user_id: str, *, regenerate: bool = False) -> dict:
    tid = trip["id"]
    cohorts = cohorts_for(trip)
    if not regenerate:
        cached = db.table("trip_family_play").select("payload").eq("trip_id", tid).limit(1).execute().data
        if cached:
            pay = cached[0].get("payload") or {}
            # reuse only if it's the current version AND rated for the same party;
            # otherwise fall through and regenerate (party changed, or legacy payload)
            if pay.get("activities") and pay.get("version") == FAMILY_PLAY_VERSION and pay.get("cohorts") == cohorts:
                return pay
    dests = db.table("destinations").select("place_name,country_code") \
        .eq("trip_id", tid).order("seq").limit(1).execute().data
    place = dests[0]["place_name"] if dests else trip.get("title", "")
    country = dests[0].get("country_code") if dests else ""
    gateway.check_budget(db, user_id)
    ctx = {"place": place, "country": country, "month": str(trip.get("start_date", ""))[:7],
           "party": cohorts}
    result = gateway.complete("family_play", _build_prompt(cohorts), json.dumps(ctx),
                              db=db, user_id=user_id)
    data = sanitize_family_play(_parse(result.text), cohorts)
    db.table("trip_family_play").upsert({
        "trip_id": tid, "payload": data, "model": result.model,
    }).execute()
    return data
