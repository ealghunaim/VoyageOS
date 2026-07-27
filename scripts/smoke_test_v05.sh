#!/usr/bin/env bash
# VoyageOS v0.5 closing smoke test: kits merge, weight computes, expiry judges.
set -e
API=http://localhost:8000

TRIP_ID=$(curl -s $API/v1/trips | python3 -c "import sys,json;t=json.load(sys.stdin);print(t[0]['id'] if t else '')")
[ -z "$TRIP_ID" ] && echo "No trips — run scripts/smoke_test.sh first." && exit 1

echo "── 1) Kit: create 'Smoke Kit' with Sunglasses + Power bank, apply to trip…"
KIT=$(curl -s -X POST $API/v1/gear-profiles -H 'Content-Type: application/json' -d '{"name":"Smoke Kit"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
curl -s -X POST $API/v1/gear-profiles/$KIT/items -H 'Content-Type: application/json' -d '{"name":"Sunglasses"}' > /dev/null
curl -s -X POST $API/v1/gear-profiles/$KIT/items -H 'Content-Type: application/json' -d '{"name":"Power bank"}' > /dev/null
curl -s -X POST $API/v1/gear-profiles/$KIT/apply/$TRIP_ID | python3 -m json.tool

echo "── 2) Weight: set a 7 kg target, read the deterministic sum…"
curl -s -X PUT $API/v1/trips/$TRIP_ID/bag -H 'Content-Type: application/json' -d '{"limit_g":7000}' > /dev/null
curl -s $API/v1/trips/$TRIP_ID/weight | python3 -c "
import sys,json; w=json.load(sys.stdin)
print(f\"   {w['total_g']/1000:.2f} kg of {w['limit_g']/1000:.0f} kg · {w['counted']} weighed · {w['unweighed']} unweighed\")"

echo "── 3) Vault: passport expiring in ~5 months → expect a critical verdict + a governed alert…"
EXP=$(python3 -c "from datetime import date,timedelta;print((date.today()+timedelta(days=150)).isoformat())")
curl -s -X POST $API/v1/documents -H 'Content-Type: application/json' \
  -d "{\"type\":\"passport\",\"label\":\"Smoke passport\",\"expiry_date\":\"$EXP\"}" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f\"   level: {d['expiry']['level']} · {d['expiry']['message']}\")"
echo "   (a document-class notification is queued — watch: tail -3 /tmp/voyageos.log after the next worker tick)"

echo ""
echo "✅ v0.5 feature-complete: kits + weight + expiry all answered."
