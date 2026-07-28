"""Food tips — traveler-to-traveler restaurant finds, keyed by DESTINATION so
they cross trips and, come TestFlight, cross users. The seed of the food blog."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.core.auth import current_user_id
from api.core.db import get_db

router = APIRouter(prefix="/v1/food-tips", tags=["tips"])


class TipCreate(BaseModel):
    place_name: str = Field(min_length=2, max_length=120)
    country_code: str | None = Field(default=None, max_length=2)
    restaurant: str = Field(min_length=2, max_length=80)
    note: str = Field(default="", max_length=300)
    order_rec: str = Field(default="", max_length=120)
    when_rec: str = Field(default="", max_length=80)


@router.get("")
def list_tips(place: str, cc: str | None = None, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = db.table("food_tips").select("*").ilike("place_name", place.strip()) \
        .order("created_at", desc=True).limit(30).execute().data
    if cc and len(rows) < 30:
        seen = {r["id"] for r in rows}
        rows += [r for r in db.table("food_tips").select("*")
                 .eq("country_code", cc.upper()).order("created_at", desc=True)
                 .limit(30).execute().data if r["id"] not in seen]
    for r in rows[:30]:
        r["is_mine"] = r["user_id"] == user_id
        r["author"] = "You" if r["is_mine"] else f"Traveler {r['user_id'][:4]}"
        r.pop("user_id", None)
    return rows[:30]


@router.post("", status_code=201)
def add_tip(body: TipCreate, user_id: str = Depends(current_user_id)):
    db = get_db()
    row = db.table("food_tips").insert({
        "user_id": user_id, "place_name": body.place_name.strip(),
        "country_code": (body.country_code or "").upper() or None,
        "restaurant": body.restaurant.strip(), "note": body.note.strip(),
        "order_rec": body.order_rec.strip(), "when_rec": body.when_rec.strip(),
    }).execute().data[0]
    row["is_mine"] = True
    row["author"] = "You"
    row.pop("user_id", None)
    return row


@router.delete("/{tip_id}", status_code=204)
def delete_tip(tip_id: str, user_id: str = Depends(current_user_id)):
    db = get_db()
    if not db.table("food_tips").select("id").eq("id", tip_id).eq("user_id", user_id).execute().data:
        raise HTTPException(404, "Not yours or not found")
    db.table("food_tips").delete().eq("id", tip_id).execute()
