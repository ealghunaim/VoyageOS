"""Rotate the master KEK: re-wrap every DEK from one version to the next.

RUN THIS ON RENDER, NOT ON YOUR LAPTOP.

Both master keys already live in Render's environment. Running there means
neither key is ever typed into a shell, stored in a history file, or held on a
machine that also runs a browser. The rotation this script exists for was
caused by a master key reaching a command line; doing the repair the same way
would be its own incident.

    Render → the service → Shell, then:

        python scripts/rotate_master.py status
        python scripts/rotate_master.py rewrap --confirm
        python scripts/rotate_master.py status

WHAT ROTATION DOES AND DOES NOT TOUCH

Only user_keys moves. Each row holds a DEK wrapped under some master key
version; re-wrapping unwraps it with the old KEK and re-seals it with the new
one. The DEK itself is unchanged, so every encrypted number and every stored
photo is left exactly as it is — no ciphertext is read, rewritten, or
re-uploaded. That is the entire reason the design is an envelope.

ORDERING

Both versions must be loaded at once. Remove the old key before the re-wrap
finishes and the rows still wrapped under it become unreadable — permanently,
because there is no recovery path. The safe order is: add the new key, point
MASTER_KEK_VERSION at it, re-wrap, verify every row moved, and only then
remove the old key.

Nothing here prints key material. Keys are identified by fingerprint —
sha256(key)[:12] — which is safe to read aloud and is how a copy in Render is
matched against the copy on paper.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client  # noqa: E402

from api.core import config  # noqa: E402,F401  — load_dotenv, so crypto sees .env
from api.core import crypto  # noqa: E402


def connect():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        print("  ✗ SUPABASE_URL / SUPABASE_SERVICE_KEY not set in the environment.")
        return None, None
    # The same guard as backfill_coords: a master key in this slot would be
    # sent to supabase.co as a bearer token and logged there.
    if crypto.looks_like_master_key(key):
        print("  ✗ REFUSING TO CONNECT — SUPABASE_SERVICE_KEY decodes to 32 bytes,")
        print("    which is a master KEK, not a Supabase key. Nothing was sent.")
        return None, None
    return create_client(url, key), url


def show_keys() -> dict[int, bytes]:
    keks = crypto._load_keks()
    if not keks:
        print("  ✗ no MASTER_KEK_V<n> in the environment.")
        return {}
    print("  master keys loaded:")
    for v in sorted(keks):
        print(f"    MASTER_KEK_V{v}   fingerprint {crypto.fingerprint(keks[v])}")
    try:
        print(f"  active version   : {crypto.active_version()}  "
              "(what new wraps use)")
    except crypto.CryptoUnavailable as e:
        print(f"  ✗ active version : {e}")
    return keks


def show_rows(db) -> dict[int, int]:
    rows = db.table("user_keys").select("user_id,key_version").execute().data
    counts: dict[int, int] = {}
    for r in rows:
        counts[r["key_version"]] = counts.get(r["key_version"], 0) + 1
    print(f"\n  user_keys rows   : {len(rows)}")
    for v in sorted(counts):
        print(f"    key_version {v}  →  {counts[v]} row(s)")
    if not rows:
        # RLS filters rather than rejects, so zero rows is ambiguous.
        print("    (zero rows: either nobody has stored a document yet, or this")
        print("     key is not service_role and RLS filtered the read to nothing)")
    return counts


def cmd_status() -> int:
    db, url = connect()
    if not db:
        return 2
    print(f"  target           : {url}\n")
    keks = show_keys()
    if not keks:
        return 2
    counts = show_rows(db)
    if not counts:
        return 0
    try:
        active = crypto.active_version()
    except crypto.CryptoUnavailable:
        return 2
    stale = {v: n for v, n in counts.items() if v != active}
    print()
    if stale:
        total = sum(stale.values())
        print(f"  ⚠️  {total} row(s) not on version {active}: {stale}")
        print("     Run:  python scripts/rotate_master.py rewrap --confirm")
        print("     Keep every listed version loaded until this reads clean.")
    else:
        print(f"  ✓ every row is on version {active}.")
        older = [v for v in sorted(keks) if v != active]
        if older:
            print(f"     MASTER_KEK_V{older[0]} is now unused and safe to remove"
                  if len(older) == 1 else
                  f"     these are now unused and safe to remove: {older}")
        else:
            print("     No older key remains in the environment.")
    return 0


def cmd_rewrap() -> int:
    db, url = connect()
    if not db:
        return 2
    print(f"  target           : {url}\n")
    keks = show_keys()
    if not keks:
        return 2
    try:
        active = crypto.active_version()
    except crypto.CryptoUnavailable as e:
        print(f"  ✗ {e}")
        return 2
    counts = show_rows(db)
    stale_versions = sorted(v for v in counts if v != active)

    # Every version currently in use must still be loaded, or its rows cannot be
    # unwrapped. Checked before writing anything, because a partial rotation
    # against a missing key destroys data.
    missing = [v for v in stale_versions if v not in keks]
    if missing:
        print(f"\n  ✗ ABORT — rows are wrapped under version(s) {missing}, which are")
        print("    not loaded. Unwrapping them is impossible; re-add the key(s)")
        print("    before rotating. Nothing was written.")
        return 2

    if not stale_versions:
        print(f"\n  nothing to do — every row is already on version {active}.")
        return 0

    want = crypto.fingerprint(keks[active])
    if "--confirm" not in sys.argv:
        print(f"\n  Would re-wrap {sum(counts[v] for v in stale_versions)} row(s) "
              f"from version(s) {stale_versions} to {active}.")
        print("  No ciphertext is touched — only user_keys.wrapped_dek.")
        print("\n  To write, state the fingerprint of version "
              f"{active} from YOUR OWN record")
        print("  (paper backup / password manager), not from the line above:")
        print(f"    python {os.path.basename(__file__)} rewrap --confirm "
              "--fingerprint=<the one you recorded>")
        return 0

    # Requiring the fingerprint from an independent record is the one check
    # that catches rotating onto a key nobody has saved. A DEK re-wrapped under
    # a key that exists only in this process is destroyed the moment the
    # process exits, and no amount of care elsewhere recovers it.
    stated = next((a.split("=", 1)[1] for a in sys.argv
                   if a.startswith("--fingerprint=")), None)
    if not stated:
        print(f"\n  ✗ ABORT — --confirm requires --fingerprint=<value>.")
        print(f"    Look up the fingerprint you recorded for version {active} when")
        print("    you generated it, and pass it. If you never recorded one, the")
        print("    key is not backed up and must not be rotated onto. Nothing written.")
        return 2
    if stated.strip().lower() != want:
        print(f"\n  ✗ ABORT — stated fingerprint does not match MASTER_KEK_V{active}.")
        print("    Either this environment holds a different key than the one you")
        print("    backed up, or the record is wrong. Both are worth stopping for.")
        print("    Nothing was written.")
        return 2

    print(f"\n  re-wrapping to version {active} …")
    result = crypto.rewrap_all(db, active)
    print(f"  {result}")
    after = show_rows(db)
    ok = all(v == active for v in after) and result["failed"] == 0
    print(f"\n  {'✓ ROTATION COMPLETE' if ok else '✗ ROTATION INCOMPLETE'} — "
          f"{'every row is on version ' + str(active) if ok else 'do NOT remove the old key'}")
    return 0 if ok else 1


def cmd_verify() -> int:
    """Actually open everything under the keys currently loaded.

    status only reads key_version, which is a label — it would report a clean
    rotation even if every wrapped DEK were garbage. This unwraps each DEK and
    decrypts each stored number, so a passing run is evidence rather than
    bookkeeping. Worth running once after removing the old key, which is the
    moment a mistake stops being recoverable.

    No secret is printed. A decrypted number is checked against number_last4,
    which is already stored in clear, so the assertion needs no plaintext.
    """
    db, url = connect()
    if not db:
        return 2
    print(f"  target           : {url}\n")
    if not show_keys():
        return 2

    rows = db.table("user_keys").select("user_id,key_version").execute().data
    print(f"\n  unwrapping {len(rows)} DEK(s):")
    deks: dict[str, bytes] = {}
    ok = True
    for r in rows:
        uid = r["user_id"]
        try:
            deks[uid] = crypto.get_or_create_user_key(db, uid).dek
            print(f"    ok    {uid[:8]}…  v{r['key_version']}")
        except Exception as e:  # noqa: BLE001
            print(f"    FAIL  {uid[:8]}…  v{r['key_version']}  {type(e).__name__}: {e}")
            ok = False

    docs = db.table("documents").select(
        "id,user_id,number_encrypted,number_last4,file_key").execute().data
    with_num = [d for d in docs if d.get("number_encrypted")]
    with_pic = [d for d in docs if d.get("file_key")]
    print(f"\n  documents: {len(docs)}   with number: {len(with_num)}   "
          f"with photo: {len(with_pic)}")
    for d in with_num:
        dek = deks.get(d["user_id"])
        if not dek:
            print(f"    FAIL  {d['id'][:8]}…  no usable DEK for its owner")
            ok = False
            continue
        try:
            num = crypto.decrypt_field(dek, d["user_id"], "number", d["number_encrypted"])
            match = crypto.last4(num) == (d.get("number_last4") or "")
            print(f"    {'ok  ' if match else 'FAIL'}  {d['id'][:8]}…  "
                  f"decrypts, last4 {'matches' if match else 'MISMATCH'}")
            ok &= match
        except Exception as e:  # noqa: BLE001
            print(f"    FAIL  {d['id'][:8]}…  {type(e).__name__}: {e}")
            ok = False
    if with_pic:
        print(f"    ({len(with_pic)} photo(s) not fetched — pass --photos to "
              "download and decrypt them too)")
        if "--photos" in sys.argv:
            from api.documents import photos as photo_store
            for d in with_pic:
                try:
                    raw = photo_store.fetch(db, d["user_id"], d["id"],
                                            d["file_key"], deks[d["user_id"]])
                    print(f"    ok    {d['id'][:8]}…  photo decrypts, {len(raw)} bytes")
                except Exception as e:  # noqa: BLE001
                    print(f"    FAIL  {d['id'][:8]}…  photo  {type(e).__name__}: {e}")
                    ok = False

    print(f"\n  {'✓ EVERYTHING OPENS under the loaded key(s)' if ok else '✗ SOMETHING DID NOT OPEN — do not remove any key'}")
    return 0 if ok else 1


def main() -> int:
    cmds = {"status": cmd_status, "rewrap": cmd_rewrap, "verify": cmd_verify}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        print(__doc__)
        print(f"  usage: {sys.argv[0]} [{' | '.join(cmds)}] [--confirm]")
        return 2
    return cmds[sys.argv[1]]()


if __name__ == "__main__":
    raise SystemExit(main())
