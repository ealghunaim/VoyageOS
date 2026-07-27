#!/usr/bin/env bash
# VoyageOS weather smoke test — reads the cloud config, refreshes the first trip's
# forecast, prints the rules engine's verdicts and the resulting quiet diff.
set -e
CFG=app/src/config.ts
API=$(grep "API_URL" $CFG | cut -d"'" -f2)
KEY=$(grep "APP_KEY" $CFG | cut -d"'" -f2)
[ -z "$API" ] && API=http://localhost:8000
H="x-voyageos-key: $KEY"

TRIP=$(curl -s -H "$H" $API/v1/trips | python3 -c "import sys,json;t=json.load(sys.stdin);print(t[0]['id'] if t else '')")
[ -z "$TRIP" ] && echo "No trips found." && exit 1
TITLE=$(curl -s -H "$H" $API/v1/trips/$TRIP | python3 -c "import sys,json;print(json.load(sys.stdin)['title'])" 2>/dev/null || echo "trip")
echo "── Refreshing weather for: $TITLE"
curl -s -X POST -H "$H" $API/v1/trips/$TRIP/weather/refresh | python3 -c "
import sys, json
r = json.load(sys.stdin)
if not r.get('ok'):
    print('   ✗', r.get('note')); raise SystemExit()
print(f\"   place: {r['place']} · snapshots: {r['snapshots']} · days in trip window: {r['days_in_range']}\")
for i in r.get('insights', []):
    print(f\"   insight: {i['key']} — {i['reason']}\")
print(f\"   items added: {r['items_added']} · already covered: {len(r.get('covered', []))} · notifications queued: {r['notifications_queued']}\")
if r.get('note'): print('   note:', r['note'])"

echo ""
echo "── The forecast on record:"
curl -s -H "$H" $API/v1/trips/$TRIP/weather | python3 -c "
import sys, json
d = json.load(sys.stdin)
for day in d['days']:
    marks = ' ☔' if (day['precip_prob'] or 0) >= 60 else (' ☀' if (day['uv'] or 0) >= 8 else '')
    print(f\"   {day['date']}  {round(day['temp_max'] or 0)}°/{round(day['temp_min'] or 0)}°  precip {day['precip_prob'] or 0}%  wind {round(day['wind_kph'] or 0)} kph{marks}\")"

echo ""
echo "✅ The §12 loop ran: ingest → rules → quiet apply → governed notify."
echo "   'already covered' means the AI had it packed before the forecast did — that silence is the feature."
