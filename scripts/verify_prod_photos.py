"""Check the landmark photos and the weather path against prod.

Two things shipped together and neither can be judged from a screenshot:

  photos    POST /v1/photos/places must return a real landmark with an artist
            and a licence, and null — not a placeholder — for items it cannot
            match. The gates are tuned to fail closed, so nulls are the
            expected outcome for roughly half the list.

  weather   api/core/geo.py replaced the haversine that lived inside
            api/weather/provider.py. Nothing about photos touches forecasts,
            which is exactly why it is worth confirming: it is the part of the
            change nobody would think to look at.

Config comes from the committed app.json — HEAD is the prod configuration by
definition, the working copy is the local dev override — so there is nothing
to paste and no way to aim this at dev by accident. The password is read with
getpass: never echoed, never an argument, never stored.

THIS SCRIPT CANNOT GENERATE ANYTHING. Guide items are read from
trip_guide_parts over PostgREST with the traveller's own token — RLS scopes it
to their trips — which is a SELECT and costs nothing. An earlier version asked
the API for the guide instead and inspected the "cached" flag in the reply.
That flag arrives *after* generation: the request itself is what spends the
money, so the guard reported a skip on work already paid for. A destination
with no cached guide is now simply never fetched.

    .venv/bin/python3 scripts/verify_prod_photos.py --dry-run
    .venv/bin/python3 scripts/verify_prod_photos.py
"""
from __future__ import annotations

import getpass
import json
import subprocess
import sys

import httpx

SUPABASE = "https://njvpjzojnzbynwlqsdbw.supabase.co"
#: Default only. Prod has more than one account and the one holding the data
#: is not the one this was first written against — pass --email to choose.
DEFAULT_EMAIL = "dr.ealghunaim@gmail.com"


def account() -> str:
    for a in sys.argv:
        if a.startswith("--email="):
            return a.split("=", 1)[1]
    return DEFAULT_EMAIL
TIMEOUT = 60          # a cold destination walks Wikipedia two at a time


def prod_config() -> tuple[str, str, str]:
    raw = subprocess.run(["git", "show", "HEAD:app/app.json"],
                         capture_output=True, text=True, check=True).stdout
    extra = json.loads(raw)["expo"]["extra"]
    return extra["apiUrl"].rstrip("/"), extra["supabaseAnonKey"], extra["appKey"]


