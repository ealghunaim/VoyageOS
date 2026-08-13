"""POST /v1/webhooks/revenuecat — the only unauthenticated-by-header route.

Separate from router.py because the contract is inverted. Every other route
identifies its caller from a user JWT and answers on that user's behalf; this
one is called by a machine, carries no session, is exempt from
shared_secret_guard, and decides what someone is allowed to use. Keeping the
two in one file would invite a future edit to add current_user_id here or drop
signature verification there.

WHY ALMOST EVERYTHING RETURNS 200

RevenueCat retries non-2xx five times over 80 minutes. So a 4xx is reserved
for "your request was not authentic" — where retrying is pointless and being
noisy is the point — and everything else answers 200 with an outcome recorded
in the ledger. A duplicate, an unmappable id, a stale retry and an event type
we take no action on are all *correct* handling, not failures, and making
RevenueCat retry them five times each would achieve nothing.

Genuine server faults are the exception: those return 500 so the retry is
used for what it is for.
"""
from __future__ import annotations

from fastapi import APIRouter, Request, Response

from api.core.config import settings
from api.core.db import get_db
from api.subscriptions import service, webhook, webhook_auth

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])

#: Kept in one place so main.py's middleware exemption and the route cannot
#: drift apart. A mismatch means either a permanently 401ing webhook or, far
#: worse, an exemption on a path that no longer verifies anything.
PATH = "/v1/webhooks/revenuecat"


def _record(db, event: dict, outcome: str, resolved: str | None = None) -> None:
    """Write the ledger row. Never raises — a failure to record must not turn
    a handled event into a retry."""
    try:
        db.table("webhook_events").upsert({
            "event_id": event.get("id"),
            "event_type": event.get("type"),
            "app_user_id": event.get("app_user_id"),
            "resolved_user_id": resolved,
            "event_timestamp_ms": event.get("event_timestamp_ms"),
            "outcome": outcome,
        }, on_conflict="event_id").execute()
    except Exception as e:                                   # noqa: BLE001
        print(f"[revenuecat] ledger write failed for {event.get('id')}: {e}")


@router.post("/revenuecat")
async def revenuecat(request: Request, response: Response):
    # ── authenticity ────────────────────────────────────────────────────────
    # Raw bytes, before any parsing. The signature covers exactly what was
    # sent; re-serialising parsed JSON changes key order and whitespace and
    # would fail on legitimate requests.
    raw = await request.body()
    ok, reason = webhook_auth.verify(
        raw,
        request.headers.get("X-RevenueCat-Webhook-Signature"),
        request.headers.get("Authorization"),
        secret=settings.revenuecat_webhook_secret,
        expected_auth=settings.revenuecat_webhook_auth,
    )
    if not ok:
        # Logged with the reason, answered without it. Telling a prober which
        # check failed is a tuning oracle.
        print(f"[revenuecat] rejected: {reason}")
        response.status_code = 401
        return {"detail": "unauthorized"}

    import json
    try:
        body = json.loads(raw)
    except ValueError:
        print("[revenuecat] signed but unparseable body")
        response.status_code = 400
        return {"detail": "bad request"}

    # RevenueCat nests the payload under "event"; tolerate a flat body too, so
    # a dashboard test-send with a different shape is still processed rather
    # than silently ignored.
    event = body.get("event") if isinstance(body.get("event"), dict) else body
    event_id = event.get("id")
    etype = event.get("type")
    if not event_id:
        print(f"[revenuecat] event with no id, type={etype}")
        return {"ok": True, "outcome": "unhandled"}

    db = get_db()

    # ── dedup ───────────────────────────────────────────────────────────────
    # Insert first and let the primary key decide. A read-then-write here
    # would let two instances both see "not present" and both apply the event.
    try:
        db.table("webhook_events").insert({
            "event_id": event_id, "event_type": etype,
            "app_user_id": event.get("app_user_id"),
            "event_timestamp_ms": event.get("event_timestamp_ms"),
            "outcome": "unhandled",
        }).execute()
    except Exception:                                        # noqa: BLE001
        # Almost certainly the PK conflict, which is the normal duplicate
        # path. 200 so RevenueCat stops retrying something already done.
        print(f"[revenuecat] duplicate {etype} {event_id}")
        return {"ok": True, "outcome": "duplicate"}

    # ── which user ──────────────────────────────────────────────────────────
    user_id = webhook.resolve_user(db, event)
    if not user_id:
        # Fail-safe: recorded, skipped, no row written, no retry provoked.
        print(f"[revenuecat] unmappable app_user_id={event.get('app_user_id')!r} "
              f"type={etype} id={event_id}")
        _record(db, event, "unmappable")
        return {"ok": True, "outcome": "unmappable"}

    current = service.get(db, user_id)

    # ── ordering ────────────────────────────────────────────────────────────
    # A stale CANCELLATION arriving after a fresh RENEWAL would revoke a
    # paying customer with nothing anywhere to show it happened.
    incoming_ms = event.get("event_timestamp_ms")
    last_ms = (current or {}).get("last_event_ms")
    if incoming_ms and last_ms and int(incoming_ms) < int(last_ms):
        print(f"[revenuecat] ignoring stale {etype} for {user_id}: "
              f"{incoming_ms} < {last_ms}")
        _record(db, event, "ignored_stale", user_id)
        return {"ok": True, "outcome": "ignored_stale"}

    # ── apply ───────────────────────────────────────────────────────────────
    changes = webhook.plan(event, current)
    if changes is None:
        _record(db, event, "unhandled", user_id)
        return {"ok": True, "outcome": "unhandled"}

    row = {"user_id": user_id, **changes,
           "revenuecat_customer_id": event.get("app_user_id"),
           "updated_at": "now()"}
    if incoming_ms:
        row["last_event_ms"] = int(incoming_ms)
    db.table("subscriptions").upsert(row, on_conflict="user_id").execute()

    print(f"[revenuecat] {etype} → {user_id}: {changes}")
    _record(db, event, "applied", user_id)
    return {"ok": True, "outcome": "applied"}
