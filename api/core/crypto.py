"""Envelope encryption for Class C document data.

    MASTER_KEK (env)                      never in the repo, never in the DB
         │  AES-GCM wrap, AAD = user_id
         ▼
    per-user DEK (32 random bytes)        stored wrapped in user_keys
         │  AES-GCM seal, AAD = user_id:field
         ▼
    passport number, photo bytes          documents.number_encrypted / storage

WHY ENVELOPE RATHER THAN DERIVING KEYS FROM THE MASTER

A key derived from the master changes when the master changes, so rotating the
master would mean decrypting and re-encrypting every number and every photo.
That is gigabytes, a maintenance window, and in practice a job nobody runs —
which means the key never rotates. Wrapping instead keeps the DEK stable: a
master rotation re-wraps one small row per user and no ciphertext moves.

WHAT AAD BUYS

Every seal is bound to context — a wrapped DEK to its user_id, a field to
"user_id:field". Someone holding the database cannot move a wrapped key to
another user's row, or paste one document's encrypted number into another's:
the tag stops verifying. Confidentiality without binding still lets an
attacker with write access shuffle rows.

NONCES

Twelve random bytes per seal, from os.urandom, stored as a prefix on the
ciphertext. Never derived, never counted, never reused — nonce reuse under
GCM leaks the XOR of two plaintexts and can expose the authentication key, so
it is the one mistake this module must make impossible. Random-per-call is
safe here because the volume is documents, not packets.

KEY LOSS

There is no recovery. If every copy of the master KEK is lost, every number
and photo is permanently unreadable — that is the property being bought, and
it cuts both ways. Backups belong in three places: Render's environment, a
password manager, and offline on paper. Restore from the offline copy once as
a drill before real data is stored; an untested backup is not a backup.
"""
from __future__ import annotations

import base64
import os
from dataclasses import dataclass

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

NONCE_LEN = 12
DEK_LEN = 32


class CryptoUnavailable(RuntimeError):
    """No usable master key. Raised loudly rather than falling back to plaintext."""


class DecryptionFailed(ValueError):
    """Wrong key, tampered ciphertext, or wrong context. Never says which."""


# ── master keys ──────────────────────────────────────────────────────────────
#
# Read from the environment as MASTER_KEK_V1, MASTER_KEK_V2, … each a base64
# 32-byte value. MASTER_KEK_VERSION names the one new wraps use; older versions
# stay loaded so existing rows keep decrypting during a rotation.

def _load_keks() -> dict[int, bytes]:
    keks: dict[int, bytes] = {}
    for name, raw in os.environ.items():
        if not name.startswith("MASTER_KEK_V") or not raw.strip():
            continue
        suffix = name[len("MASTER_KEK_V"):]
        if not suffix.isdigit():
            continue
        try:
            key = base64.b64decode(raw.strip())
        except Exception as e:
            raise CryptoUnavailable(f"{name} is not valid base64") from e
        if len(key) != 32:
            raise CryptoUnavailable(f"{name} must decode to 32 bytes, got {len(key)}")
        keks[int(suffix)] = key
    return keks


def active_version() -> int:
    """Which KEK new wraps use. Defaults to the highest version present."""
    keks = _load_keks()
    if not keks:
        raise CryptoUnavailable(
            "No MASTER_KEK_V<n> in the environment. Document encryption is "
            "unavailable; set one before storing any number or photo.")
    declared = os.environ.get("MASTER_KEK_VERSION", "").strip()
    if declared.isdigit():
        v = int(declared)
        if v not in keks:
            raise CryptoUnavailable(f"MASTER_KEK_VERSION={v} but MASTER_KEK_V{v} is not set")
        return v
    return max(keks)


def _kek(version: int) -> bytes:
    keks = _load_keks()
    if version not in keks:
        raise CryptoUnavailable(
            f"MASTER_KEK_V{version} is not set — rows wrapped with it cannot be "
            "read. During a rotation every in-use version must stay loaded.")
    return keks[version]


def generate_master_kek() -> str:
    """A fresh base64 master key, for setting up an environment. Never stored."""
    return base64.b64encode(os.urandom(32)).decode()


# ── the primitive ────────────────────────────────────────────────────────────

def _seal(key: bytes, plaintext: bytes, aad: bytes) -> bytes:
    nonce = os.urandom(NONCE_LEN)          # random per call, never derived
    return nonce + AESGCM(key).encrypt(nonce, plaintext, aad)


def _open(key: bytes, blob: bytes, aad: bytes) -> bytes:
    if len(blob) <= NONCE_LEN:
        raise DecryptionFailed("ciphertext too short to contain a nonce")
    try:
        return AESGCM(key).decrypt(blob[:NONCE_LEN], blob[NONCE_LEN:], aad)
    except InvalidTag as e:
        # Deliberately uniform: a caller learns that it failed, never why.
        raise DecryptionFailed("could not decrypt") from e


