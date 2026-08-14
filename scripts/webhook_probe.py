"""Send correctly- and incorrectly-signed events at the webhook.

Two jobs. Before the RevenueCat dashboard is configured, it proves the
endpoint works over real HTTP rather than only through TestClient. After
deploying, it proves the thing that matters most and is easiest to get wrong:

    an UNSIGNED request must be refused by the deployed endpoint.

That check is worth running against production every time the webhook changes.
The path is exempt from shared_secret_guard, so if signature verification is
ever misconfigured — an unset secret, a typo'd env var name — the endpoint
silently becomes a way for anyone to grant themselves any tier, and nothing
about it looks broken from the outside.

THE SECRET COMES FROM THE ENVIRONMENT AND NOWHERE ELSE

Not a file, not an argument. A file is the more dangerous of the two — it
outlives the run, survives into backups and Spotlight, and is the reason this
note exists. An argument is worse in a different way: argv is visible to any
process on the machine via ps, and lands in shell history verbatim.

Read it into the environment without it touching either. `read -rs` keeps it
off the terminal and out of history, and the leading space (with zsh's
HIST_IGNORE_SPACE, on by default here) keeps the export line out too:

     read -rs "RC_WEBHOOK_SECRET?signing secret: " && export RC_WEBHOOK_SECRET
     read -rs "RC_WEBHOOK_AUTH?authorization header: " && export RC_WEBHOOK_AUTH

Then:

    .venv/bin/python3 scripts/webhook_probe.py http://localhost:8010
    .venv/bin/python3 scripts/webhook_probe.py https://api.example.com --negative-only

Unset them when you are done:  unset RC_WEBHOOK_SECRET RC_WEBHOOK_AUTH

This script never writes the secret anywhere — not to a log, not to a temp
file, not to stdout — and refuses to accept one as an argument.

--negative-only sends ONLY the forgery attempts, which write nothing. Use it
against production: a passing run proves forgeries are refused without
touching anyone's subscription.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import time
import uuid

import httpx

PATH = "/v1/webhooks/revenuecat"


def signed(body: bytes, secret: str, t: int | None = None) -> str:
    t = int(time.time()) if t is None else t
    mac = hmac.new(secret.encode(), f"{t}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={t},v1={mac}"


def send(base: str, event: dict, secret: str, auth: str, *,
         sign_with: str | None = None, t: int | None = None,
         omit_signature: bool = False, omit_auth: bool = False,
         tamper: bool = False) -> httpx.Response:
    body = json.dumps({"event": event}).encode()
    signed_body = body
    if tamper:
        # Sign an honest payload, then send a greedier one.
        signed_body = json.dumps({"event": {**event, "entitlement_ids": ["explorer"]}}).encode()
    headers = {"Content-Type": "application/json"}
    if not omit_signature:
        headers["X-RevenueCat-Webhook-Signature"] = signed(
            signed_body, sign_with or secret, t)
    if not omit_auth and auth:
        headers["Authorization"] = auth
    return httpx.post(base.rstrip("/") + PATH, content=body, headers=headers, timeout=20)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    base = sys.argv[1]
    negative_only = "--negative-only" in sys.argv

    # Refuse a secret passed as an argument. argv is world-readable through ps
    # for the life of the process and is written to shell history verbatim, so
    # accepting one here would quietly undo the point of reading from the
    # environment. Rejecting is better than silently ignoring: someone who
    # typed it needs to know it is now in their history and should be rotated.
    for arg in sys.argv[2:]:
        if arg == "--negative-only":
            continue
        if arg.startswith("--secret") or arg.startswith("--auth") or len(arg) > 24:
            print("  refusing an argument that looks like a credential.\n"
                  "  Secrets are read from RC_WEBHOOK_SECRET / RC_WEBHOOK_AUTH only —\n"
                  "  see the module docstring. If you just typed one, it is in your\n"
                  "  shell history and should be rotated.")
            return 2
    secret = os.environ.get("RC_WEBHOOK_SECRET", "")
    auth = os.environ.get("RC_WEBHOOK_AUTH", "")
    user = os.environ.get("RC_TEST_USER_ID", str(uuid.uuid4()))
    if not secret:
        print("  RC_WEBHOOK_SECRET is not set — cannot sign anything.\n"
              "  See the module docstring for how to export it without it\n"
              "  reaching a file or your shell history.")
        return 2

    def ev(**kw):
        base_ev = {"id": f"probe_{uuid.uuid4().hex[:12]}", "type": "INITIAL_PURCHASE",
                   "app_user_id": user, "entitlement_ids": ["voyager"],
                   "event_timestamp_ms": int(time.time() * 1000),
                   "expiration_at_ms": int((time.time() + 30 * 86400) * 1000)}
        base_ev.update(kw)
        return base_ev

    #: (label, kwargs, expected status, what a wrong answer would mean)
    negatives = [
        ("unsigned request", {"omit_signature": True}, 401,
         "ANY request could grant a tier"),
        ("signature from the wrong secret", {"sign_with": "wrong-secret"}, 401,
         "the signature is not really being checked"),
        ("tampered body (signed for explorer, claims voyager)", {"tamper": True}, 401,
         "the payload can be rewritten in flight"),
        ("missing Authorization header", {"omit_auth": True}, 401 if auth else 200,
         "the static pre-filter is not applied"),
        ("replayed old timestamp", {"t": int(time.time()) - 7200}, 401,
         "a captured request could be replayed forever"),
    ]

    failures = 0
    print(f"\n  target: {base}{PATH}")
    # Lengths, never values. A probe run that fails only on the genuine event
    # is almost always a credential that never arrived: `read` inside a pasted
    # multi-line block takes the NEXT PASTED LINE as its input, so the secret
    # silently becomes command text — non-empty, so nothing complains, and the
    # signature is nonsense. Showing the lengths makes that visible in one
    # glance instead of a log hunt.
    print(f"  credentials: secret={len(secret)} chars, "
          f"auth={len(auth)} chars{' (none set)' if not auth else ''}")
    if secret and any(c in secret for c in ' \t\n'):
        print("  ⚠ the secret contains whitespace — likely a paste artefact; "
              "compare_digest is exact")
    print(f"  {'negative checks only (writes nothing)' if negative_only else 'full probe'}\n")

    print("  ── forgeries, all of which must be refused ──")
    for label, kw, expect, consequence in negatives:
        try:
            r = send(base, ev(), secret, auth, **kw)
            ok = r.status_code == expect
            print(f"    {'✓' if ok else '✗'} {label:<52} → {r.status_code} (want {expect})")
            if not ok:
                failures += 1
                print(f"        ⚠ {consequence}")
        except httpx.HTTPError as e:
            failures += 1
            print(f"    ✗ {label:<52} → transport error: {type(e).__name__}")

    if not negative_only:
        print("\n  ── a genuine event, which must be accepted ──")
        try:
            e = ev()
            r = send(base, e, secret, auth)
            ok = r.status_code == 200
            outcome = (r.json() or {}).get("outcome") if ok else None
            print(f"    {'✓' if ok else '✗'} signed event                                         "
                  f"→ {r.status_code} outcome={outcome}")
            if not ok:
                failures += 1
            elif outcome == "unmappable":
                print(f"        note: app_user_id {user[:8]}… is not a profile — set "
                      "RC_TEST_USER_ID to a real one to exercise the write path")

            # Same id twice must be applied once.
            r2 = send(base, e, secret, auth)
            dup = (r2.json() or {}).get("outcome")
            ok2 = r2.status_code == 200 and dup == "duplicate"
            print(f"    {'✓' if ok2 else '✗'} same event id again                                  "
                  f"→ {r2.status_code} outcome={dup} (want duplicate)")
            if not ok2:
                failures += 1
        except httpx.HTTPError as e:
            failures += 1
            print(f"    ✗ genuine event → transport error: {type(e).__name__}")

    print(f"\n  {'✓ all checks behave' if not failures else f'✗ {failures} FAILED'}\n")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
