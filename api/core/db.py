"""Supabase client (server-side, service key).

Fresh client per call — deliberately NOT cached. A shared singleton's
connection pool goes stale on cloud hosts (idle keep-alives get closed
by the far end → httpx.ReadError errno 11 → intermittent 500s), and it
was shared across request threads AND the worker thread. Per-call
clients cost ~ms and remove the whole failure class. Revisit with a
proper pooling story in v1.0 if latency ever matters.
"""
from supabase import Client, create_client
from api.core.config import settings


def get_db() -> Client:
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError(
            "Supabase not configured. Put SUPABASE_URL and SUPABASE_SERVICE_KEY "
            "in .env at the repo root, then restart uvicorn."
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)
