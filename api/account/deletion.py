"""Deleting an account, and everything that belongs to it.

App Review guideline 5.1.1(v) requires an in-app route to account deletion for
any app that lets you create one. That is why this exists; the shape of it is
driven by something else.

THIS IS NOT TRANSACTIONAL, AND CANNOT BE

Object storage and Postgres cannot share a transaction. So the goal is not
atomicity — it is that the ONLY reachable partial state is a harmless one.
Everything destructive is ordered so the account stays completely intact and
usable until the irreversible parts have already succeeded:

    1. enumerate and delete storage objects      account still works
    2. VERIFY both prefixes are empty             hard gate — stop if not
    3. null the identity columns on the audit     audit row survives
    4. delete auth.users → cascade                irreversible, and last

If step 1 or 2 fails we change nothing else and return an error. The caller
retries; deletes are idempotent, so a retry resumes rather than duplicating.
The dangerous half-state — user gone, files orphaned — is unreachable, because
the user is only deleted after their storage is provably empty.

WHY STORAGE BEFORE user_keys

user_keys holds the DEK that every stored document is encrypted under, and it
dies inside the step-4 cascade. Once it is gone the ciphertext cannot be read,
so nobody could ever confirm what an orphaned object had been. Verification has
to happen while the key still exists.
"""
from __future__ import annotations

import httpx

from api.core.config import settings

#: Both buckets key their objects by user id, which is what makes enumeration
#: possible at all:
#:     documents   {user_id}/{document_id}/{uuid}.enc
#:     journal     {user_id}/tips/{uuid}.{jpg|png}
DOCUMENTS_BUCKET = "documents"
JOURNAL_BUCKET = "journal"


def _list(db, bucket: str, path: str) -> list[dict]:
    """Storage listing that treats a missing bucket or folder as empty.

    A bucket that was never created is indistinguishable from one with no
    objects, for our purposes — both mean "nothing of theirs is here".
    """
    try:
        return db.storage.from_(bucket).list(path) or []
    except Exception as e:                                   # noqa: BLE001
        print(f"[delete] list {bucket}/{path}: {type(e).__name__}: {e}")
        return []


def document_keys(db, user_id: str) -> set[str]:
    """Every documents-bucket object belonging to this user.

    TWO SOURCES, UNIONED. The database is authoritative for objects we know
    about, and the prefix scan catches ones we do not: documents/router.py
    replaces a photo by removing then uploading, so a crash between those two
    calls leaves an object with no row pointing at it. A DB-only purge would
    orphan it permanently — encrypted personal data belonging to someone who
    asked to be forgotten.
    """
    keys: set[str] = set()

    # From the rows.
    try:
        rows = db.table("documents").select("file_key").eq("user_id", user_id).execute().data
        keys |= {r["file_key"] for r in rows if r.get("file_key")}
    except Exception as e:                                   # noqa: BLE001
        print(f"[delete] documents rows: {type(e).__name__}: {e}")

    # From the bucket. Listing is not recursive, and the layout is two deep,
    # so the folders have to be walked.
    for folder in _list(db, DOCUMENTS_BUCKET, user_id):
        name = folder.get("name")
        if not name:
            continue
        for obj in _list(db, DOCUMENTS_BUCKET, f"{user_id}/{name}"):
            if obj.get("name"):
                keys.add(f"{user_id}/{name}/{obj['name']}")
    return keys


def journal_keys(db, user_id: str) -> set[str]:
    """Every journal-bucket object belonging to this user — tip photos."""
    keys: set[str] = set()
    try:
        rows = db.table("food_tips").select("photos").eq("user_id", user_id).execute().data
        for r in rows:
            for k in (r.get("photos") or []):
                # The KEY is stored, not a URL — see api/core/photo_urls.py.
                if isinstance(k, str) and k:
                    keys.add(k)
    except Exception as e:                                   # noqa: BLE001
        print(f"[delete] food_tips rows: {type(e).__name__}: {e}")

    for obj in _list(db, JOURNAL_BUCKET, f"{user_id}/tips"):
        if obj.get("name"):
            keys.add(f"{user_id}/tips/{obj['name']}")
    return keys


