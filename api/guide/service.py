"""Guide engine: one model call per trip, cached forever in trip_guides.
sanitize() is the pure gate every payload passes — tested, clipped, safe."""
from __future__ import annotations

import json

from fastapi import HTTPException

from api.ai_gateway import gateway
from api.guide.prompts import GUIDE_PROMPT_VERSION, GUIDE_SYSTEM_PROMPT

#: Twelve is a ceiling the prompt is told not to treat as a target. Six was
#: the old cap; grouping by cuisine needs enough places that a section is not
#: one entry, without asking for a quota per cuisine — a quota is what makes a
#: model invent restaurants to fill it.
#: Raised from 6 with the restaurant cap, on measured headroom rather than
#: hope: guide_a ran a 1524 median against a 4000 ceiling, so ~280 extra
#: tokens of content lands near 1800. Still a ceiling, never a target.
_DISH_CAP = 10
_RESTAURANT_CAP = 16

_LIST_CAPS = {"etiquette": 6, "customs_flags": 5, "eat": 6, "play": 6,
              "visit": 6, "task_suggestions": 4, "health": 5}


def _s(v, cap=140) -> str:
    return str(v)[:cap] if v is not None else ""


MODE_KIND = {"air": "airport", "ship": "port", "train": "station", "car": "road"}


def sanitize(raw: dict, travel_mode: str | None = None) -> dict:
    """Whitelist keys, coerce shapes, clip lengths. Unknown junk never survives."""
    out: dict = {}
    power = raw.get("power") or {}
    out["power"] = {"plugs": _s(power.get("plugs"), 60), "note": _s(power.get("note"))}
    for key in ("etiquette", "customs_flags", "task_suggestions", "health"):
        out[key] = [_s(x) for x in (raw.get(key) or [])[:_LIST_CAPS[key]] if _s(x)]
    dishes = []
    for item in (raw.get("dishes") or [])[:_DISH_CAP]:
        if isinstance(item, dict) and item.get("name"):
            dishes.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note"))})
    out["dishes"] = dishes
    restaurants = []
    for item in (raw.get("restaurants") or raw.get("eat") or [])[:_RESTAURANT_CAP]:
        if isinstance(item, dict) and item.get("name"):
            rawp = item.get("price")
            try:
                price = int(rawp) if rawp is not None else 2
            except (TypeError, ValueError):
                price = 2
            # cuisine is None rather than "" when absent, so a guide generated
            # before this field existed reads as ungrouped instead of grouping
            # everything under a blank heading.
            restaurants.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note")),
                                "area": _s(item.get("area"), 50), "price": max(1, min(4, price)),
                                "cuisine": _s(item.get("cuisine"), 24) or None})
    out["restaurants"] = restaurants
    out["eat"] = restaurants  # back-compat for older readers
    play_rows = []
    for item in (raw.get("play") or [])[:_LIST_CAPS["play"]]:
        if isinstance(item, dict) and item.get("name"):
            play_rows.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note"))})
    out["play"] = play_rows
    _FEE = {"free", "low", "mid", "high"}
    visit_rows = []
    for item in (raw.get("visit") or [])[:_LIST_CAPS["visit"]]:
        if isinstance(item, dict) and item.get("name"):
            rawr = item.get("rating")
            try:
                rating = round(float(rawr), 1) if rawr is not None else None
            except (TypeError, ValueError):
                rating = None
            if rating is not None:
                rating = max(0.0, min(5.0, rating))
            fee = item.get("fee") if item.get("fee") in _FEE else ""
            visit_rows.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note")),
                               "rating": rating, "fee": fee, "access": _s(item.get("access"), 80)})
    out["visit"] = visit_rows
    go = raw.get("go") or {}
    vh = raw.get("visa_hint") or {}
    st = vh.get("status")
    out["visa_hint"] = {"status": st if st in ("none", "evisa", "arrival", "required") else "unknown",
                        "note": _s(vh.get("note"), 120)}
    def _gw(gw):
        k = gw.get("kind") if gw.get("kind") in ("airport", "port", "station", "road") else "airport"
        return {"kind": k, "code": _s(gw.get("code"), 4).upper(), "name": _s(gw.get("name"), 60),
                "to_city": _s(gw.get("to_city")),
                "highlights": [_s(x) for x in (gw.get("highlights") or [])[:4] if _s(x)],
                "duty_free": _s(gw.get("duty_free")), "smoking": _s(gw.get("smoking")),
                "tips": [_s(x) for x in (gw.get("tips") or [])[:3] if _s(x)]}
    raw_gws = raw.get("gateways")
    if not isinstance(raw_gws, list) or not raw_gws:
        single = raw.get("gateway") or raw.get("airport") or {}
        raw_gws = [single] if (single.get("name") or single.get("code")) else []
    seen, gateways = set(), []
    for gw in raw_gws[:4]:
        if not isinstance(gw, dict):
            continue
        built = _gw(gw)
        if not (built["name"] or built["code"]) or built["kind"] in seen:
            continue
        seen.add(built["kind"]); gateways.append(built)
    want = MODE_KIND.get(travel_mode or "")
    if want:
        gateways.sort(key=lambda g: 0 if g["kind"] == want else 1)
    out["gateways"] = gateways
    default = gateways[0] if gateways else {"kind": "airport", "code": "", "name": "",
        "to_city": "", "highlights": [], "duty_free": "", "smoking": "", "tips": []}
    out["gateway"] = default
    out["airport"] = default
    out["go"] = {
        "from_origin": [_s(x) for x in (go.get("from_origin") or [])[:4] if _s(x)],
        "from_airport": [_s(x) for x in (go.get("from_airport") or [])[:4] if _s(x)],
        "around": [_s(x) for x in (go.get("around") or [])[:4] if _s(x)],
    }
    out["souvenirs"] = [
        {"name": _s(x.get("name"), 60), "note": _s(x.get("note"), 100),
         "price_band": _s(x.get("price_band"), 30)}
        for x in (raw.get("souvenirs") or [])[:5]
        if isinstance(x, dict) and _s(x.get("name"))
    ]
    return out


