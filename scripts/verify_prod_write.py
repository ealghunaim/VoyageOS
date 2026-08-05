"""Observe a real document write against prod, without flipping app.json.

Migration 0022 dropped documents.key_version. The code that stopped writing it
was traced — every payload the router sends was recorded — but tracing is not
observing, and the only thing that proves the two halves agree is a write that
actually lands on the deployed API against the migrated database.

Flipping app.json to prod would also do it, but that means destroying the local
dev override with `git checkout`, rebuilding, testing, and restoring — four
chances to leave the file in the wrong state. This talks to prod directly and
changes nothing on disk.

What it does, and undoes:

    sign in                → a real prod session, password read with getpass
    POST   /v1/documents   → creates a document WITH a number, which is the
                             write that would fail if key_version were still
                             being sent to the dropped column
    GET    …/number        → reveals it, proving the ciphertext round-trips
    DELETE /v1/documents   → removes it again

The prod URL and publishable key come from the committed app.json, so there is
nothing to paste and nothing to mistype. The password is never echoed, never
passed as an argument, and never stored.

    .venv/bin/python3 scripts/verify_prod_write.py --dry-run   # show the target
    .venv/bin/python3 scripts/verify_prod_write.py             # run it
"""
from __future__ import annotations

import getpass
import json
import subprocess
import sys
import urllib.error
import urllib.request

#: Default only. Prod has more than one account and the one holding the data
#: is not the one this was first written against — pass --email to choose.
DEFAULT_EMAIL = "dr.ealghunaim@gmail.com"


def account() -> str:
    for a in sys.argv:
        if a.startswith("--email="):
            return a.split("=", 1)[1]
    return DEFAULT_EMAIL


NUMBER = "X1234567"                      # shaped like a passport number
LABEL = "0022-WRITE-PATH-CHECK"


def prod_config() -> tuple[str, str, str]:
    """API URL, publishable key and shared app key, from the committed app.json.

    The working copy carries a local dev override, so it is deliberately NOT
    read here — HEAD is the prod configuration by definition.
    """
    raw = subprocess.run(["git", "show", "HEAD:app/app.json"],
                         capture_output=True, text=True, check=True).stdout
    extra = json.loads(raw)["expo"]["extra"]
    return (extra["apiUrl"].rstrip("/"), extra["supabaseAnonKey"],
            extra.get("appKey", ""))


def post(url: str, body: dict | None, headers: dict, method: str = "POST"):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read().decode()
            return r.status, (json.loads(text) if text.strip() else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        try:
            return e.code, json.loads(text)
        except Exception:
            return e.code, {"raw": text[:300]}


def main() -> int:
    api, anon, app_key = prod_config()
    EMAIL = account()
    supabase = "https://njvpjzojnzbynwlqsdbw.supabase.co"
    print(f"  api      : {api}")
    print(f"  supabase : {supabase}")
    print(f"  anon key : {anon[:10]}…({len(anon)} chars)")
    print(f"  app key  : {app_key[:8]}…({len(app_key)} chars)"
          if app_key else "  app key  : MISSING — every call will 401 at the middleware")
    print(f"  account  : {EMAIL}")
    if "--dry-run" in sys.argv:
        print("\n  dry run — nothing sent.")
        return 0

    pw = getpass.getpass(f"\n  prod password for {EMAIL} (hidden): ")
    if not pw.strip():
        print("  ✗ nothing entered."); return 2

    status, tok = post(f"{supabase}/auth/v1/token?grant_type=password",
                       {"email": EMAIL, "password": pw},
                       {"apikey": anon})
    token = (tok or {}).get("access_token")
    if not token:
        print(f"  ✗ sign-in failed ({status}): "
              f"{(tok or {}).get('error_description') or (tok or {}).get('msg') or tok}")
        return 1
    print("  ✓ signed in")
    # x-voyageos-key clears the shared_secret_guard middleware (api/main.py),
    # which rejects every path but /health before auth or any route is reached.
    # Without it the API answers 401 {"detail":"unauthorized"} — indistinguishable
    # from a token problem unless you read the body, which is why this check
    # once looked like a broken sign-in.
    auth = {"Authorization": f"Bearer {token}", "apikey": anon,
            "x-voyageos-key": app_key}

    ok = True
    status, doc = post(f"{api}/v1/documents",
                       {"type": "passport", "label": LABEL, "number": NUMBER}, auth)
    if status != 201:
        print(f"\n  ✗ CREATE FAILED ({status}): {doc}")
        detail = (doc or {}).get("detail", "")
        if status == 401 and detail == "unauthorized":
            print("    That is the shared-secret middleware, not auth and not the")
            print("    document code — x-voyageos-key is missing or wrong. The")
            print("    schema was never exercised.")
        elif status == 401:
            print("    That is the auth dependency: the token was rejected. The")
            print("    middleware was cleared, so the app key is fine.")
        if status >= 500:
            print("    A 500 here is the failure this check exists to catch: the")
            print("    running code still writes documents.key_version, which 0022")
            print("    dropped. Re-add the column to restore service:")
            print("      alter table public.documents")
            print("        add column if not exists key_version int not null default 1;")
        return 1
    print(f"  ✓ created {doc['id'][:8]}…  last4={doc.get('number_last4')}  "
          f"has_number={doc.get('has_number')}")

    if "key_version" in doc:
        print("  ✗ response still carries key_version"); ok = False
    else:
        print("  ✓ response carries no key_version")

    status, rev = post(f"{api}/v1/documents/{doc['id']}/number", None, auth, method="GET")
    good = status == 200 and (rev or {}).get("number") == NUMBER
    print(f"  {'✓' if good else '✗'} reveal returns the number ({status})")
    ok &= good

    status, _ = post(f"{api}/v1/documents/{doc['id']}", None, auth, method="DELETE")
    print(f"  {'✓' if status == 204 else '✗'} deleted ({status})")
    ok &= status == 204

    print(f"\n  {'✓ WRITE PATH VERIFIED on prod against the dropped column' if ok else '✗ SOMETHING FAILED — see above'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