def main() -> int:
    api, anon, app_key = prod_config()
    EMAIL = account()
    print(f"  api      : {api}")
    print(f"  account  : {EMAIL}")
    if "--dry-run" in sys.argv:
        print("\n  dry run — nothing sent.")
        return 0

    pw = getpass.getpass(f"\n  prod password for {EMAIL} (hidden): ")
    if not pw.strip():
        print("  ✗ nothing entered."); return 2

    with httpx.Client(timeout=TIMEOUT) as c:
        r = c.post(f"{SUPABASE}/auth/v1/token?grant_type=password",
                   headers={"apikey": anon}, json={"email": EMAIL, "password": pw})
        token = r.json().get("access_token") if r.status_code == 200 else None
        if not token:
            print(f"  ✗ sign-in failed ({r.status_code}): {r.text[:160]}")
            return 1
        # The 'sub' claim is the user id the API will match against
        # trips.owner_id. Printed because "0 trips" is ambiguous otherwise:
        # it means either an empty account or the wrong one, and those need
        # very different responses.
        import base64
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        uid = json.loads(base64.urlsafe_b64decode(payload)).get("sub", "?")
        print(f"  ✓ signed in as {uid}")
        H = {"Authorization": f"Bearer {token}", "apikey": anon,
             "x-voyageos-key": app_key, "Content-Type": "application/json"}

        skipped: list[str] = []
        trips = c.get(f"{api}/v1/trips", headers=H).json()
        print(f"\n  trips on prod: {len(trips)}")
        if not trips:
            print("  ✗ this account owns no trips on prod.")
            print("    /v1/trips filters on owner_id only — no archive or date")
            print("    filter — so this is a real empty result, not a hidden list.")
            print("    Destinations cascade-delete with their trip, so any prod")
            print("    destination belongs to a trip owned by a DIFFERENT user id.")
            print("    Compare against the owners with:")
            print("      select owner_id, count(*), min(title) from public.trips")
            print("       group by owner_id;")
            print(f"    This session is user_id {uid}")
            return 1

        ok = True
        # ── photos ──────────────────────────────────────────────────────
        #
        # Cached guides are read straight from trip_guide_parts over PostgREST
        # with the traveller's own token. RLS ("guide parts via trip", 0006)
        # scopes it to trips they own, so this needs no service key — and,
        # crucially, it is a SELECT. Going through the API instead would call
        # get_guide_part, which GENERATES on a cache miss: a paid model call
        # per destination, spent before any response exists to inspect.
        for trip in trips:
            detail = c.get(f"{api}/v1/trips/{trip['id']}", headers=H).json()
            for dest in detail.get("destinations", []):
                parts = c.get(f"{SUPABASE}/rest/v1/trip_guide_parts",
                              headers={"apikey": anon,
                                       "Authorization": f"Bearer {token}"},
                              params={"trip_id": f"eq.{trip['id']}",
                                      "destination_id": f"eq.{dest['id']}",
                                      "phase": "eq.b", "select": "payload"})
                rows = parts.json() if parts.status_code == 200 else []
                if not rows:
                    skipped.append(dest["place_name"])
                    continue
                pay = rows[0].get("payload") or {}
                names = ([i["name"] for i in (pay.get("visit") or [])]
                         + [i["name"] for i in (pay.get("play") or [])])
                if not names:
                    continue
                res = c.post(f"{api}/v1/photos/places", headers=H,
                             json={"destination_id": dest["id"], "names": names})
                if res.status_code != 200:
                    print(f"\n  ✗ {dest['place_name']}: {res.status_code} {res.text[:120]}")
                    ok = False
                    continue
                data = res.json()
                hits = {n: v for n, v in data.items() if v}
                print(f"\n  === {dest['place_name']}  {len(hits)}/{len(names)} matched ===")
                for n, v in list(hits.items())[:6]:
                    has_credit = bool(v.get("credit")) and bool(v.get("license"))
                    ok &= has_credit and str(v.get("url", "")).startswith("http")
                    print(f"    ✓ {n[:38]:<40} → {v['title']}")
                    print(f"       {v['credit'][:34]} · {v['license']}")
                    print(f"       {'ok' if has_credit else 'MISSING ATTRIBUTION'} · "
                          f"{v['url'][:66]}…")
                nulls = [n for n, v in data.items() if v is None]
                if nulls:
                    print(f"    · null (no confident match): "
                          f"{', '.join(n[:22] for n in nulls[:5])}")
                if any(v is not None and not v.get("url") for v in data.values()):
                    print("    ✗ an entry has no url but is not null"); ok = False

        if skipped:
            print(f"\n  {len(skipped)} destination(s) have no cached guide and were "
                  "skipped — no generation, no cost:")
            print(f"    {', '.join(sorted(set(skipped))[:12])}")

        # ── weather, the non-photo blast radius of geo.py ───────────────
        print("\n  === weather (geo.py refactor) ===")
        for trip in trips[:4]:
            w = c.get(f"{api}/v1/trips/{trip['id']}/weather", headers=H)
            if w.status_code != 200:
                print(f"    ✗ {trip.get('title','?')[:26]:<28} {w.status_code} "
                      f"{w.text[:80]}")
                ok = False
                continue
            body = w.json() or {}
            days = body.get("days") or []
            dest = body.get("place") or "?"
            print(f"    {'✓' if days else '·'} {trip.get('title','?')[:26]:<28} "
                  f"{dest:<14} {len(days)} snapshot day(s)")

        print(f"\n  {'✓ PROD LOOKS RIGHT' if ok else '✗ SOMETHING IS WRONG — see above'}")
        return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
