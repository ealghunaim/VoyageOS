"""The webhook end to end, through the real route and the real middleware.

The unit tests cover the signature and the lifecycle rules in isolation. What
they cannot show is whether the pieces are wired together correctly — and the
wiring is where this feature fails silently:

  - if the path is not exempt from shared_secret_guard, every event 401s and
    no tier ever lands;
  - if it IS exempt but the signature is not verified, anyone can grant
    themselves Voyager.

Both are invisible in production until someone reports it.
"""
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from api.core.config import settings

SECRET = "whsec_endpoint_test"
AUTH = "Bearer endpoint-static"
USER = "11111111-1111-4111-8111-111111111111"


class FakeTable:
    def __init__(self, db, name):
        self.db, self.name, self._filters = db, name, {}

    def select(self, *a): return self
    def limit(self, n): return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    def execute(self):
        rows = [r for r in self.db.rows.get(self.name, [])
                if all(r.get(k) == v for k, v in self._filters.items())]
        return type("R", (), {"data": rows})()

    def insert(self, row):
        self.db.writes.append((self.name, "insert", row))
        existing = self.db.rows.setdefault(self.name, [])
        key = "event_id" if self.name == "webhook_events" else "user_id"
        if any(r.get(key) == row.get(key) for r in existing):
            raise RuntimeError("duplicate key value violates unique constraint")
        existing.append(dict(row))
        return type("Q", (), {"execute": lambda s: type("R", (), {"data": [row]})()})()

    def upsert(self, row, on_conflict=None):
        self.db.writes.append((self.name, "upsert", row))
        existing = self.db.rows.setdefault(self.name, [])
        key = on_conflict or "user_id"
        for i, r in enumerate(existing):
            if r.get(key) == row.get(key):
                existing[i] = {**r, **row}
                break
        else:
            existing.append(dict(row))
        return type("Q", (), {"execute": lambda s: type("R", (), {"data": [row]})()})()


class FakeDB:
    def __init__(self, profiles=(), subs=()):
        self.rows = {"profiles": [{"id": p} for p in profiles],
                     "subscriptions": list(subs), "webhook_events": []}
        self.writes = []

    def table(self, name): return FakeTable(self, name)

    def sub(self, user_id=USER):
        return next((r for r in self.rows["subscriptions"]
                     if r.get("user_id") == user_id), None)

    def ledger(self):
        return self.rows["webhook_events"]


@pytest.fixture
def db(monkeypatch):
    """A fake database, a configured secret, and — importantly — a shared
    secret that IS set, so the middleware is live and the exemption is being
    genuinely exercised rather than trivially satisfied."""
    import api.subscriptions.webhook_router as wr
    fake = FakeDB(profiles=[USER])
    monkeypatch.setattr(wr, "get_db", lambda: fake)
    monkeypatch.setattr(wr.service, "get", lambda d, u: fake.sub(u))
    monkeypatch.setattr(settings, "revenuecat_webhook_secret", SECRET)
    monkeypatch.setattr(settings, "revenuecat_webhook_auth", AUTH)
    monkeypatch.setattr(settings, "app_shared_secret", "the-app-key")
    return fake


@pytest.fixture
def client():
    from api.main import app
    return TestClient(app)


def post(client, event, *, secret=SECRET, auth=AUTH, t=None, sign_body=None):
    body = json.dumps({"event": event}).encode()
    t = int(time.time()) if t is None else t
    mac = hmac.new(secret.encode(), f"{t}.".encode() + (sign_body or body),
                   hashlib.sha256).hexdigest()
    headers = {"X-RevenueCat-Webhook-Signature": f"t={t},v1={mac}",
               "Content-Type": "application/json"}
    if auth:
        headers["Authorization"] = auth
    return client.post("/v1/webhooks/revenuecat", content=body, headers=headers)


def ev(**kw):
    base = {"id": "evt_1", "type": "INITIAL_PURCHASE", "app_user_id": USER,
            "entitlement_ids": ["voyager"], "event_timestamp_ms": 1_700_000_000_000,
            "expiration_at_ms": 1_800_000_000_000}
    base.update(kw)
    return base


# ── the two wiring failures ─────────────────────────────────────────────────

def test_a_genuine_event_reaches_the_handler_without_the_app_key(db, client):
    """Proves the exemption. app_shared_secret is set, and no x-voyageos-key
    is sent — if the path were not exempt this would be a 401."""
    r = post(client, ev())
    assert r.status_code == 200, r.text
    assert r.json()["outcome"] == "applied"
    assert db.sub()["tier"] == "voyager"


