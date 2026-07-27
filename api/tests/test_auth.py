"""The front door gets tests: bearer verified + cached, bad token refused,
dev fallback only in local, production locked."""
import pytest
from fastapi import HTTPException

from api.core import auth
from api.core.config import settings


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    auth._cache.clear()
    monkeypatch.setattr(auth, "_ensure_profile", lambda uid: None)
    yield
    auth._cache.clear()


def test_valid_bearer_verifies_then_caches(monkeypatch):
    calls = []
    monkeypatch.setattr(auth, "_verify_with_supabase",
                        lambda t: calls.append(t) or "user-123")
    assert auth.current_user_id("Bearer tok-a") == "user-123"
    assert auth.current_user_id("Bearer tok-a") == "user-123"
    assert len(calls) == 1  # second hit served from cache


def test_invalid_bearer_is_401_even_in_local(monkeypatch):
    monkeypatch.setattr(auth, "_verify_with_supabase", lambda t: None)
    monkeypatch.setattr(settings, "env", "local")
    monkeypatch.setattr(settings, "dev_user_id", "dev-1")
    with pytest.raises(HTTPException) as e:
        auth.current_user_id("Bearer forged")
    assert e.value.status_code == 401  # a presented token must stand on its own


def test_no_header_local_falls_back_to_dev(monkeypatch):
    monkeypatch.setattr(settings, "env", "local")
    monkeypatch.setattr(settings, "dev_user_id", "dev-1")
    assert auth.current_user_id(None) == "dev-1"


def test_no_header_production_is_locked(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    with pytest.raises(HTTPException) as e:
        auth.current_user_id(None)
    assert e.value.status_code == 401
