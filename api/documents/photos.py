"""Encrypted document photos — a passport scan is the most sensitive thing here.

Two defences, deliberately independent, because either alone has a single
point of failure:

  1. the bucket is private, so nothing is reachable without a signed URL or the
     service role
  2. the bytes are encrypted with the owner's DEK before they ever leave the
     process, so a bucket accidentally flipped public would expose ciphertext
     rather than passports

The second is what makes a misconfiguration an embarrassment instead of an
incident. It costs bandwidth — the API must decrypt and stream rather than
handing out a URL — and that is the trade being made knowingly.

NO URL EVER REACHES THE CLIENT. A signed URL is used internally to fetch the
object, but what the traveller receives is the decrypted bytes over an
authenticated request. get_public_url is never called here; the existing
journal and tips uploads call it against a private bucket, which is a separate
latent bug rather than a pattern to copy.
"""
from __future__ import annotations

import uuid

from api.core import crypto

BUCKET = "documents"
MAX_BYTES = 8 * 1024 * 1024          # a phone photo, not a scan of a filing cabinet
SIGNED_URL_TTL = 60                  # seconds; only ever used server-side


def ensure_bucket(db) -> None:
    """Create the private bucket on first use.

    public=False is the whole point — the journal bucket exists and is private,
    but its callers ask for public URLs, so a separate bucket keeps documents
    away from that mistake entirely.
    """
    try:
        existing = {getattr(b, "name", b) for b in db.storage.list_buckets()}
    except Exception:
        existing = set()
    if BUCKET in existing:
        return
    try:
        db.storage.create_bucket(BUCKET, options={"public": False})
        print(f"[documents] created private storage bucket {BUCKET!r}")
    except Exception as e:  # noqa: BLE001 — a concurrent create is fine
        print(f"[documents] create_bucket({BUCKET}): {type(e).__name__}: {e}")


def object_key(user_id: str, document_id: str) -> str:
    """user_id first so a storage policy can scope on the leading folder, and
    so one traveller's objects are never interleaved with another's."""
    return f"{user_id}/{document_id}/{uuid.uuid4().hex}.enc"


def upload(db, user_id: str, document_id: str, raw: bytes, dek: bytes) -> str:
    """Encrypt, then store. Returns the object key for documents.file_key."""
    if len(raw) > MAX_BYTES:
        raise ValueError(f"photo is {len(raw)} bytes, limit is {MAX_BYTES}")
    ensure_bucket(db)
    sealed = crypto.encrypt_bytes(dek, user_id, f"photo:{document_id}", raw)
    key = object_key(user_id, document_id)
    # content-type is deliberately opaque: what is stored is ciphertext, and
    # labelling it image/jpeg would invite something to try rendering it.
    db.storage.from_(BUCKET).upload(key, sealed,
                                    {"content-type": "application/octet-stream"})
    return key


def fetch(db, user_id: str, document_id: str, file_key: str, dek: bytes) -> bytes:
    """Download and decrypt. Raises DecryptionFailed if the key or owner is wrong.

    The AAD binds the ciphertext to both the traveller and the document, so an
    object key copied from another row will not open even with a valid DEK.
    """
    data = db.storage.from_(BUCKET).download(file_key)
    return crypto.decrypt_bytes(dek, user_id, f"photo:{document_id}", data)


def remove(db, file_key: str) -> None:
    try:
        db.storage.from_(BUCKET).remove([file_key])
    except Exception as e:  # noqa: BLE001 — a missing object must not block a delete
        print(f"[documents] could not remove {file_key}: {type(e).__name__}: {e}")
