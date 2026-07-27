"""Weather background tick — the §12 snapshot job, sized for one hobbyist server.
Runs on boot (+45s) and every 6 hours: every eligible trip inside the forecast
horizon gets refreshed; the service's own silence rules do the rest."""
from __future__ import annotations

import traceback
from datetime import date, timedelta

from api.core.db import get_db
from api.weather.service import refresh_trip

HORIZON = 16
MAX_TRIPS_PER_TICK = 10


def run_weather_tick() -> int:
    try:
        db = get_db()
        today = date.today()
        trips = db.table("trips").select("*") \
            .gte("start_date", (today - timedelta(days=1)).isoformat()) \
            .lte("start_date", (today + timedelta(days=HORIZON)).isoformat()) \
            .neq("status", "completed").limit(MAX_TRIPS_PER_TICK).execute().data
        n = 0
        for trip in trips:
            r = refresh_trip(db, trip, trip["owner_id"], force=False)
            if r.get("ok"):
                n += 1
                print(f"[weather] {trip['title']}: {r['days_in_range']} days, "
                      f"insights={[i['key'] for i in r['insights']]}, "
                      f"added={r['items_added']}, queued={r['notifications_queued']}")
        return n
    except Exception:
        print("[weather] tick failed:\n" + traceback.format_exc())
        return -1
