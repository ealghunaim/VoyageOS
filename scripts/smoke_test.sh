#!/usr/bin/env bash
# VoyageOS week-2 smoke test: creates a real trip in YOUR Supabase via YOUR API.
set -e
API=http://localhost:8000

echo "── 1) API health"
curl -s $API/health | python3 -m json.tool

echo "── 2) Creating trip: Chamonix"
TRIP=$(curl -s -X POST $API/v1/trips -H 'Content-Type: application/json' \
  -d '{"title":"Chamonix test trip","start_date":"2026-08-10","end_date":"2026-08-17","trip_type":"hiking"}')
echo "$TRIP" | python3 -m json.tool
TRIP_ID=$(echo "$TRIP" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo "── 3) Adding destination: Chamonix, FR"
curl -s -X POST $API/v1/trips/$TRIP_ID/destinations -H 'Content-Type: application/json' \
  -d '{"place_name":"Chamonix","country_code":"FR"}' | python3 -m json.tool

echo "── 4) Adding activities: hiking + trail_running"
curl -s -X POST $API/v1/trips/$TRIP_ID/activities -H 'Content-Type: application/json' \
  -d '{"type":"hiking"}' | python3 -m json.tool
curl -s -X POST $API/v1/trips/$TRIP_ID/activities -H 'Content-Type: application/json' \
  -d '{"type":"trail_running"}' | python3 -m json.tool

echo "── 5) Reading the full trip back"
curl -s $API/v1/trips/$TRIP_ID | python3 -m json.tool

echo ""
echo "✅ Smoke test complete. Open Supabase → Table Editor → trips: your Chamonix trip is there."
