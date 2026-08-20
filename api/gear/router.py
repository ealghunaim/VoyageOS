"""Gear profiles (F2.2 basic) — reusable kits that merge into any trip's list."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from api.core.auth import current_user_id
from api.core.db import get_db
from api.core.trips import owned_trip, PLAN, RECORD
from api.packing import dupes
from api.packing.limits import MAX_QTY, MIN_QTY, clamp_qty

router = APIRouter(prefix="/v1/gear-profiles", tags=["gear"])


class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    trip_type: str | None = None


class ItemAdd(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    qty: int = Field(default=1, ge=MIN_QTY, le=MAX_QTY)


def _owned(db, profile_id: str, user_id: str) -> dict:
    rows = db.table("gear_profiles").select("*").eq("id", profile_id) \
        .eq("user_id", user_id).execute().data
    if not rows:
        raise HTTPException(404, "Kit not found")
    return rows[0]


def _resolve_item(db, user_id: str, name: str) -> dict:
    """Catalog match first; else a user-owned item is born (the catalog grows from use)."""
    n = name.strip()
    rows = db.table("items").select("id,name,category").ilike("name", n).limit(1).execute().data
    if rows:
        return rows[0]
    return db.table("items").insert(
        {"owner_id": user_id, "name": n[:60], "category": "misc"}).execute().data[0]


@router.get("")
def list_profiles(user_id: str = Depends(current_user_id)):
    db = get_db()
    profiles = db.table("gear_profiles").select("id,name,trip_type") \
        .eq("user_id", user_id).order("created_at").execute().data
    for p in profiles:
        p["item_count"] = len(db.table("gear_profile_items").select("item_id")
                              .eq("profile_id", p["id"]).execute().data)
    return profiles


@router.post("", status_code=201)
def create_profile(body: ProfileCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    return db.table("gear_profiles").insert(
        {"user_id": user_id, **body.model_dump()}).execute().data[0]


@router.get("/{profile_id}")
def get_profile(profile_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    p = _owned(db, profile_id, user_id)
    items = db.table("gear_profile_items").select("qty,items(id,name,category)") \
        .eq("profile_id", profile_id).execute().data
    p["items"] = [{"item_id": r["items"]["id"], "name": r["items"]["name"],
                   "category": r["items"]["category"], "qty": r["qty"]}
                  for r in items if r.get("items")]
    return p


@router.post("/{profile_id}/items", status_code=201)
def add_item(profile_id: str, body: ItemAdd, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned(db, profile_id, user_id)
    item = _resolve_item(db, user_id, body.name)
    db.table("gear_profile_items").upsert(
        {"profile_id": profile_id, "item_id": item["id"], "qty": body.qty}).execute()
    return {"item_id": item["id"], "name": item["name"], "qty": body.qty}


@router.delete("/{profile_id}/items/{item_id}", status_code=204)
def remove_item(profile_id: str, item_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    _owned(db, profile_id, user_id)
    db.table("gear_profile_items").delete().eq("profile_id", profile_id) \
        .eq("item_id", item_id).execute()


@router.post("/{profile_id}/apply/{trip_id}", status_code=201)
def apply_to_trip(profile_id: str, trip_id: str, user_id: str = Depends(current_user_id)):
    """Merge a kit into the trip's list, then report what happened.

    APPLY THEN SUMMARISE. The kit goes on immediately and the traveller is told
    afterwards, in one line. Thirty pre-flight dialogs to resolve thirty items
    is not a feature, it is a toll.

    MATCHING is dupes.normalize — the same matcher quick-add uses, one matcher
    and two callers. This used to be name.lower(), which catches case and
    nothing else: "Sunscreen " against "sunscreen", "T-shirt" against
    "T shirt", "A charger" against "charger" and "Café kit" against "Cafe kit"
    all created a second row.

    RESPONSE INVARIANTS, relied on by the client:
        already_there == merged + skipped
        capped is a SUBSET of merged, never a third sibling — nobody sums three

    IDEMPOTENCY is keyed on the kit item, not on the apply event. A merged row
    is stamped with the kit's item_id and source='profile'; a row already
    carrying both has had this kit item applied and is skipped. So applying an
    unchanged kit twice gives merged=0 the second time, however many times it
    is tapped.

    The cost of that stamp is honest and worth naming: merging into an
    AI-suggested row flips its source from 'ai' to 'profile', because the row
    genuinely is part-kit afterwards. Its `reason` is left alone — the model's
    explanation of why the item belongs is still true.
    """
    db = get_db()
    p = _owned(db, profile_id, user_id)
    owned_trip(db, trip_id, user_id, writing=True, scope=PLAN)

    lists = db.table("packing_lists").select("id").eq("trip_id", trip_id) \
        .order("generated_at", desc=True).limit(1).execute().data
    if lists:
        list_id = lists[0]["id"]
    else:
        list_id = db.table("packing_lists").insert({"trip_id": trip_id}).execute().data[0]["id"]

    # ORDERED, and it matters. index_existing() takes the first occurrence of
    # each normalised name and says that keeps the choice stable — but a select
    # without an ORDER BY has no defined order, and Postgres is free to return
    # rows differently after an UPDATE has moved them. Unordered, applying a
    # kit twice merged into one "Socks" row and then the other, so a second
    # apply merged where it should have skipped. Caught by the triple-apply in
    # scripts/kit_apply_check.py, which is the only place it could surface.
    existing = db.table("packing_list_items") \
        .select("id,name,qty,weight_g,category,item_id,source") \
        .eq("list_id", list_id).order("sort").order("id").execute().data
    index = dupes.index_existing(existing)

    kit = db.table("gear_profile_items").select("qty,items(id,name,category,default_weight_g)") \
        .eq("profile_id", profile_id).execute().data

    rows, merged, skipped, capped, conflicts = [], [], [], [], []
    for r in kit:
        it = r.get("items")
        if not it:
            continue
        found = index.get(dupes.normalize(it["name"]))

        if found is None:
            rows.append({"list_id": list_id, "item_id": it["id"], "name": it["name"],
                         "category": it["category"], "qty": clamp_qty(r["qty"]),
                         "status": "accepted", "source": "profile",
                         "reason": f"From your {p['name']} kit",
                         "confidence": 1.0, "sort": 999,
                         "weight_g": it.get("default_weight_g")})
            continue

        # Already applied? The stamp is the kit's item_id plus source='profile'.
        if found.get("item_id") == it["id"] and found.get("source") == "profile":
            skipped.append(it["name"])
            conflicts.append({"name": it["name"], "action": "skipped",
                              "existing_qty": found.get("qty"),
                              "detail": "already added from this kit"})
            continue

        before = found.get("qty") or 1
        after = dupes.merged_qty(before, r["qty"])
        patch = {"qty": after, "item_id": it["id"], "source": "profile"}

        # WEIGHT: the list wins, the kit fills blanks only. Overwriting a
        # weight the traveller measured would change their bag total without
        # them touching anything; filling a blank only adds what was missing.
        if found.get("weight_g") in (None, 0) and it.get("default_weight_g"):
            patch["weight_g"] = it["default_weight_g"]

        # CATEGORY: the list wins outright. The row is already filed where the
        # traveller expects it, and moving it under them is a silent
        # reorganisation of a screen they are reading.

        # NOTE: gear_profile_items.notes is DROPPED here, as it always has
        # been — packing_list_items has no column for it. Stated rather than
        # silent: a v1.3 candidate if kit notes ever carry real investment.
        # Adding a column mid-batch is a schema change and this batch has had
        # its share.

        db.table("packing_list_items").update(patch).eq("id", found["id"]).execute()
        merged.append(it["name"])
        entry = {"name": it["name"], "action": "merged",
                 "from_qty": before, "added_qty": r["qty"], "to_qty": after}
        if after == MAX_QTY and before + r["qty"] > MAX_QTY:
            capped.append(it["name"])
            entry["capped_at"] = MAX_QTY
        conflicts.append(entry)

    if rows:
        db.table("packing_list_items").insert(rows).execute()

    return {"added": len(rows),
            "already_there": len(merged) + len(skipped),
            "merged": len(merged),
            "skipped": len(skipped),
            "capped": len(capped),
            "conflicts": conflicts,
            "kit": p["name"]}