def test_an_unsigned_request_is_rejected(db, client):
    """Proves the exemption did not open a hole. This is the forgery."""
    r = client.post("/v1/webhooks/revenuecat", json={"event": ev()})
    assert r.status_code == 401
    assert db.sub() is None, "a forged event must never write a subscription"


def test_a_tampered_body_is_rejected(db, client):
    """Signed for a modest tier, sent claiming Voyager."""
    honest = json.dumps({"event": ev(entitlement_ids=["explorer"])}).encode()
    r = post(client, ev(entitlement_ids=["voyager"]), sign_body=honest)
    assert r.status_code == 401
    assert db.sub() is None


def test_a_wrong_static_header_is_rejected(db, client):
    assert post(client, ev(), auth="Bearer nope").status_code == 401
    assert db.sub() is None


def test_the_rejection_body_reveals_nothing(db, client):
    """No hint as to which check failed — that would be a tuning oracle."""
    bodies = {post(client, ev(), auth="Bearer nope").text,
              post(client, ev(), secret="wrong").text,
              post(client, ev(), t=int(time.time()) - 9999).text}
    assert len(bodies) == 1, bodies
    assert "signature" not in bodies.pop().lower()


# ── the fail-safe you asked to confirm ──────────────────────────────────────

def test_an_unmappable_user_is_recorded_and_skipped(db, client):
    r = post(client, ev(app_user_id="99999999-9999-4999-8999-999999999999"))
    assert r.status_code == 200, "must not 5xx — that provokes five retries"
    assert r.json()["outcome"] == "unmappable"
    assert db.sub() is None, "must never grant a tier to a guessed user"
    assert db.ledger()[-1]["outcome"] == "unmappable", "must still be recorded"


def test_an_anonymous_purchase_is_unmappable_not_a_crash(db, client):
    r = post(client, ev(app_user_id="$RCAnonymousID:abc123"))
    assert r.status_code == 200 and r.json()["outcome"] == "unmappable"


def test_a_missing_app_user_id_is_survivable(db, client):
    r = post(client, ev(app_user_id=None))
    assert r.status_code == 200 and db.sub() is None


# ── delivery semantics ──────────────────────────────────────────────────────

def test_a_duplicate_is_answered_200_and_applied_once(db, client):
    first = post(client, ev())
    second = post(client, ev())
    assert first.json()["outcome"] == "applied"
    assert second.json()["outcome"] == "duplicate"
    assert second.status_code == 200, "a non-2xx here causes five pointless retries"
    applied = [w for w in db.writes if w[0] == "subscriptions"]
    assert len(applied) == 1, "the event must be applied exactly once"


def test_a_stale_retry_cannot_revoke_a_paying_customer(db, client):
    """The ordering guard. An 80-minute backoff means a CANCELLATION can land
    after the RENEWAL that superseded it."""
    post(client, ev(id="evt_new", type="RENEWAL", event_timestamp_ms=2_000_000_000_000))
    assert db.sub()["tier"] == "voyager"
    r = post(client, ev(id="evt_old", type="EXPIRATION",
                        event_timestamp_ms=1_000_000_000_000))
    assert r.json()["outcome"] == "ignored_stale"
    assert db.sub()["tier"] == "voyager", "a stale event must not downgrade"


def test_an_unhandled_event_type_is_200_not_an_error(db, client):
    r = post(client, ev(type="SOMETHING_NEW"))
    assert r.status_code == 200 and r.json()["outcome"] == "unhandled"


# ── lifecycle, through the real route ───────────────────────────────────────

def test_cancellation_then_expiration(db, client):
    post(client, ev(id="e1", type="INITIAL_PURCHASE", event_timestamp_ms=1))
    assert db.sub()["tier"] == "voyager"

    post(client, ev(id="e2", type="CANCELLATION", event_timestamp_ms=2))
    assert db.sub()["tier"] == "voyager", "still paid for the period"
    assert db.sub()["status"] == "cancelled"

    post(client, ev(id="e3", type="EXPIRATION", event_timestamp_ms=3))
    assert db.sub()["tier"] == "free" and db.sub()["status"] == "lapsed"


def test_billing_issue_does_not_downgrade(db, client):
    post(client, ev(id="e1", event_timestamp_ms=1))
    post(client, ev(id="e2", type="BILLING_ISSUE", event_timestamp_ms=2))
    assert db.sub()["tier"] == "voyager" and db.sub()["status"] == "grace"


def test_the_customer_id_is_stored_for_support(db, client):
    post(client, ev())
    assert db.sub()["revenuecat_customer_id"] == USER
