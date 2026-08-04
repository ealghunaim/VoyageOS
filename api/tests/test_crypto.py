"""Crypto foundation tests — pure, no database, no network.

The DB-backed pieces (get_or_create_user_key, rewrap_all) are exercised
against dev separately; what matters here is that the primitives cannot be
misused quietly.
"""
from __future__ import annotations

import base64
import os

import pytest

from api.core import crypto

USER = "158f4c94-c36d-4f05-b995-10f110896684"
OTHER = "00000000-0000-0000-0000-000000000001"


@pytest.fixture(autouse=True)
def _keks(monkeypatch):
    """Two master key versions, so rotation is testable."""
    for name in list(os.environ):
        if name.startswith("MASTER_KEK"):
            monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("MASTER_KEK_V1", base64.b64encode(b"1" * 32).decode())
    monkeypatch.setenv("MASTER_KEK_V2", base64.b64encode(b"2" * 32).decode())
    monkeypatch.setenv("MASTER_KEK_VERSION", "1")


# ── round trip ───────────────────────────────────────────────────────────────

def test_field_round_trip():
    dek = crypto.new_dek()
    blob = crypto.encrypt_field(dek, USER, "number", "X1234567")
    assert crypto.decrypt_field(dek, USER, "number", blob) == "X1234567"


def test_bytes_round_trip():
    dek = crypto.new_dek()
    raw = os.urandom(4096)
    assert crypto.decrypt_bytes(dek, USER, "photo",
                                crypto.encrypt_bytes(dek, USER, "photo", raw)) == raw


def test_ciphertext_does_not_contain_plaintext():
    dek = crypto.new_dek()
    blob = crypto.encrypt_field(dek, USER, "number", "X1234567")
    assert b"X1234567" not in blob


# ── wrong key / tampering / context ──────────────────────────────────────────

def test_wrong_dek_fails():
    blob = crypto.encrypt_field(crypto.new_dek(), USER, "number", "X1234567")
    with pytest.raises(crypto.DecryptionFailed):
        crypto.decrypt_field(crypto.new_dek(), USER, "number", blob)


def test_tampered_ciphertext_fails():
    dek = crypto.new_dek()
    blob = bytearray(crypto.encrypt_field(dek, USER, "number", "X1234567"))
    blob[-1] ^= 0x01
    with pytest.raises(crypto.DecryptionFailed):
        crypto.decrypt_field(dek, USER, "number", bytes(blob))


def test_cannot_replay_another_users_field():
    """AAD binds a field to its owner — moving a row between users breaks it."""
    dek = crypto.new_dek()
    blob = crypto.encrypt_field(dek, USER, "number", "X1234567")
    with pytest.raises(crypto.DecryptionFailed):
        crypto.decrypt_field(dek, OTHER, "number", blob)


def test_cannot_replay_into_another_field():
    dek = crypto.new_dek()
    blob = crypto.encrypt_field(dek, USER, "number", "X1234567")
    with pytest.raises(crypto.DecryptionFailed):
        crypto.decrypt_field(dek, USER, "notes", blob)


def test_truncated_blob_fails_cleanly():
    with pytest.raises(crypto.DecryptionFailed):
        crypto.decrypt_field(crypto.new_dek(), USER, "number", b"short")


# ── nonces ───────────────────────────────────────────────────────────────────

def test_nonce_never_repeats_across_encryptions():
    """The one mistake this module must make impossible."""
    dek = crypto.new_dek()
    nonces = {crypto.encrypt_field(dek, USER, "number", "same")[:crypto.NONCE_LEN]
              for _ in range(500)}
    assert len(nonces) == 500


def test_same_plaintext_gives_different_ciphertext():
    dek = crypto.new_dek()
    a = crypto.encrypt_field(dek, USER, "number", "X1234567")
    b = crypto.encrypt_field(dek, USER, "number", "X1234567")
    assert a != b
    assert crypto.decrypt_field(dek, USER, "number", a) == \
           crypto.decrypt_field(dek, USER, "number", b)


# ── wrapping ─────────────────────────────────────────────────────────────────

def test_wrap_unwrap_round_trip():
    dek = crypto.new_dek()
    assert crypto.unwrap_dek(crypto.wrap_dek(dek, USER, 1), USER, 1) == dek


def test_wrapped_dek_cannot_move_between_users():
    dek = crypto.new_dek()
    wrapped = crypto.wrap_dek(dek, USER, 1)
    with pytest.raises(crypto.DecryptionFailed):
        crypto.unwrap_dek(wrapped, OTHER, 1)


def test_wrapped_dek_cannot_be_opened_by_another_kek_version():
    wrapped = crypto.wrap_dek(crypto.new_dek(), USER, 1)
    with pytest.raises(crypto.DecryptionFailed):
        crypto.unwrap_dek(wrapped, USER, 2)


def test_missing_kek_version_raises_rather_than_guessing(monkeypatch):
    monkeypatch.delenv("MASTER_KEK_V2", raising=False)
    with pytest.raises(crypto.CryptoUnavailable):
        crypto.wrap_dek(crypto.new_dek(), USER, 2)


def test_no_master_key_at_all_is_loud(monkeypatch):
    for n in ("MASTER_KEK_V1", "MASTER_KEK_V2", "MASTER_KEK_VERSION"):
        monkeypatch.delenv(n, raising=False)
    with pytest.raises(crypto.CryptoUnavailable):
        crypto.active_version()


def test_short_kek_rejected(monkeypatch):
    monkeypatch.setenv("MASTER_KEK_V3", base64.b64encode(b"tooshort").decode())
    with pytest.raises(crypto.CryptoUnavailable):
        crypto.active_version()


# ── rotation ─────────────────────────────────────────────────────────────────

def test_rotation_preserves_the_dek_so_ciphertext_survives():
    """The point of the envelope: re-wrapping must not disturb data."""
    dek = crypto.new_dek()
    sealed = crypto.encrypt_field(dek, USER, "number", "X1234567")

    wrapped_v1 = crypto.wrap_dek(dek, USER, 1)
    recovered = crypto.unwrap_dek(wrapped_v1, USER, 1)
    wrapped_v2 = crypto.wrap_dek(recovered, USER, 2)

    assert wrapped_v1 != wrapped_v2                    # the envelope changed
    assert crypto.unwrap_dek(wrapped_v2, USER, 2) == dek   # the key did not
    # and the untouched ciphertext still opens
    assert crypto.decrypt_field(crypto.unwrap_dek(wrapped_v2, USER, 2),
                                USER, "number", sealed) == "X1234567"


def test_active_version_follows_the_declared_version(monkeypatch):
    monkeypatch.setenv("MASTER_KEK_VERSION", "2")
    assert crypto.active_version() == 2


def test_active_version_defaults_to_highest(monkeypatch):
    monkeypatch.delenv("MASTER_KEK_VERSION", raising=False)
    assert crypto.active_version() == 2


def test_declared_version_without_a_key_raises(monkeypatch):
    monkeypatch.setenv("MASTER_KEK_VERSION", "9")
    with pytest.raises(crypto.CryptoUnavailable):
        crypto.active_version()


# ── helpers ──────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("number,expected", [
    ("X1234567", "4567"), ("AB 12 34 56", "3456"), ("12", "12"), ("", ""),
])
def test_last4(number, expected):
    assert crypto.last4(number) == expected


def test_bytea_hex_round_trip():
    raw = os.urandom(64)
    assert crypto._decode(crypto._encode(raw)) == raw
