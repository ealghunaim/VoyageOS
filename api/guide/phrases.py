"""Phrasebook — a small dedicated generation of useful basic phrases in the
destination's language, with English meaning and a pronunciation hint."""
import json

from api.ai_gateway import gateway
from api.guide.service import _parse, _s

PHRASES_VERSION = "phrases-v1"

PHRASES_PROMPT = """You are VoyageOS's phrasebook. For the destination's primary local language,
give the most useful basic phrases a traveler needs. Output ONLY JSON, no prose:
{"language":"e.g. Arabic (Gulf)","phrases":[
  {"en":"Hello","local":"the phrase in local script/language","pron":"simple English-letters pronunciation"}]}

RULES
1. 8-12 phrases: hello, please, thank you, yes, no, excuse me, how much is this,
   where is the bathroom, I need help, sorry, goodbye, cheers/enjoy.
2. local = the phrase written properly in the local language/script.
3. pron = how an English speaker would sound it out.
4. If the main language is English, say so and give useful local etiquette phrases/slang instead.
5. Keep every field under 60 characters."""


def sanitize_phrases(raw: dict) -> dict:
    phrases = []
    for p in (raw.get("phrases") or [])[:12]:
        if isinstance(p, dict) and (p.get("en") or p.get("local")):
            phrases.append({"en": _s(p.get("en"), 60), "local": _s(p.get("local"), 80),
                            "pron": _s(p.get("pron"), 80)})
    return {"language": _s(raw.get("language"), 40), "phrases": phrases, "version": PHRASES_VERSION}


def generate_phrases(db, trip: dict, user_id: str, *, regenerate: bool = False) -> dict:
    tid = trip["id"]
    if not regenerate:
        cached = db.table("trip_phrases").select("payload").eq("trip_id", tid).limit(1).execute().data
        if cached and cached[0].get("payload", {}).get("phrases"):
            return cached[0]["payload"]
    dests = db.table("destinations").select("place_name,country_code") \
        .eq("trip_id", tid).order("seq").limit(1).execute().data
    place = dests[0]["place_name"] if dests else trip.get("title", "")
    country = dests[0].get("country_code") if dests else ""
    gateway.check_budget(db, user_id)
    ctx = {"place": place, "country": country}
    result = gateway.complete("phrases", PHRASES_PROMPT, json.dumps(ctx),
                              db=db, user_id=user_id, max_tokens=1500)
    data = sanitize_phrases(_parse(result.text))
    db.table("trip_phrases").upsert({"trip_id": tid, "payload": data, "model": result.model}).execute()
    return data
