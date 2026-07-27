"""Packing generation service (Part 2 §1): the pipeline, end to end.

context → cache check → gateway → validate (retry once) → quantity engine wins →
catalog link → persist with full generation_snapshot. Fallback template on double failure.
"""
from __future__ import annotations

from datetime import datetime, timezone

from api.ai_gateway import gateway
from api.ai_gateway.prompts import PACKING_SYSTEM_PROMPT, PROMPT_VERSION
from api.packing.context import build_context, context_hash
from api.packing.fallback import template_items
from api.packing.quantity_engine import ItemClass, compute_qty
from api.packing.schemas import GenOutput, parse_model_json

CATEGORY_ORDER = ["clothing", "footwear", "toiletries", "medications", "electronics",
                  "documents", "activity_gear", "kids", "comfort", "misc"]


def _owner_traveler_id(db, trip_id: str, user_id: str) -> str:
    rows = db.table("trip_travelers").select("id").eq("trip_id", trip_id) \
        .eq("user_id", user_id).execute().data
    if rows:
        return rows[0]["id"]
    return db.table("trip_travelers").insert(
        {"trip_id": trip_id, "user_id": user_id, "role": "owner"}
    ).execute().data[0]["id"]


def _catalog_index(db) -> dict[str, str]:
    rows = db.table("items").select("id,name").is_("owner_id", "null").execute().data
    return {r["name"].lower(): r["id"] for r in rows}


def _apply_quantity_engine(items: list[dict], duration_days: int,
                           laundry: bool, style: str) -> int:
    """Law 2: the engine's number wins. Returns the divergence count for evals."""
    divergences = 0
    for it in items:
        result = compute_qty(
            ItemClass(it["item_class"]), duration_days,
            laundry_available=laundry, packing_style=style, model_qty=it["qty"],
        )
        if result.diverged:
            divergences += 1
        it["qty"] = result.qty
    return divergences


def _persist(db, trip_id: str, traveler_id: str, items: list[dict], *,
             source: str, snapshot: dict) -> str:
    plist = db.table("packing_lists").insert({
        "trip_id": trip_id, "traveler_id": traveler_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generation_snapshot": snapshot,
    }).execute().data[0]

    catalog = _catalog_index(db)
    rows = []
    for i, it in enumerate(sorted(items, key=lambda x: (CATEGORY_ORDER.index(x["category"]), x["name"]))):
        rows.append({
            "list_id": plist["id"],
            "item_id": catalog.get(it["name"].lower()),
            "name": it["name"], "category": it["category"], "qty": it["qty"],
            "status": "suggested",
            "source": it["source_signal"] if it.get("source_signal") in ("history", "weather") else source,
            "reason": it["reason"], "confidence": it["confidence"], "sort": i,
        })
    db.table("packing_list_items").insert(rows).execute()
    return plist["id"]


def _latest_list(db, trip_id: str) -> dict | None:
    rows = db.table("packing_lists").select("*").eq("trip_id", trip_id) \
        .order("generated_at", desc=True).limit(1).execute().data
    return rows[0] if rows else None


def generate(db, trip: dict, user_id: str, *, regenerate: bool = False) -> dict:
    ctx = build_context(db, trip, user_id)
    chash = context_hash(ctx)

    # --- cache: unchanged inputs never pay for a second model call (Part 1 §10.5) ---
    if not regenerate:
        latest = _latest_list(db, trip["id"])
        if latest and latest.get("generation_snapshot", {}).get("context_hash") == chash:
            return {"list_id": latest["id"], "cached": True, "cost_usd": 0.0,
                    "meta": latest["generation_snapshot"]}

    gateway.check_budget(db, user_id)
    traveler_id = _owner_traveler_id(db, trip["id"], user_id)
    duration = ctx["trip"]["duration_days"]
    style = ctx["traveler"]["packing_style"]

    import json as _json
    user_msg = _json.dumps(ctx, indent=1)

    result, output, attempts = None, None, 0
    last_error = ""
    for attempt in (1, 2):  # one retry, then fallback — never a third call (Part 1 §8)
        attempts = attempt
        suffix = "" if attempt == 1 else (
            f"\n\nYour previous output failed validation: {last_error}. "
            "Output ONLY the corrected JSON object."
        )
        result = gateway.complete("packing_generate", PACKING_SYSTEM_PROMPT,
                                  user_msg + suffix, db=db, user_id=user_id)
        try:
            output = parse_model_json(result.text)
            break
        except Exception as e:  # noqa: BLE001 — any parse/validation failure retries once
            last_error = str(e)[:200]
            output = None

    if output is not None:
        items = [it.model_dump() for it in output.items]
        source = "ai"
        divergences = _apply_quantity_engine(items, duration, ctx["laundry_available"], style)
        snapshot = {
            "context_hash": chash, "prompt_version": PROMPT_VERSION,
            "model": result.model, "tokens_in": result.tokens_in,
            "tokens_out": result.tokens_out, "cost_usd": result.cost_usd,
            "latency_ms": result.latency_ms, "attempts": attempts,
            "qty_divergences": divergences,
            "task_suggestions": output.task_suggestions,
            "missing_inputs": output.missing_inputs,
        }
    else:
        # --- honest fallback: template list, clearly labeled, still useful ---
        items = template_items(trip.get("trip_type"))
        source = "template"
        _apply_quantity_engine(items, duration, ctx["laundry_available"], style)
        snapshot = {
            "context_hash": chash, "prompt_version": PROMPT_VERSION,
            "model": "template_fallback", "cost_usd": result.cost_usd if result else 0.0,
            "fallback_reason": last_error, "attempts": attempts,
        }

    list_id = _persist(db, trip["id"], traveler_id, items, source=source, snapshot=snapshot)
    return {"list_id": list_id, "cached": False, "source": source,
            "item_count": len(items), "cost_usd": snapshot.get("cost_usd", 0.0),
            "meta": snapshot}
