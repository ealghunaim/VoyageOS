"""Quick-add: natural language in, proper packing items out. The small model
parses; a tested pure gate clamps; everything lands as source='manual'."""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.ai_gateway import gateway
from api.core.auth import current_user_id
from api.core.db import get_db

router = APIRouter(prefix="/v1/trips", tags=["packing"])

PARSE_PROMPT = """Parse the user's text into packing items. Output ONLY a JSON array, no prose.
Each item: {"name":"...","category":"clothing|toiletries|electronics|documents|medications|activity_gear|misc","qty":1,"style_tag":null}
For clothing/footwear set style_tag: underwear|casual|smart_casual|formal|traditional|outerwear|footwear|athleisure|sleep. Max 8 items. Title-case names. qty from the text (default 1, max 99)."""

CATS = {"clothing", "toiletries", "electronics", "documents", "medications", "activity_gear", "misc"}
TAGS = {"underwear", "casual", "smart_casual", "formal", "traditional", "outerwear", "footwear", "athleisure", "sleep"}


class QuickAdd(BaseModel):
    text: str = Field(min_length=2, max_length=300)


def clamp_items(raw) -> list[dict]:
    out = []
    for it in (raw if isinstance(raw, list) else [])[:8]:
        if not isinstance(it, dict) or not str(it.get("name", "")).strip():
            continue
        cat = it.get("category") if it.get("category") in CATS else "misc"
        tag = it.get("style_tag") if it.get("style_tag") in TAGS else None
        try:
            qty = max(1, min(int(it.get("qty") or 1), 99))
        except (TypeError, ValueError):
            qty = 1
        out.append({"name": str(it["name"]).strip()[:80], "category": cat,
                    "qty": qty, "style_tag": tag})
    return out


@router.post("/{trip_id}/items/quick-add")
def quick_add(trip_id: str, body: QuickAdd, user_id: str = Depends(current_user_id)):
    db = get_db()
    if not db.table("trips").select("id").eq("id", trip_id).eq("owner_id", user_id).execute().data:
        raise HTTPException(404, "Trip not found")
    lists = db.table("packing_lists").select("id").eq("trip_id", trip_id) \
        .order("generated_at", desc=True).limit(1).execute().data
    if not lists:
        raise HTTPException(409, "Generate the list first, then add to it.")
    gateway.check_budget(db, user_id)
    result = gateway.complete("items_parse", PARSE_PROMPT, body.text,
                              db=db, user_id=user_id)
    cleaned = result.text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1].lstrip("json")
    start, end = cleaned.find("["), cleaned.rfind("]")
    try:
        items = clamp_items(json.loads(cleaned[start:end + 1]))
    except Exception:
        raise HTTPException(502, "Couldn't parse that — try simpler phrasing.")
    if not items:
        raise HTTPException(422, "No items found in that text.")
    rows = [{"list_id": lists[0]["id"], "name": it["name"], "category": it["category"],
             "qty": it["qty"], "style_tag": it["style_tag"], "status": "suggested",
             "source": "manual", "reason": "Added by you", "confidence": 1.0, "sort": 997}
            for it in items]
    return db.table("packing_list_items").insert(rows).execute().data