# --- Two-phase progressive guide -------------------------------------------
# Phase A (Know + Eat) and Phase B (Play + Visit + Go) generate independently
# and cache in trip_guide_parts, so the first tab paints while the rest loads.
# Each sanitizer reuses the exact field logic from sanitize() above.

def sanitize_a(raw: dict) -> dict:
    out: dict = {}
    power = raw.get("power") or {}
    out["power"] = {"plugs": _s(power.get("plugs"), 60), "note": _s(power.get("note"))}
    for key in ("etiquette", "customs_flags", "task_suggestions", "health"):
        out[key] = [_s(x) for x in (raw.get(key) or [])[:_LIST_CAPS[key]] if _s(x)]
    dishes = []
    for item in (raw.get("dishes") or [])[:_DISH_CAP]:
        if isinstance(item, dict) and item.get("name"):
            dishes.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note"))})
    out["dishes"] = dishes
    restaurants = []
    for item in (raw.get("restaurants") or raw.get("eat") or [])[:_RESTAURANT_CAP]:
        if isinstance(item, dict) and item.get("name"):
            rawp = item.get("price")
            try:
                price = int(rawp) if rawp is not None else 2
            except (TypeError, ValueError):
                price = 2
            # cuisine is None rather than "" when absent, so a guide generated
            # before this field existed reads as ungrouped instead of grouping
            # everything under a blank heading.
            restaurants.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note")),
                                "area": _s(item.get("area"), 50), "price": max(1, min(4, price)),
                                "cuisine": _s(item.get("cuisine"), 24) or None})
    out["restaurants"] = restaurants
    out["eat"] = restaurants
    vh = raw.get("visa_hint") or {}
    st = vh.get("status")
    out["visa_hint"] = {"status": st if st in ("none", "evisa", "arrival", "required") else "unknown",
                        "note": _s(vh.get("note"), 120)}
    out["souvenirs"] = [
        {"name": _s(x.get("name"), 60), "note": _s(x.get("note"), 100),
         "price_band": _s(x.get("price_band"), 30)}
        for x in (raw.get("souvenirs") or [])[:5]
        if isinstance(x, dict) and _s(x.get("name"))
    ]
    return out


