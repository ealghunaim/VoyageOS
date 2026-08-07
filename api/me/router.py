"""Profile — DOB, gender, nationality, travel companions. Lives in
user_preferences.extras (jsonb) until companions graduate into real shared
travelers (design doc Part 6). merge() is pure and tested."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from api.core.auth import current_user_id
from api.core.db import get_db

router = APIRouter(prefix="/v1/me", tags=["me"])

PROFILE_KEYS = ("dob", "gender", "nationality", "members", "emergency_contact", "home_origin")


class Member(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    relation: Literal["partner", "child", "parent", "friend", "other"] = "other"
    dob: date | None = None


class EmergencyContact(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    phone: str = Field(min_length=3, max_length=24)


class HomeOrigin(BaseModel):
    """The traveler's usual starting point — the default 'from' for new trips."""
    name: str = Field(min_length=1, max_length=80)
    country: str | None = Field(default=None, min_length=2, max_length=2)
    lat: float | None = None
    lng: float | None = None


class ProfileBody(BaseModel):
    dob: date | None = None
    gender: Literal["female", "male", "other", "na"] | None = None
    nationality: str | None = Field(default=None, min_length=2, max_length=2)
    members: list[Member] | None = Field(default=None, max_length=8)
    emergency_contact: EmergencyContact | None = None
    home_origin: HomeOrigin | None = None


def merge(old: dict, incoming: dict) -> dict:
    """Only provided keys change; members replace wholesale; unknown keys survive."""
    out = dict(old or {})
    for key in PROFILE_KEYS:
        if key in incoming and incoming[key] is not None:
            out[key] = incoming[key]
    return out


@router.get("/profile")
def get_profile(user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = db.table("user_preferences").select("extras").eq("user_id", user_id).execute().data
    extras = (rows[0].get("extras") if rows else {}) or {}
    return {k: extras.get(k) for k in PROFILE_KEYS}


@router.put("/profile")
def put_profile(body: ProfileBody, user_id: str = Depends(current_user_id)):
    db = get_db()
    rows = db.table("user_preferences").select("extras").eq("user_id", user_id).execute().data
    old = (rows[0].get("extras") if rows else {}) or {}
    incoming = body.model_dump(mode="json", exclude_none=True)
    if incoming.get("nationality"):
        incoming["nationality"] = incoming["nationality"].upper()
    if incoming.get("home_origin", {}).get("country"):
        incoming["home_origin"]["country"] = incoming["home_origin"]["country"].upper()
    extras = merge(old, incoming)
    db.table("user_preferences").upsert(
        {"user_id": user_id, "extras": extras}, on_conflict="user_id").execute()
    return {k: extras.get(k) for k in PROFILE_KEYS}


class DeviceToken(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    platform: Literal["ios", "android"] = "ios"
    #: A stable id for the install, minted by the client and kept in
    #: SecureStore. Optional so a client from before this change still
    #: registers; those fall back to the token, which is exactly the old
    #: behaviour — one row per token — rather than being rejected.
    device_id: str | None = None




@router.post("/device-token", status_code=204)
def register_device_token(body: DeviceToken, user_id: str = Depends(current_user_id)):
    db = get_db()
    # Keyed on the device, so a new token from a known install REPLACES its
    # row instead of adding another. Keying on the token is what let a phone
    # accumulate one row per app update and receive every reminder that many
    # times over.
    device_id = body.device_id or body.token
    db.table("device_tokens").upsert(
        {"user_id": user_id, "device_id": device_id,
         "token": body.token, "platform": body.platform,
         "updated_at": datetime.now(timezone.utc).isoformat()},
        on_conflict="user_id,device_id").execute()

    # A device that re-registers with a new token leaves its old token behind
    # under the same device_id — the upsert overwrote it — but a token that
    # moved to a DIFFERENT device_id (an install this client used to call
    # something else) would linger. Clear any other row of this user's holding
    # the same token, since a token belongs to exactly one device.
    db.table("device_tokens").delete().eq("user_id", user_id) \
        .eq("token", body.token).neq("device_id", device_id).execute()
