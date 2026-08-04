"""Eagerly repair destinations that were created without coordinates.

A destination with no lat/lng can fetch neither forecast nor climatology, so
its trip shows no weather at all while its neighbours show theirs. The read
path self-heals one destination on first view (api/weather/service.py), but
that makes a real user pay the geocode latency. This does the same work ahead
of them, in bulk.

Safe by default: reports what it would do and changes nothing unless --apply
is passed. Every repair is independent — one failure never stops the run.

Usage, from the repo root:

    # look, change nothing
    .venv/bin/python3 scripts/backfill_coords.py

    # actually repair
    .venv/bin/python3 scripts/backfill_coords.py --apply

Point it at prod by exporting prod's credentials for the command only, so they
never land in .env or a shell history you keep:

    SUPABASE_URL='https://<prod>.supabase.co' \
    SUPABASE_SERVICE_KEY='<prod service key>' \
    .venv/bin/python3 scripts/backfill_coords.py --apply
"""
from __future__ import annotations

import os
import re
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client  # noqa: E402

from api.weather import provider  # noqa: E402


def env(name: str) -> str:
    """Prefer a real environment variable; fall back to .env for local runs."""
    if os.environ.get(name):
        return os.environ[name].strip()
    try:
        text = open(os.path.join(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))), ".env")).read()
        found = dict(re.findall(r"^(\w+)=(.*)$", text, re.M))
        return found.get(name, "").strip()
    except FileNotFoundError:
        return ""


def main() -> int:
    apply = "--apply" in sys.argv
    url, key = env("SUPABASE_URL"), env("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("SUPABASE_URL / SUPABASE_SERVICE_KEY not set."); return 2
    db = create_client(url, key)

    host = url.split("//")[-1].split(".")[0]
    print(f"  target   : {url}")
    print(f"  mode     : {'APPLY — will write' if apply else 'DRY RUN — no writes'}\n")

    rows = db.table("destinations").select("id,trip_id,place_name,country_code,lat,lng") \
        .execute().data
    broken = [d for d in rows if d.get("lat") is None or d.get("lng") is None]
    print(f"  destinations total : {len(rows)}")
    print(f"  missing coordinates: {len(broken)}\n")
    if not broken:
        print("  nothing to repair."); return 0

    trips = {t["id"]: t for t in db.table("trips")
             .select("id,title,start_date,end_date").execute().data}

    healed = failed = skipped = 0
    for d in broken:
        trip = trips.get(d["trip_id"])
        label = f"{d['place_name']!r}" + (f" ({trip['title']})" if trip else "")
        if not trip:
            print(f"    skip   {label} — no parent trip"); skipped += 1; continue
        coords = provider.geocode(d["place_name"], d.get("country_code"))
        if not coords:
            print(f"    FAIL   {label} — geocoder found nothing"); failed += 1; continue
        lat, lng = coords
        if not apply:
            print(f"    would  {label} → {lat}, {lng}"); healed += 1; continue
        try:
            db.table("destinations").update({"lat": lat, "lng": lng}).eq("id", d["id"]).execute()
            clim = provider.fetch_climatology(
                lat, lng, date.fromisoformat(trip["start_date"]),
                date.fromisoformat(trip["end_date"]))
            n = 0
            if clim:
                from api.weather.service import _upsert_snapshots
                n = _upsert_snapshots(db, d["id"], clim) or len(clim)
            print(f"    ok     {label} → {lat}, {lng}  ({n} snapshot rows)")
            healed += 1
        except Exception as e:  # noqa: BLE001 — one bad row must not stop the run
            print(f"    ERROR  {label} — {type(e).__name__}: {e}")
            failed += 1

    verb = "repaired" if apply else "would repair"
    print(f"\n  {verb}: {healed}   failed: {failed}   skipped: {skipped}")
    if not apply and healed:
        print("  re-run with --apply to write.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