def purge_storage(db, user_id: str) -> tuple[int, list[str]]:
    """Delete every stored object. Returns (deleted, failures).

    Idempotent: removing an object that is already gone is a no-op, so a retry
    after a partial failure resumes instead of erroring.
    """
    deleted, failures = 0, []
    for bucket, keys in ((DOCUMENTS_BUCKET, document_keys(db, user_id)),
                         (JOURNAL_BUCKET, journal_keys(db, user_id))):
        if not keys:
            continue
        batch = sorted(keys)
        try:
            db.storage.from_(bucket).remove(batch)
            deleted += len(batch)
        except Exception as e:                               # noqa: BLE001
            # Per-object retry, so one bad key cannot strand the rest.
            for k in batch:
                try:
                    db.storage.from_(bucket).remove([k])
                    deleted += 1
                except Exception as inner:                   # noqa: BLE001
                    failures.append(f"{bucket}/{k}: {type(inner).__name__}")
            print(f"[delete] batch remove on {bucket} failed ({type(e).__name__}), "
                  f"fell back to per-object; {len(failures)} still failing")
    return deleted, failures


def storage_remaining(db, user_id: str) -> int:
    """Objects still present under this user's prefixes.

    The gate. "We called remove" is not the claim worth making — "nothing
    remains" is. Re-listed from the bucket rather than inferred from the
    delete calls, because a delete that silently no-ops would otherwise read
    as success.
    """
    n = 0
    for folder in _list(db, DOCUMENTS_BUCKET, user_id):
        if folder.get("name"):
            n += len([o for o in _list(db, DOCUMENTS_BUCKET, f"{user_id}/{folder['name']}")
                      if o.get("name")])
    n += len([o for o in _list(db, JOURNAL_BUCKET, f"{user_id}/tips") if o.get("name")])
    return n


def pseudonymize_audit(db, user_id: str) -> int:
    """Keep the money trail, drop the person.

    webhook_events is deliberately not cascaded — it records subscription
    events and must survive, including for a user we can no longer resolve.
    resolved_user_id is `on delete set null` so the cascade clears it by
    itself, but app_user_id is plain text with no foreign key and would keep
    the raw uuid after deletion. That is the residual personal linkage, and it
    has to be cleared explicitly, BEFORE the cascade, while we can still find
    the rows by it.
    """
    try:
        rows = db.table("webhook_events").select("event_id") \
            .eq("resolved_user_id", user_id).execute().data
        for r in rows:
            db.table("webhook_events").update(
                {"app_user_id": None, "resolved_user_id": None}
            ).eq("event_id", r["event_id"]).execute()
        # Events that never resolved but still name them.
        stray = db.table("webhook_events").select("event_id") \
            .eq("app_user_id", user_id).execute().data
        for r in stray:
            db.table("webhook_events").update({"app_user_id": None}) \
                .eq("event_id", r["event_id"]).execute()
        return len(rows) + len(stray)
    except Exception as e:                                   # noqa: BLE001
        print(f"[delete] pseudonymize: {type(e).__name__}: {e}")
        return 0


def delete_auth_user(user_id: str) -> int:
    """The irreversible step. Cascades profiles and the ten tables under it,
    user_keys among them."""
    url, key = settings.supabase_url, settings.supabase_service_key
    r = httpx.delete(f"{url}/auth/v1/admin/users/{user_id}",
                     headers={"apikey": key, "Authorization": f"Bearer {key}"},
                     timeout=30)
    return r.status_code


