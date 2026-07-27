"""Auth dependency — v1.0 real login.

The app sends `Authorization: Bearer <supabase access token>`. We verify by
asking Supabase's own auth service (correct under any signing-key scheme; a
small TTL cache keeps it cheap). First sight of a user auto-provisions their
profiles row. The DEV_USER_ID fallback survives ONLY when ENV=local and no
Bearer is presented — flip ENV=production on the server to retire it.
"""
from __future__ import annotations

import time

import httpx
from fastapi import Header, HTTPException

from api.core.config import settings

_cache: dict[str, tuple[str, float]] = {}
_CACHE_TTL_S = 300.0
_CACHE_MAX = 500


def _verify_with_supabase(token: str) -> str | None:
    """Token → user id via GoTrue, or None. Fresh client per call (errno-11 lesson)."""
    try:
        with httpx.Client(timeout=8) as c:
            r = c.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}",
                         "apikey": settings.supabase_service_key},
            )
        return r.json().get("id") if r.status_code == 200 else None
    except Exception as e:
        print(f"[auth] verify failed: {type(e).__name__}: {e}")
        return None


def _ensure_profile(user_id: str) -> None:
    """Idempotent: every authenticated user has a profiles row (FK target)."""
    try:
        from api.core.db import get_db
        get_db().table("profiles").upsert({"id": user_id}).execute()
    except Exception as e:
        print(f"[auth] profile ensure failed: {type(e).__name__}: {e}")


def current_user_id(authorization: str | None = Header(default=None)) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        now = time.time()
        hit = _cache.get(token)
        if hit and hit[1] > now:
            return hit[0]
        uid = _verify_with_supabase(token)
        if uid:
            if len(_cache) > _CACHE_MAX:
                _cache.clear()
            _cache[token] = (uid, now + _CACHE_TTL_S)
            _ensure_profile(uid)
            return uid
        raise HTTPException(401, "Invalid or expired session — sign in again.")

    if settings.env == "local" and settings.dev_user_id:
        return settings.dev_user_id
    raise HTTPException(401, "Sign in required.")