def sanitize_b(raw: dict, travel_mode: str | None = None) -> dict:
    out: dict = {}
    play_rows = []
    for item in (raw.get("play") or [])[:_LIST_CAPS["play"]]:
        if isinstance(item, dict) and item.get("name"):
            play_rows.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note"))})
    out["play"] = play_rows
    _FEE = {"free", "low", "mid", "high"}
    visit_rows = []
    for item in (raw.get("visit") or [])[:_LIST_CAPS["visit"]]:
        if isinstance(item, dict) and item.get("name"):
            rawr = item.get("rating")
            try:
                rating = round(float(rawr), 1) if rawr is not None else None
            except (TypeError, ValueError):
                rating = None
            if rating is not None:
                rating = max(0.0, min(5.0, rating))
            fee = item.get("fee") if item.get("fee") in _FEE else ""
            visit_rows.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note")),
                               "rating": rating, "fee": fee, "access": _s(item.get("access"), 80)})
    out["visit"] = visit_rows
    go = raw.get("go") or {}

    def _gw(gw):
        k = gw.get("kind") if gw.get("kind") in ("airport", "port", "station", "road") else "airport"
        return {"kind": k, "code": _s(gw.get("code"), 4).upper(), "name": _s(gw.get("name"), 60),
                "to_city": _s(gw.get("to_city")),
                "highlights": [_s(x) for x in (gw.get("highlights") or [])[:4] if _s(x)],
                "duty_free": _s(gw.get("duty_free")), "smoking": _s(gw.get("smoking")),
                "tips": [_s(x) for x in (gw.get("tips") or [])[:3] if _s(x)]}
    raw_gws = raw.get("gateways")
    if not isinstance(raw_gws, list) or not raw_gws:
        single = raw.get("gateway") or raw.get("airport") or {}
        raw_gws = [single] if (single.get("name") or single.get("code")) else []
    seen, gateways = set(), []
    for gw in raw_gws[:4]:
        if not isinstance(gw, dict):
            continue
        built = _gw(gw)
        if not (built["name"] or built["code"]) or built["kind"] in seen:
            continue
        seen.add(built["kind"]); gateways.append(built)
    want = MODE_KIND.get(travel_mode or "")
    if want:
        gateways.sort(key=lambda g: 0 if g["kind"] == want else 1)
    out["gateways"] = gateways
    default = gateways[0] if gateways else {"kind": "airport", "code": "", "name": "",
        "to_city": "", "highlights": [], "duty_free": "", "smoking": "", "tips": []}
    out["gateway"] = default
    out["airport"] = default
    out["go"] = {
        "from_origin": [_s(x) for x in (go.get("from_origin") or [])[:4] if _s(x)],
        "from_airport": [_s(x) for x in (go.get("from_airport") or [])[:4] if _s(x)],
        "around": [_s(x) for x in (go.get("around") or [])[:4] if _s(x)],
    }
    return out


def _resolve_destination(db, trip_id: str, destination_id: str | None) -> dict | None:
    q = db.table("destinations").select("id,place_name,country_code,accommodation").eq("trip_id", trip_id)
    if destination_id:
        rows = q.eq("id", destination_id).limit(1).execute().data
        if not rows:
            raise HTTPException(404, "Destination not found on this trip")
        return rows[0]
    rows = q.order("seq").limit(1).execute().data
    return rows[0] if rows else None


def _guide_ctx(db, trip: dict, user_id: str, dest: dict | None) -> dict:
    place = dest["place_name"] if dest else trip["title"]
    country = (dest.get("country_code") if dest else None) or ""
    acts = [a["type"] for a in db.table("activities").select("type")
            .eq("trip_id", trip["id"]).execute().data]
    accommodation = (dest.get("accommodation") or {}).get("name") if dest else None
    nat_rows = db.table("user_preferences").select("extras").eq("user_id", user_id).execute().data
    nationality = ((nat_rows[0].get("extras") if nat_rows else {}) or {}).get("nationality")
    return {"destination": {"place": place, "country": country},
            "month": trip["start_date"][5:7], "start_date": trip["start_date"],
            "activities": sorted(set(acts)), "accommodation": accommodation,
            "travel_mode": trip.get("travel_mode"),
            "require_gateway": MODE_KIND.get(trip.get("travel_mode") or ""),
            "origin": trip.get("origin"), "nationality": nationality}


_PART_TASK = {"a": "guide_a", "b": "guide_b"}

# Per-phase output ceilings. These were a single shared 3000 for both phases,
# which suited phase A and starved phase B: A writes Know + Eat and peaks
# around 1600 tokens, while B writes Play + Visit + Go, each entry carrying a
# rating, fee, access note and transit detail. B was hitting the ceiling and
# being cut off mid-JSON, which surfaces to the traveller as "the guide didn't
# generate cleanly" after they have already been billed for the call.
# Sized to observed peak plus roughly 2x headroom; unused ceiling is free.
_PART_MAX_TOKENS = {"a": 3000, "b": 8000}


