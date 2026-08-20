"""Quick-add: natural language in, proper packing items out. The small model
parses; a tested pure gate clamps; everything lands as source='manual'."""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.ai_gateway import gateway
from api.core.auth import current_user_id
from api.core.db import get_db
from api.core.trips import owned_trip, PLAN, RECORD
from api.packing import dupes
from api.packing.limits import MAX_QTY, MIN_QTY, clamp_qty

router = APIRouter(prefix="/v1/trips", tags=["packing"])

PARSE_PROMPT = """Parse the user's text into packing items. Output ONLY a JSON array, no prose.
Each item: {"name":"...","category":"clothing|toiletries|electronics|documents|medications|activity_gear|misc","qty":1,"style_tag":null}
For clothing/footwear set style_tag: underwear|casual|smart_casual|formal|traditional|outerwear|footwear|athleisure|sleep. Max 8 items. Title-case names. qty from the text (default 1, max 99)."""

CATS = {"clothing", "toiletries", "electronics", "documents", "medications", "activity_gear", "misc"}
TAGS = {"underwear", "casual", "smart_casual", "formal", "traditional", "outerwear", "footwear", "athleisure", "sleep"}


class QuickAdd(BaseModel):
    text: str = Field(min_length=2, max_length=300)


class ParsedItem(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: str = "misc"
    qty: int = Field(default=1, ge=MIN_QTY, le=MAX_QTY)
    style_tag: str | None = None


class ConfirmAdd(BaseModel):
    """The second half of an add that hit a duplicate.

    Carries the already-parsed items so confirming does not re-run the model —
    the text was parsed once, and a second call would charge twice for the same
    sentence. clamp_items() still runs over them, so a client cannot use this
    to insert anything the parser would have rejected.
    """
    items: list[ParsedItem] = Field(min_length=1, max_length=8)
    #: merge = add the quantities onto the rows that already exist
    #: add   = insert anyway, leaving the existing rows alone
    on_duplicate: str = Field(default="add", pattern="^(merge|add)$")


def clamp_items(raw) -> list[dict]:
    out = []
    for it in (raw if isinstance(raw, list) else [])[:8]:
        if not isinstance(it, dict) or not str(it.get("name", "")).strip():
            continue
        cat = it.get("category") if it.get("category") in CATS else "misc"
        tag = it.get("style_tag") if it.get("style_tag") in TAGS else None
        try:
            qty = clamp_qty(it.get("qty"))
        except (TypeError, ValueError):
            qty = 1
        out.append({"name": str(it["name"]).strip()[:80], "category": cat,
                    "qty": qty, "style_tag": tag})
    return out


@router.post("/{trip_id}/items/quick-add")
def quick_add(trip_id: str, body: QuickAdd, user_id: str = Depends(current_user_id)):
    db = get_db()
    owned_trip(db, trip_id, user_id, writing=True, scope=PLAN)
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
    # Anything already on the list is reported rather than silently added
    # twice. Nothing is inserted in that case: the traveller decides, and the
    # parsed items come back so the decision costs no second model call.
    existing = db.table("packing_list_items").select("id,name,qty") \
        .eq("list_id", lists[0]["id"]).execute().data
    hits = dupes.find_duplicates(items, existing)
    if hits:
        return {"status": "needs_decision", "items": items, "duplicates": hits}

    return {"status": "added",
            "items": _insert(db, lists[0]["id"], items)}


def _insert(db, list_id: str, items: list[dict]) -> list[dict]:
    rows = [{"list_id": list_id, "name": it["name"], "category": it["category"],
             "qty": it["qty"], "style_tag": it["style_tag"], "status": "suggested",
             "source": "manual", "reason": "Added by you", "confidence": 1.0, "sort": 997}
            for it in items]
    return db.table("packing_list_items").insert(rows).execute().data


@router.post("/{trip_id}/items/confirm-add")
def confirm_add(trip_id: str, body: ConfirmAdd, user_id: str = Depends(current_user_id)):
    """Finish an add that hit a duplicate. No model call — see ConfirmAdd."""
    db = get_db()
    owned_trip(db, trip_id, user_id, writing=True, scope=PLAN)
    lists = db.table("packing_lists").select("id").eq("trip_id", trip_id) \
        .order("generated_at", desc=True).limit(1).execute().data
    if not lists:
        raise HTTPException(409, "Generate the list first, then add to it.")
    list_id = lists[0]["id"]

    items = clamp_items([i.model_dump() for i in body.items])
    if not items:
        raise HTTPException(422, "No items to add.")

    if body.on_duplicate == "add":
        return {"status": "added", "items": _insert(db, list_id, items)}

    # merge: fold quantities into the rows that already exist, insert the rest.
    existing = db.table("packing_list_items").select("id,name,qty") \
        .eq("list_id", list_id).execute().data
    idx = dupes.index_existing(existing)
    merged, fresh = [], []
    for it in items:
        found = idx.get(dupes.normalize(it["name"]))
        if found:
            qty = dupes.merged_qty(found.get("qty"), it["qty"])
            db.table("packing_list_items").update({"qty": qty}) \
                .eq("id", found["id"]).execute()
            merged.append({"id": found["id"], "name": found["name"], "qty": qty})
        else:
            fresh.append(it)
    return {"status": "merged",
            "merged": merged,
            "items": _insert(db, list_id, fresh) if fresh else []}
