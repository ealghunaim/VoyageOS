#!/usr/bin/env bash
# VoyageOS week-3 smoke test: the AI packs its first bag, with a reason on every item.
set -e
API=http://localhost:8000

echo "── Finding a trip with activities…"
TRIP_ID=$(curl -s $API/v1/trips | python3 -c "
import sys, json, urllib.request
trips = json.load(sys.stdin)
pick = None
for t in trips:
    d = json.load(urllib.request.urlopen('$API/v1/trips/' + t['id']))
    if d.get('activities'):
        pick = t; break
pick = pick or (trips[0] if trips else None)
print(pick['id'] if pick else '')")
[ -z "$TRIP_ID" ] && echo "No trips found — run scripts/smoke_test.sh first." && exit 1
echo "   trip: $TRIP_ID"

echo "── Generating packing list (calling the model — a few seconds)…"
curl -s -X POST "$API/v1/trips/$TRIP_ID/packing-lists/generate" | python3 -c "
import sys, json
r = json.load(sys.stdin)
m = r.get('meta', {})
if r.get('cached'):
    print('   ↩ cached (inputs unchanged) — cost \$0.00. Add ?regenerate=true to force.')
else:
    print(f\"   ✓ {r.get('item_count','?')} items · source={r.get('source')} · model={m.get('model')}\")
    print(f\"   tokens {m.get('tokens_in')}/{m.get('tokens_out')} · cost \${m.get('cost_usd',0):.4f} · {m.get('latency_ms','?')} ms · qty overrides: {m.get('qty_divergences',0)}\")
    for s in m.get('task_suggestions', []):
        print('   → task suggestion:', s)"

echo ""
echo "── The list:"
curl -s "$API/v1/trips/$TRIP_ID/packing-list" | python3 -c "
import sys, json
d = json.load(sys.stdin)
cat = None
for it in d['items']:
    if it['category'] != cat:
        cat = it['category']; print(f\"\n{cat.upper()}\")
    print(f\"  ☐ {it['name']} ×{it['qty']}  — {it['reason']}\")"

echo ""
echo "✅ VoyageOS packed its first bag. See Supabase: packing_list_items (the list) and ai_runs (the cost log)."