# ── data-encryption keys ─────────────────────────────────────────────────────

@dataclass(frozen=True)
class UserKey:
    dek: bytes
    key_version: int


def wrap_dek(dek: bytes, user_id: str, version: int) -> bytes:
    if len(dek) != DEK_LEN:
        raise ValueError(f"DEK must be {DEK_LEN} bytes")
    return _seal(_kek(version), dek, user_id.encode())


def unwrap_dek(wrapped: bytes, user_id: str, version: int) -> bytes:
    return _open(_kek(version), wrapped, user_id.encode())


def new_dek() -> bytes:
    return os.urandom(DEK_LEN)


def get_or_create_user_key(db, user_id: str) -> UserKey:
    """The user's DEK, minting and storing one on first use.

    Read-through rather than provisioned up front: a traveller who never stores
    a document never has a key, so there is nothing to lose or rotate for them.
    """
    rows = db.table("user_keys").select("wrapped_dek,key_version") \
        .eq("user_id", user_id).limit(1).execute().data
    if rows:
        version = rows[0]["key_version"]
        return UserKey(dek=unwrap_dek(_decode(rows[0]["wrapped_dek"]), user_id, version),
                       key_version=version)
    version = active_version()
    dek = new_dek()
    db.table("user_keys").insert({
        "user_id": user_id,
        "wrapped_dek": _encode(wrap_dek(dek, user_id, version)),
        "key_version": version,
    }).execute()
    return UserKey(dek=dek, key_version=version)


# PostgREST carries bytea as a hex string ("\\x…"); these keep that detail here
# rather than leaking it into every caller.
def _encode(raw: bytes) -> str:
    return "\\x" + raw.hex()


def _decode(value) -> bytes:
    if isinstance(value, bytes):
        return value
    text = str(value)
    return bytes.fromhex(text[2:] if text.startswith("\\x") else text)


# ── fields ───────────────────────────────────────────────────────────────────

def encrypt_field(dek: bytes, user_id: str, field: str, plaintext: str) -> bytes:
    """Seal one field. `field` enters the AAD, so a number cannot be replayed
    into a different column or a different document."""
    return _seal(dek, plaintext.encode(), f"{user_id}:{field}".encode())


def decrypt_field(dek: bytes, user_id: str, field: str, blob) -> str:
    return _open(dek, _decode(blob), f"{user_id}:{field}".encode()).decode()


def encrypt_bytes(dek: bytes, user_id: str, field: str, raw: bytes) -> bytes:
    """Photos take the same path as numbers — one primitive, not two."""
    return _seal(dek, raw, f"{user_id}:{field}".encode())


def decrypt_bytes(dek: bytes, user_id: str, field: str, blob) -> bytes:
    return _open(dek, _decode(blob), f"{user_id}:{field}".encode())


def last4(number: str) -> str:
    """What a list shows instead of decrypting every row to render it."""
    digits = "".join(c for c in number if c.isalnum())
    return digits[-4:] if len(digits) >= 4 else digits


# ── rotation ─────────────────────────────────────────────────────────────────

def rewrap_user(db, user_id: str, to_version: int) -> bool:
    """Move one user's DEK to a new master key version.

    The DEK itself does not change, so nothing that it encrypted is touched —
    no number is decrypted, no photo is downloaded. That is the whole reason
    for the envelope.
    """
    rows = db.table("user_keys").select("wrapped_dek,key_version") \
        .eq("user_id", user_id).limit(1).execute().data
    if not rows or rows[0]["key_version"] == to_version:
        return False
    dek = unwrap_dek(_decode(rows[0]["wrapped_dek"]), user_id, rows[0]["key_version"])
    db.table("user_keys").update({
        "wrapped_dek": _encode(wrap_dek(dek, user_id, to_version)),
        "key_version": to_version,
        "rotated_at": "now()",
    }).eq("user_id", user_id).execute()
    return True


def rewrap_all(db, to_version: int) -> dict:
    """Re-wrap every DEK not already on `to_version`.

    Each user is independent — one failure is recorded and the pass continues,
    because stopping halfway would leave the estate split across versions with
    no record of where it stopped.
    """
    _kek(to_version)                       # fail fast if the target key is absent
    rows = db.table("user_keys").select("user_id,key_version").execute().data
    done = failed = skipped = 0
    for r in rows:
        if r["key_version"] == to_version:
            skipped += 1
            continue
        try:
            done += 1 if rewrap_user(db, r["user_id"], to_version) else 0
        except Exception as e:  # noqa: BLE001 — one bad row must not halt a rotation
            print(f"[crypto] re-wrap failed for {r['user_id']}: {type(e).__name__}: {e}")
            failed += 1
    return {"rewrapped": done, "already": skipped, "failed": failed,
            "to_version": to_version}
