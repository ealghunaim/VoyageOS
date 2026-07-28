"""Guide engine: one model call per trip, cached forever in trip_guides.
sanitize() is the pure gate every payload passes — tested, clipped, safe."""
from __future__ import annotations

import json

from fastapi import HTTPException

from api.ai_gateway import gateway
from api.guide.prompts import GUIDE_PROMPT_VERSION, GUIDE_SYSTEM_PROMPT

_LIST_CAPS = {"etiquette": 6, "customs_flags": 5, "eat": 6, "play": 6,
              "visit": 6, "task_suggestions": 4, "health": 5}


def _s(v, cap=140) -> str:
    return str(v)[:cap] if v is not None else ""


def sanitize(raw: dict) -> dict:
    """Whitelist keys, coerce shapes, clip lengths. Unknown junk never survives."""
    out: dict = {}
    power = raw.get("power") or {}
    out["power"] = {"plugs": _s(power.get("plugs"), 60), "note": _s(power.get("note"))}
    for key in ("etiquette", "customs_flags", "task_suggestions", "health"):
        out[key] = [_s(x) for x in (raw.get(key) or [])[:_LIST_CAPS[key]] if _s(x)]
    for key in ("eat", "play", "visit"):
        rows = []
        for item in (raw.get(key) or [])[:_LIST_CAPS[key]]:
            if isinstance(item, dict) and item.get("name"):
                rows.append({"name": _s(item.get("name"), 60), "note": _s(item.get("note"))})
        out[key] = rows
    go = raw.get("go") or {}
    vh = raw.get("visa_hint") or {}
    st = vh.get("status")
    out["visa_hint"] = {"status": st if st in ("none", "evisa", "arrival", "required") else "unknown",
                        "note": _s(vh.get("note"), 120)}
    ap = raw.get("airport") or {}
    out["airport"] = {"code": _s(ap.get("code"), 4).upper(), "name": _s(ap.get("name"), 60),
                      "to_city": _s(ap.get("to_city")),
                      "highlights": [_s(x) for x in (ap.get("highlights") or [])[:4] if _s(x)],
                      "duty_free": _s(ap.get("duty_free")), "smoking": _s(ap.get("smoking")),
                      "tips": [_s(x) for x in (ap.get("tips") or [])[:3] if _s(x)]}
    out["go"] = {
        "from_airport": [_s(x) for x in (go.get("from_airport") or [])[:4] if _s(x)],
        "around": [_s(x) for x in (go.get("around") or [])[:4] if _s(x)],
    }
    return out


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
           "nationality": nationality}
    result = gateway.complete("guide_generate", GUIDE_SYSTEM_PROMPT,
                              json.dumps(ctx), db=db, user_id=user_id, max_tokens=3600)
    try:
        guide = sanitize(_parse(result.text))
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
