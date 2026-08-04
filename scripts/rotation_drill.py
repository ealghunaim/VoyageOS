"""Prove the key-rotation path against a real database, before real data exists.

The unit tests cover the primitives, but get_or_create_user_key and rewrap_all
touch Postgres and were never exercised. Rotation is also the recovery path if
a master key is ever exposed, so it should not first be attempted during an
incident.

What this does, end to end:

  1. mint (or read) the user's DEK under MASTER_KEK_V1
  2. encrypt a sentinel and store it in a real documents row
  3. introduce MASTER_KEK_V2, in-process only — never written to .env
  4. run rewrap_all(to_version=2)
  5. assert the wrapped DEK changed, key_version is 2, the DEK itself did not
     change, and the untouched ciphertext still decrypts
  6. put everything back exactly as it was

Dev only. It writes a document row and deletes it again; run it against prod
and it will happily rotate prod keys, so the target is printed first and
--confirm is required.

    .venv/bin/python3 scripts/rotation_drill.py --confirm
"""
from __future__ import annotations

import base64
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client  # noqa: E402

from api.core import config  # noqa: E402,F401  — load_dotenv, so crypto sees the keys
from api.core import crypto  # noqa: E402

# Shaped like a real passport number, so last4 is exercised the way it
# will be in production. The drill is identified by the label, not by
# mangling the number.
SENTINEL = "X1234567"
FIELD = "number"


def env(name: str) -> str:
    if os.environ.get(name):
        return os.environ[name].strip()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        found = dict(re.findall(r"^(\w+)=(.*)$", open(os.path.join(root, ".env")).read(), re.M))
        return found.get(name, "").strip()
    except FileNotFoundError:
        return ""


def check(label: str, ok: bool, detail: str = "") -> bool:
    print(f"    {'PASS' if ok else 'FAIL'}  {label}" + (f"   {detail}" if detail else ""))
    return ok


def main() -> int:
    url, key, uid = env("SUPABASE_URL"), env("SUPABASE_SERVICE_KEY"), env("DEV_USER_ID")
    if not (url and key and uid):
        print("SUPABASE_URL / SUPABASE_SERVICE_KEY / DEV_USER_ID required."); return 2

    print(f"  target : {url}")
    print(f"  user   : {uid}")
    if "--confirm" not in sys.argv:
        print("\n  This writes and rotates key material. Re-run with --confirm.")
        return 1

    if not env("MASTER_KEK_V1"):
        print("  MASTER_KEK_V1 not set."); return 2

    db = create_client(url, key)
    try:
        db.table("user_keys").select("user_id").limit(1).execute()
    except Exception:
        print("\n  user_keys is missing — apply migration 0021 first."); return 2

    pre = db.table("user_keys").select("wrapped_dek,key_version") \
        .eq("user_id", uid).limit(1).execute().data
    existed = bool(pre)
    print(f"  user_keys row existed beforehand: {existed}\n")

    ok = True
    doc_id = None
    try:
        # ── 1 · DEK under V1 ────────────────────────────────────────────────
        os.environ["MASTER_KEK_VERSION"] = "1"
        uk = crypto.get_or_create_user_key(db, uid)
        dek_before = uk.dek
        ok &= check("DEK minted/read under V1", uk.key_version == 1,
                    f"key_version={uk.key_version}")

        row = db.table("user_keys").select("wrapped_dek,key_version") \
            .eq("user_id", uid).limit(1).execute().data[0]
        wrapped_before = crypto._decode(row["wrapped_dek"])
        ok &= check("wrapped DEK persisted", len(wrapped_before) > crypto.NONCE_LEN,
                    f"{len(wrapped_before)} bytes")

        # ── 2 · encrypt a sentinel into a real row ──────────────────────────
        blob = crypto.encrypt_field(dek_before, uid, FIELD, SENTINEL)
        doc = db.table("documents").insert({
            "user_id": uid, "type": "other", "label": "_rotation drill",
            "number_encrypted": crypto._encode(blob),
            "number_last4": crypto.last4(SENTINEL),
            "key_version": 1,
        }).execute().data[0]
        doc_id = doc["id"]
        ok &= check("sentinel stored encrypted", doc["number_last4"] == "4567",
                    f"last4={doc['number_last4']}")
        ok &= check("plaintext absent from the stored blob",
                    SENTINEL.encode() not in blob)

        # ── 3 · introduce V2, in-process only ───────────────────────────────
        os.environ["MASTER_KEK_V2"] = base64.b64encode(os.urandom(32)).decode()
        print("    ....  MASTER_KEK_V2 introduced (this process only)")

        # ── 4 · rotate ──────────────────────────────────────────────────────
        result = crypto.rewrap_all(db, to_version=2)
        ok &= check("rewrap_all reported a re-wrap", result["rewrapped"] >= 1, str(result))

        # ── 5 · the assertions that matter ──────────────────────────────────
        after = db.table("user_keys").select("wrapped_dek,key_version") \
            .eq("user_id", uid).limit(1).execute().data[0]
        wrapped_after = crypto._decode(after["wrapped_dek"])
        ok &= check("key_version is now 2", after["key_version"] == 2)
        ok &= check("the envelope changed", wrapped_after != wrapped_before)

        dek_after = crypto.unwrap_dek(wrapped_after, uid, 2)
        ok &= check("the DEK itself did NOT change", dek_after == dek_before)

        stored = db.table("documents").select("number_encrypted,key_version") \
            .eq("id", doc_id).limit(1).execute().data[0]
        ok &= check("ciphertext was not touched by the rotation",
                    crypto._decode(stored["number_encrypted"]) == blob)
        ok &= check("the old ciphertext still decrypts under the re-wrapped DEK",
                    crypto.decrypt_field(dek_after, uid, FIELD,
                                         stored["number_encrypted"]) == SENTINEL)

        # ── 6 · and V1 alone can no longer open the envelope ────────────────
        try:
            crypto.unwrap_dek(wrapped_after, uid, 1)
            ok &= check("V1 cannot open a V2 envelope", False, "it did — wrong")
        except crypto.DecryptionFailed:
            ok &= check("V1 cannot open a V2 envelope", True)

    finally:
        # ── restore ─────────────────────────────────────────────────────────
        if doc_id:
            db.table("documents").delete().eq("id", doc_id).execute()
        if existed:
            db.table("user_keys").update({
                "wrapped_dek": pre[0]["wrapped_dek"],
                "key_version": pre[0]["key_version"],
            }).eq("user_id", uid).execute()
            print("\n    restored the pre-existing user_keys row")
        else:
            db.table("user_keys").delete().eq("user_id", uid).execute()
            print("\n    removed the user_keys row this drill created")
        os.environ.pop("MASTER_KEK_V2", None)
        left = db.table("documents").select("id").eq("label", "_rotation drill").execute().data
        print(f"    drill documents remaining: {len(left)}")

    print(f"\n  ═══ {'ROTATION PATH PROVEN' if ok else 'DRILL FAILED — do not store real data'} ═══")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
