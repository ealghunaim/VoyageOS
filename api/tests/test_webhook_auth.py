"""The signature check that stands alone.

Every other route sits behind shared_secret_guard. This one cannot, so these
tests are the proof that what replaced it actually holds. The failure being
guarded against is not an exception — it is a stranger POSTing JSON and
granting themselves Voyager, which looks exactly like a normal request.
"""
import hashlib
import hmac
import json
import time

from api.subscriptions.webhook_auth import MAX_SKEW_S, verify

SECRET = "whsec_test_only_not_a_real_secret"
AUTH = "Bearer static-header-value"
BODY = b'{"event":{"id":"evt_1","type":"INITIAL_PURCHASE"}}'


def sign(body: bytes, t: int | None = None, secret: str = SECRET) -> tuple[str, int]:
    t = int(time.time()) if t is None else t
    mac = hmac.new(secret.encode(), f"{t}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={t},v1={mac}", t


def test_a_genuine_request_passes():
    sig, _ = sign(BODY)
    assert verify(BODY, sig, AUTH, secret=SECRET, expected_auth=AUTH) == (True, "ok")


def test_a_forged_body_fails():
    """The whole point. Same signature, body swapped for one granting more."""
    sig, _ = sign(BODY)
    forged = BODY.replace(b"INITIAL_PURCHASE", b"RENEWAL_XXXXXXXX")
    ok, reason = verify(forged, sig, AUTH, secret=SECRET, expected_auth=AUTH)
    assert (ok, reason) == (False, "bad_signature")


def test_a_signature_from_the_wrong_secret_fails():
    sig, _ = sign(BODY, secret="not-our-secret")
    assert verify(BODY, sig, AUTH, secret=SECRET, expected_auth=AUTH)[0] is False


def test_no_signature_at_all_fails():
    assert verify(BODY, None, AUTH, secret=SECRET, expected_auth=AUTH) == \
           (False, "missing_signature")


def test_the_static_header_is_checked_first():
    """Cheap pre-filter. A valid signature must not rescue a wrong header —
    otherwise the second factor is decorative."""
    sig, _ = sign(BODY)
    assert verify(BODY, sig, "Bearer wrong", secret=SECRET, expected_auth=AUTH) == \
           (False, "bad_auth_header")


def test_a_missing_static_header_fails_when_one_is_expected():
    sig, _ = sign(BODY)
    assert verify(BODY, sig, None, secret=SECRET, expected_auth=AUTH) == \
           (False, "bad_auth_header")


def test_the_static_header_is_optional_when_not_configured():
    """A deploy that has not set it still gets full HMAC protection, rather
    than failing closed on a header nobody configured."""
    sig, _ = sign(BODY)
    assert verify(BODY, sig, None, secret=SECRET, expected_auth="") == (True, "ok")


def test_an_unset_signing_secret_rejects_everything():
    """Fails CLOSED. With no secret the endpoint could not distinguish anyone
    from RevenueCat, so it must refuse rather than accept. A webhook that
    rejects real events is a visible outage; one that accepts forged events is
    an invisible giveaway."""
    sig, _ = sign(BODY)
    assert verify(BODY, sig, AUTH, secret="", expected_auth=AUTH) == \
           (False, "no_secret_configured")


def test_a_stale_timestamp_is_rejected():
    sig, _ = sign(BODY, t=int(time.time()) - MAX_SKEW_S - 60)
    assert verify(BODY, sig, AUTH, secret=SECRET, expected_auth=AUTH) == \
           (False, "stale_timestamp")


def test_a_far_future_timestamp_is_also_rejected():
    """Bounded in both directions. Only checking the past would let a captured
    request be replayed indefinitely by one signed far ahead."""
    sig, _ = sign(BODY, t=int(time.time()) + MAX_SKEW_S + 60)
    assert verify(BODY, sig, AUTH, secret=SECRET, expected_auth=AUTH) == \
           (False, "stale_timestamp")


def test_ordinary_clock_skew_is_tolerated():
    for offset in (-MAX_SKEW_S + 5, 0, MAX_SKEW_S - 5):
        sig, _ = sign(BODY, t=int(time.time()) + offset)
        assert verify(BODY, sig, AUTH, secret=SECRET, expected_auth=AUTH)[0] is True, offset


def test_replaying_an_old_capture_verbatim_fails():
    """The exact attack the timestamp bound exists for: a request that WAS
    genuine, resent later. Signature still valid, timestamp no longer is."""
    sig, t = sign(BODY, t=int(time.time()) - 3600)
    ok, reason = verify(BODY, sig, AUTH, secret=SECRET, expected_auth=AUTH)
    assert (ok, reason) == (False, "stale_timestamp")


def test_malformed_signature_headers_are_rejected_not_raised():
    sig_ok, t = sign(BODY)
    for bad in ("", "garbage", "t=abc,v1=def", "v1=onlysig", f"t={t}",
                "t=,v1=", f"t={t},v1="):
        ok, reason = verify(BODY, bad, AUTH, secret=SECRET, expected_auth=AUTH)
        assert ok is False, bad
        assert reason in ("malformed_signature", "missing_signature"), (bad, reason)


def test_header_part_order_and_whitespace_do_not_matter():
    t = int(time.time())
    mac = hmac.new(SECRET.encode(), f"{t}.".encode() + BODY, hashlib.sha256).hexdigest()
    for header in (f"t={t},v1={mac}", f"v1={mac},t={t}", f" t={t} , v1={mac} "):
        assert verify(BODY, header, AUTH, secret=SECRET, expected_auth=AUTH)[0] is True, header


def test_reserialised_json_does_not_verify():
    """Why the router must read raw bytes.

    This is the trap: verifying against json.dumps(parsed_body) fails on
    genuine requests because key order and spacing differ, and the tempting
    fix is to relax the check until it passes — at which point it verifies
    nothing. Pinning the behaviour here so nobody "fixes" it that way.
    """
    # Compact, as a real sender emits it. json.dumps re-inflates the spacing,
    # which is exactly the mismatch that breaks naive verification.
    original = b'{"b":2,"a":1}'
    sig, _ = sign(original)
    reserialised = json.dumps(json.loads(original)).encode()
    assert reserialised != original, "pick a body whose re-serialisation differs"
    assert verify(original, sig, AUTH, secret=SECRET, expected_auth=AUTH)[0] is True
    assert verify(reserialised, sig, AUTH, secret=SECRET, expected_auth=AUTH)[0] is False


def test_an_empty_body_still_verifies_correctly():
    sig, _ = sign(b"")
    assert verify(b"", sig, AUTH, secret=SECRET, expected_auth=AUTH)[0] is True
    assert verify(b"x", sig, AUTH, secret=SECRET, expected_auth=AUTH)[0] is False
