"""Signed URLs for the private `journal` bucket.

The bucket has always been private, but both upload paths asked it for public
URLs. Those never resolved — a public URL against a private bucket is simply
rejected — so journal and tip photos were being stored as links that could not
be opened. Nothing had been uploaded yet, so nothing was visibly broken; the
shape was just waiting to be copied.

The fix is not to swap get_public_url for create_signed_url at the same spot.
A signed URL expires, and these are written into a database column, so
persisting one only moves the breakage a few days out. What is stored is the
object key; a URL is minted when someone actually looks.

Kept apart from the document vault on purpose. Journal photos are holiday
snaps: private, but not the class of thing that warrants encryption at rest
and byte-streaming through the API. Documents get that treatment in
api/documents/photos.py, and the two should not drift into sharing a path.
"""
from __future__ import annotations

BUCKET = "journal"
TTL_SECONDS = 60 * 60          # an hour: long enough to scroll a trip, short
                               # enough that a leaked link is not a lasting one


def sign(db, keys: list[str] | None) -> list[str]:
    """Object keys in, viewable URLs out. Never raises.

    A photo that will not sign is dropped from the list rather than breaking
    the note or tip it belongs to — the text is the point, the picture is not.
    """
    out: list[str] = []
    for key in keys or []:
        # Tolerate rows written before this change, which hold a URL already.
        if key.startswith("http"):
            out.append(key)
            continue
        try:
            res = db.storage.from_(BUCKET).create_signed_url(key, TTL_SECONDS)
            url = res.get("signedURL") or res.get("signedUrl") if isinstance(res, dict) else None
            if url:
                out.append(url)
        except Exception as e:  # noqa: BLE001
            print(f"[photos] could not sign {key}: {type(e).__name__}: {e}")
    return out
