"""Auth dependency.

v0.5 local dev: DEV_USER_ID from .env stands in for a logged-in user, so the API
can be smoke-tested before the Expo app exists. Real Supabase JWT verification
replaces the fallback in build-plan weeks 5-6 (the app will send real tokens).
The fallback only activates when ENV=local — it can never ship by accident.
"""
from fastapi import HTTPException
from api.core.config import settings


def current_user_id() -> str:
    if settings.env == "local" and settings.dev_user_id:
        return settings.dev_user_id
    raise HTTPException(
        status_code=401,
        detail="Auth not configured. For local dev set ENV=local and DEV_USER_ID in .env.",
    )
