"""Timeline materializer — Master Design Doc Part 3 §3, v0.5 rule set.

`plan()` is pure (tested); `materialize()` writes idempotently.
v0.5 rules: laundry T-3 18:00 · charge & weigh T-1 18:00 · morning-of T-0 07:30.
Timezone doctrine: pre-departure anchors resolve in the traveler's local zone.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

RULESET_VERSION = "v0.5"

# (kind, day_offset, local_time, class, title<=30, body<=110 with {title} slot)
RULES_V05 = [
    ("laundry", -3, time(18, 0), "task",
     "Laundry tonight?", "{title}: get your trip clothes ready — you leave in 3 days."),
    ("charge_weigh", -1, time(18, 0), "task",
     "Charge and weigh", "{title} is tomorrow — top up your devices and weigh your bag."),
    ("morning_of", 0, time(7, 30), "departure",
     "Before you zip up", "Charger, meds, glasses — the things that were still in use."),
]


@dataclass(frozen=True)
class PlannedReminder:
    kind: str
    cls: str
    title: str
    body: str
    topic: str
    idem_key: str
    send_at_utc: str      # ISO, what the scheduler keys on
    local_time: str       # "18:00" — timezone doctrine bookkeeping
    tz_name: str


def plan(trip: dict, tz_name: str, now_utc: datetime) -> list[PlannedReminder]:
    """Deterministic: trip + tz + now → the reminders that still lie in the future."""
    try:
        tz = ZoneInfo(tz_name)
    except Exception:  # unknown tz string from a device — fail safe, not silent
        tz, tz_name = ZoneInfo("UTC"), "UTC"

    start = date.fromisoformat(trip["start_date"])
    out: list[PlannedReminder] = []
    for kind, offset, at, cls, title, body_tpl in RULES_V05:
        local_dt = datetime.combine(start + timedelta(days=offset), at, tzinfo=tz)
        send_utc = local_dt.astimezone(ZoneInfo("UTC"))
        if send_utc <= now_utc:
            continue  # trip created inside the window — past offsets are skipped, not spammed
        out.append(PlannedReminder(
            kind=kind, cls=cls, title=title,
            body=body_tpl.format(title=trip["title"])[:110],
            topic=f"{cls}:{kind}:{trip['id'][:8]}",
            idem_key=f"{kind}:{trip['id']}",
            send_at_utc=send_utc.isoformat(),
            local_time=at.strftime("%H:%M"),
            tz_name=tz_name,
        ))
    return out


def materialize(db, trip: dict, user_id: str, tz_name: str) -> int:
    """Idempotent: existing (trip, kind) tasks are respected; returns rows created."""
    now_utc = datetime.now(ZoneInfo("UTC"))
    planned = plan(trip, tz_name, now_utc)
    if not planned:
        return 0

    existing = {
        r["kind"] for r in
        db.table("tasks").select("kind").eq("trip_id", trip["id"]).execute().data
    }
    created = 0
    for p in planned:
        if p.kind in existing:
            continue
        task = db.table("tasks").insert({
            "trip_id": trip["id"], "title": p.title, "kind": p.kind,
            "due_at": p.send_at_utc,
            "offset_rule": {"anchor": "departure", "ruleset": RULESET_VERSION},
            "status": "pending", "source": "rule",
        }).execute().data[0]
        db.table("notification_schedule").insert({
            "user_id": user_id, "trip_id": trip["id"], "task_id": task["id"],
            "send_at": p.send_at_utc, "local_time": p.local_time, "tz_name": p.tz_name,
            "channel": "push", "class": p.cls, "topic": p.topic,
            "payload": {"title": p.title, "body": p.body},
            "status": "pending", "idem_key": p.idem_key,
        }).execute()
        created += 1
    return created
