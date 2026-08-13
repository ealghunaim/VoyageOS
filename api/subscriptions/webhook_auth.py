"""Proving a webhook request really came from RevenueCat.

WHY THIS FILE CARRIES MORE WEIGHT THAN IT LOOKS

Every other route in this API sits behind shared_secret_guard, which rejects
anything without x-voyageos-key. RevenueCat cannot send that header, so the
webhook path is exempt from it — and that exemption removes the layer every
other endpoint leans on. What is left is this module. A mistake here is not a
leaked read; it is a stranger POSTing JSON and granting themselves Voyager,
repeatedly, with no purchase and nothing in the payment records to notice.

TWO CHECKS, IN THIS ORDER

  1. A static Authorization header, configured in the RevenueCat dashboard.
     Cheap: one constant-time comparison, no hashing. It exists to throw out
     scanners and stray traffic before any real work happens.

  2. HMAC-SHA256 over "<timestamp>.<raw body>", which is the check that
     actually proves authenticity.

Neither alone is sufficient, for different reasons. The static header is a
bearer string that never changes and is sent on every single request — the
kind of credential that ends up in a log aggregator or an APM trace, and once
it does, forgery is trivial. The HMAC is what survives that exposure, because
the signing secret is never transmitted. Conversely the HMAC alone would mean
hashing every piece of junk that finds the URL.

THE RAW BODY IS NOT OPTIONAL

The signature covers the exact bytes RevenueCat sent. Re-serialising parsed
JSON changes key order and whitespace, so verifying against json.dumps(...)
of a parsed body fails on legitimate requests — and the tempting "fix" is to
loosen the check until it passes, which is how this ends up verifying nothing.
The caller must read the body as bytes and parse only after verifying.

WHAT IS NOT DONE HERE

No IP allowlisting. RevenueCat does not publish stable egress ranges, so it
would break silently on their infrastructure changes while adding nothing the
HMAC does not already give.
"""
from __future__ import annotations

import hashlib
import hmac
import time

#: How far the signed timestamp may be from our clock. RevenueCat retries over
#: 80 minutes, but each retry is signed afresh, so this bounds replay of a
#: captured request without rejecting honest deliveries. Generous enough to
#: absorb ordinary clock skew between their servers and ours.
MAX_SKEW_S = 300

#: Reasons, for our logs only. They are deliberately never returned to the
#: caller: telling a prober whether the signature or the timestamp was wrong
#: turns the endpoint into a tuning oracle.
REASONS = (
    "no_secret_configured",
    "bad_auth_header",
    "missing_signature",
    "malformed_signature",
    "stale_timestamp",
    "bad_signature",
    "ok",
)


def _parse_signature(header: str) -> tuple[int, str] | None:
    """Split `t=<unix seconds>,v1=<hex>` into its parts.

    Tolerates ordering and stray whitespace, rejects anything else. Returns
    None rather than raising — a malformed header is an untrusted input, not
    an exceptional condition.
    """
    t: int | None = None
    v1: str | None = None
    for part in header.split(","):
        key, _, value = part.strip().partition("=")
        if key == "t":
            try:
                t = int(value)
            except ValueError:
                return None
        elif key == "v1":
            v1 = value.strip()
    if t is None or not v1:
        return None
    return t, v1


def verify(raw_body: bytes, signature_header: str | None,
           auth_header: str | None, *, secret: str, expected_auth: str,
           now: float | None = None) -> tuple[bool, str]:
    """(ok, reason). Reason is for logging, never for the response body.

    Fails closed on missing configuration. An unset signing secret means the
    endpoint would accept anything, so it refuses everything instead — a
    webhook that rejects real events is a visible, fixable outage, while one
    that accepts forged events is an invisible, unfixable giveaway.
    """
    if not secret:
        return False, "no_secret_configured"

    # Check 1 — the cheap pre-filter. Skipped only when nothing is configured,
    # so a deployment that has not set it yet still gets HMAC protection.
    if expected_auth:
        if not auth_header or not hmac.compare_digest(auth_header, expected_auth):
            return False, "bad_auth_header"

    # Check 2 — the one that proves authenticity.
    if not signature_header:
        return False, "missing_signature"
    parsed = _parse_signature(signature_header)
    if not parsed:
        return False, "malformed_signature"
    t, sent = parsed

    # Bounded in BOTH directions. A far-future timestamp is as suspicious as
    # an old one, and only checking the past would let a captured request be
    # replayed indefinitely by one signed far ahead.
    current = time.time() if now is None else now
    if abs(current - t) > MAX_SKEW_S:
        return False, "stale_timestamp"

    expected = hmac.new(
        secret.encode("utf-8"),
        f"{t}.".encode("utf-8") + raw_body,
        hashlib.sha256,
    ).hexdigest()

    # compare_digest, never ==. String equality short-circuits on the first
    # differing byte, which leaks how much of a guess was right and makes the
    # signature forgeable one byte at a time given enough attempts.
    if not hmac.compare_digest(expected, sent):
        return False, "bad_signature"

    return True, "ok"
