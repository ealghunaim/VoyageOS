#!/usr/bin/env bash
# VoyageOS notification smoke test: schedules a real row, then watches the
# governor decide within the worker's 60-second tick.
set -e
API=http://localhost:8000

echo "── Scheduling a governed demo notification (fires through the real pipeline)…"
ROW=$(curl -s -X POST $API/v1/notifications/demo | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "   row: $ROW"
echo "── Waiting for the worker tick (checks every 10s, up to 90s)…"
for i in $(seq 1 9); do
  sleep 10
  STATUS=$(curl -s $API/v1/notifications/$ROW | python3 -c "import sys,json;print(json.load(sys.stdin)['schedule']['status'])")
  echo "   t+$((i*10))s → status: $STATUS"
  [ "$STATUS" != "pending" ] && break
done
echo ""
echo "── The governor's verdict and the append-only log:"
curl -s $API/v1/notifications/$ROW | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d['schedule']
print(f\"   status: {s['status']} · class: {s['class']} · topic: {s['topic']}\")
for e in d['log']:
    print(f\"   log: {e['event']} @ {e['at']}\")"
echo ""
echo "✅ If status = sent: the pipeline works — materializer → schedule → governor → delivery → log."
echo "   Run it again immediately and the governor's budget/cooldown logic shows up in the verdicts."
