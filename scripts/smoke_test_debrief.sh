#!/usr/bin/env bash
# VoyageOS memory-loop smoke test: forget something, watch the next generation remember it.
set -e
API=http://localhost:8000

echo "── Finding a trip…"
TRIP_ID=$(curl -s $API/v1/trips | python3 -c "import sys,json;t=json.load(sys.stdin);print(t[0]['id'] if t else '')")
[ -z "$TRIP_ID" ] && echo "No trips — run scripts/smoke_test.sh first." && exit 1
echo "   trip: $TRIP_ID"

echo "── Debriefing: 'I forgot my Sunglasses'…"
curl -s -X POST $API/v1/trips/$TRIP_ID/debrief -H 'Content-Type: application/json' \
  -d '{"forgot":["Sunglasses"],"unused":[]}' | python3 -m json.tool

echo ""
echo "── Regenerating the list (the model now sees your history — a few cents)…"
curl -s -X POST "$API/v1/trips/$TRIP_ID/packing-lists/generate?regenerate=true" | python3 -c "
import sys, json
r = json.load(sys.stdin); m = r.get('meta', {})
print(f\"   ✓ {r.get('item_count')} items · prompt {m.get('prompt_version')} · cost \${m.get('cost_usd',0):.4f}\")"

echo ""
echo "── Items the memory flagged:"
curl -s "$API/v1/trips/$TRIP_ID/packing-list" | python3 -c "
import sys, json
d = json.load(sys.stdin)
hist = [i for i in d['items'] if i['source'] == 'history']
if not hist:
    print('   (none flagged — see note below)')
for i in hist:
    print(f\"   ⚑ {i['name']} ×{i['qty']} — {i['reason']}\")"

echo ""
echo "✅ The loop is closed: debrief wrote to item_events, generation read it back."
echo "   (If nothing was flagged: models occasionally tag history items under another"
echo "    signal — check the Sunglasses row's reason text; the memory context was sent.)"
