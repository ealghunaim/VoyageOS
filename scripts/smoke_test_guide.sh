#!/usr/bin/env bash
# VoyageOS per-destination guide smoke test: creates a 2-stop trip and proves
# the guide caches independently per (trip, destination, phase) — including
# the backward-compat path where the app omits destination_id entirely.
# Calls the model twice for real (one per new stop) — a few cents.
set -e
API=http://localhost:8000

python3 -c "
import json, sys, urllib.request

API = '$API'

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method,
                                  headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

checks = []
def check(name, cond):
    checks.append((name, bool(cond)))
    print(f\"   {'✓' if cond else '✗'} {name}\")

print('── Creating a 2-stop trip: Lisbon → Porto…')
trip = call('POST', '/v1/trips', {
    'title': 'Guide Smoke Trip', 'start_date': '2026-09-01', 'end_date': '2026-09-10',
})
trip_id = trip['id']
print(f'   trip: {trip_id}')

d1 = call('POST', f'/v1/trips/{trip_id}/destinations', {'place_name': 'Lisbon', 'country_code': 'PT', 'seq': 1})
d2 = call('POST', f'/v1/trips/{trip_id}/destinations', {'place_name': 'Porto', 'country_code': 'PT', 'seq': 2})
d1_id, d2_id = d1['id'], d2['id']
print(f'   dest 1 (Lisbon): {d1_id}')
print(f'   dest 2 (Porto):  {d2_id}')

print()
print(\"── guide/part/a with NO destination_id (backward-compat path the app relies on)…\")
default_r = call('GET', f'/v1/trips/{trip_id}/guide/part/a')
check('no-destination_id call resolves to the primary (first) stop',
      default_r.get('destination_id') == d1_id)

print()
print('── guide/part/a for dest 1 (Lisbon), explicit id…')
d1_r = call('GET', f'/v1/trips/{trip_id}/guide/part/a?destination_id={d1_id}')
check('explicit destination_id=dest1 hits the same cached row the default call wrote',
      d1_r.get('cached') is True)
check('default-path guide matches explicit dest1 guide',
      default_r.get('guide') == d1_r.get('guide'))

print()
print('── guide/part/a for dest 2 (Porto), first call — generates fresh…')
d2_r = call('GET', f'/v1/trips/{trip_id}/guide/part/a?destination_id={d2_id}')
check(\"dest2's guide differs from dest1's guide\", d2_r.get('guide') != d1_r.get('guide'))

print()
print('── guide/part/a for dest 2 again — should now be cached…')
d2_cached = call('GET', f'/v1/trips/{trip_id}/guide/part/a?destination_id={d2_id}')
check('dest2 second call returns cached: true', d2_cached.get('cached') is True)

print()
passed = sum(1 for _, ok in checks if ok)
total = len(checks)
if passed == total:
    print(f'✅ PASS — {passed}/{total} checks passed. Per-destination guide caching works end to end.')
else:
    print(f'❌ FAIL — {passed}/{total} checks passed.')
    sys.exit(1)
"