def get_guide_part(db, trip: dict, user_id: str, phase: str, *,
                    destination_id: str | None = None, regenerate: bool = False) -> dict:
    from api.guide.prompts import GUIDE_PROMPT_A, GUIDE_PROMPT_B
    if phase not in ("a", "b"):
        raise HTTPException(400, "bad guide phase")
    tid = trip["id"]
    dest = _resolve_destination(db, tid, destination_id)
    if not dest:
        raise HTTPException(400, "Add a destination before generating a guide")
    did = dest["id"]
    if not regenerate:
        rows = db.table("trip_guide_parts").select("payload,model") \
            .eq("trip_id", tid).eq("destination_id", did).eq("phase", phase).limit(1).execute().data
        if rows:
            return {"guide": rows[0]["payload"], "phase": phase, "destination_id": did,
                    "cached": True, "cost_usd": 0.0}
    ctx = _guide_ctx(db, trip, user_id, dest)
    gateway.check_budget(db, user_id)
    prompt = GUIDE_PROMPT_A if phase == "a" else GUIDE_PROMPT_B
    result = gateway.complete(_PART_TASK[phase], prompt, json.dumps(ctx),
                              db=db, user_id=user_id)
    try:
        part = (sanitize_a(_parse(result.text)) if phase == "a"
                else sanitize_b(_parse(result.text), travel_mode=trip.get("travel_mode")))
    except Exception as e:
        why = (f"TRUNCATED at max_tokens="
               f"{gateway.TASK_MAX_TOKENS[_PART_TASK[phase]]} "
               f"({result.tokens_out} out)" if result.truncated
               else f"{type(e).__name__}: {e}")
        print(f"[guide/{phase}] parse failed: {why} · tail {result.text[-120:]!r}")
        raise HTTPException(502, "The guide didn't generate cleanly — tap ↻ to retry.")
    db.table("trip_guide_parts").upsert(
        {"trip_id": tid, "destination_id": did, "phase": phase, "payload": part,
         "model": f"{result.model}·{GUIDE_PROMPT_VERSION}"},
        on_conflict="trip_id,destination_id,phase").execute()
    return {"guide": part, "phase": phase, "destination_id": did, "cached": False, "cost_usd": result.cost_usd}


def _parse(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON in guide output")
    return json.loads(cleaned[start:end + 1])


def get_guide(db, trip: dict, user_id: str, *, regenerate: bool = False) -> dict:
    if not regenerate:
        rows = db.table("trip_guides").select("*").eq("trip_id", trip["id"]).execute().data
        if rows:
            return {"guide": rows[0]["payload"], "cached": True,
                    "model": rows[0].get("model"), "cost_usd": 0.0}

    dests = db.table("destinations").select("place_name,country_code,accommodation") \
        .eq("trip_id", trip["id"]).order("seq").limit(1).execute().data
    place = dests[0]["place_name"] if dests else trip["title"]
    country = (dests[0].get("country_code") if dests else None) or ""
    acts = [a["type"] for a in db.table("activities").select("type")
            .eq("trip_id", trip["id"]).execute().data]
    accommodation = (dests[0].get("accommodation") or {}).get("name") if dests else None
    nat_rows = db.table("user_preferences").select("extras").eq("user_id", user_id).execute().data
    nationality = ((nat_rows[0].get("extras") if nat_rows else {}) or {}).get("nationality")

    gateway.check_budget(db, user_id)
    ctx = {"destination": {"place": place, "country": country},
           "month": trip["start_date"][5:7], "start_date": trip["start_date"],
           "duration_days": None, "activities": sorted(set(acts)),
           "accommodation": accommodation, "travel_mode": trip.get("travel_mode"),
           "require_gateway": MODE_KIND.get(trip.get("travel_mode") or ""),
           "origin": trip.get("origin"),
           "nationality": nationality}
    result = gateway.complete("guide_generate", GUIDE_SYSTEM_PROMPT,
                              json.dumps(ctx), db=db, user_id=user_id)
    try:
        guide = sanitize(_parse(result.text), travel_mode=trip.get("travel_mode"))
    except Exception as e:
        print(f"[guide] parse failed: {type(e).__name__}: {e} · raw tail: {result.text[-120:]!r}")
        raise HTTPException(502, "The guide didn't generate cleanly — tap ↻ to retry.")
    if not (guide["eat"] or guide["etiquette"] or guide["power"]["plugs"]):
        print("[guide] empty output — not caching")
        raise HTTPException(502, "The guide came back empty — tap ↻ to retry.")

    db.table("trip_guides").upsert(
        {"trip_id": trip["id"], "payload": guide,
         "model": f"{result.model}·{GUIDE_PROMPT_VERSION}"},
        on_conflict="trip_id").execute()
    return {"guide": guide, "cached": False, "model": result.model,
            "cost_usd": result.cost_usd}
