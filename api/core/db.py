"""Supabase client (server-side, service key). One client, created lazily."""
from functools import lru_cache
from supabase import Client, create_client
from api.core.config import settings


@lru_cache
def get_db() -> Client:
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError(
            "Supabase not configured. Put SUPABASE_URL and SUPABASE_SERVICE_KEY "
            "in .env at the repo root, then restart uvicorn."
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)