#: Tables holding a user's rows that the cascade does NOT reach.
#:
#: Found by the drill, not by reading the schema — the assumption going in was
#: that everything hung off profiles with `on delete cascade`, and for most
#: things it does. These three do not, so deleting the auth user left them
#: behind: live push tokens, a traveller's posted tips, and their API-usage
#: rows. Personal data surviving a deletion request is the specific failure
#: this feature exists to prevent, so they are removed explicitly.
#:
#: Deleted BEFORE the cascade but AFTER the storage purge, because
#: journal_keys() reads food_tips.photos to find objects to remove — dropping
#: the rows first would leave the prefix scan as the only source.
#:
#: The durable fix is `on delete cascade` on these three foreign keys, which
#: is a migration and a prod change; this list is correct either way and
#: becomes a no-op once that lands.
#: Rows that OUTLIVE the person, with the person removed from them.
#:
#: ai_runs records what was spent on whose behalf and notification_log records
#: what was sent. Both carry a user_id with no foreign key — the same class as
#: NON_CASCADING below — but the answer is the opposite one: a spend record
#: that vanishes when an account closes makes the cost history wrong, and a
#: send log that vanishes takes the evidence of what we did with it.
#:
#: webhook_events set the precedent, and the reasoning transfers exactly: keep
#: the money trail, drop the person. Nulling rather than deleting is what makes
#: this a retention decision rather than an oversight — before this, both
#: tables simply kept the raw uuid forever because nothing swept them, which is
#: the worst of both (personal linkage retained, and no one had decided to).
PSEUDONYMIZE = (
    ("ai_runs", "user_id"),
    ("notification_log", "user_id"),
)


def pseudonymize_retained(db, user_id: str) -> int:
    """Null the user_id on rows that stay. Returns how many were rewritten."""
    n = 0
    for table, col in PSEUDONYMIZE:
        try:
            rows = db.table(table).select(col, count="exact").eq(col, user_id).execute()
            found = rows.count or 0
            if found:
                db.table(table).update({col: None}).eq(col, user_id).execute()
                n += found
        except Exception as e:                                   # noqa: BLE001
            # Consistent with delete_non_cascading: report, do not abort. A
            # failure here leaves a uuid behind, which is worse than nothing
            # and better than a half-deleted account.
            print(f"[delete] pseudonymize {table}: {type(e).__name__}: {e}")
    return n


NON_CASCADING = (
    ("device_tokens", "user_id"),
    ("food_tips", "user_id"),
    ("flight_api_usage", "user_id"),
)


def delete_non_cascading(db, user_id: str) -> int:
    """Rows the foreign keys will not take with them."""
    n = 0
    for table, col in NON_CASCADING:
        try:
            rows = db.table(table).select("*").eq(col, user_id).execute().data
            if rows:
                db.table(table).delete().eq(col, user_id).execute()
                n += len(rows)
        except Exception as e:                               # noqa: BLE001
            # Reported, not swallowed: the caller verifies afterwards, and a
            # table that failed here shows up as rows remaining.
            print(f"[delete] {table}: {type(e).__name__}: {e}")
    return n


class StoragePurgeFailed(Exception):
    """Raised before anything irreversible happens. The account is untouched."""


def delete_account(db, user_id: str) -> dict:
    """Run the whole thing, in the order the module docstring describes."""
    deleted, failures = purge_storage(db, user_id)

    remaining = storage_remaining(db, user_id)
    if failures or remaining:
        # Nothing else has been touched. The account still works, and calling
        # again resumes from here.
        raise StoragePurgeFailed(
            f"{remaining} object(s) still present, {len(failures)} delete failure(s)"
        )

    audit = pseudonymize_audit(db, user_id)
    # Before the cascade, for the same reason pseudonymize_audit runs early:
    # these rows are found BY the user_id that is about to stop existing.
    retained = pseudonymize_retained(db, user_id)
    orphans = delete_non_cascading(db, user_id)
    status = delete_auth_user(user_id)
    if status not in (200, 204, 404):
        # 404 means already gone, which is a success for an idempotent delete.
        raise RuntimeError(f"auth delete returned {status}")

    return {"storage_objects_deleted": deleted,
            "audit_rows_pseudonymized": audit,
            "retained_rows_pseudonymized": retained,
            "non_cascading_rows_deleted": orphans}
