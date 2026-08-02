"""Renewal reminders for the document vault.

Documents expire quietly. The whole point of the vault is that the reminder
arrives while renewal is still cheap and unhurried, so the offsets below are
about lead time for the *renewal*, not a countdown to the expiry date.

These rows are ordinary notification_schedule entries with class='document',
so they inherit the governor already in place: quiet hours defer them rather
than dropping them, and 'document' sits at priority 5 — behind safety, ahead
of everything else — so a passport warning is not crowded out by a weather
nudge under the daily cap.

KNOWN LIMITATION — the worker that drains these rows is an in-process
APScheduler job on a 60-second tick (api/main.py). It only runs while the API
process is alive: a deploy, a crash or a sleeping instance means those ticks
never happen, and nothing re-hydrates them afterwards. A row whose send_at
passed during downtime is still 'pending' and will go out late on the next
tick, which is tolerable for a task reminder measured in hours and poor for
"your passport expires in six months", where the whole value is arriving on
time. Document reminders should move to a durable, re-hydrating scheduler —
a real cron sweeping overdue pending rows, or a queue with its own
persistence — before this feature is leaned on. Not a phase A blocker
because the rows themselves are durable; only the firing is fragile.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

#: Days before expiry to remind, by document type.
#:
#: passport is a single reminder at 180 days because many countries require
#: six months' validity remaining on entry — by the time it is closer, the
#: document may already be blocking a booking rather than merely aging.
#:
#: visa gets three because they are short-lived and often extendable only
#: before expiry. ticket and other get none: they do not get renewed.
OFFSETS: dict[str, list[int]] = {
    "passport": [180],
    "visa": [60, 30, 7],
    "insurance": [30, 7],
    "driving_license": [30],
    "vaccination": [30],
    "permit": [30],
}

#: Local time of day to deliver. Quiet hours default to 22:00-08:00, so 09:00
#: is clear of them — a reminder built at midnight would be deferred on
#: arrival and land at an hour nobody chose.
SEND_LOCAL_HOUR = time(9, 0)


def _label(doc: dict) -> str:
    """Human name for the document, without inventing one."""
    kind = (doc.get("type") or "document").replace("_", " ")
    if doc.get("type") == "visa" and doc.get("country_code"):
        return f"{doc['country_code'].upper()} visa"
    return doc.get("label") or kind


def _copy(doc: dict, days: int) -> dict:
    name = _label(doc)
    if days >= 180:
        body = (f"{name} expires in about six months. Many countries want six months' "
                "validity left on arrival — worth starting the renewal now.")
    elif days >= 30:
        body = f"{name} expires in {days} days. Renewing now avoids doing it in a hurry."
    else:
        body = f"{name} expires in {days} days."
    return {"title": f"{name} needs renewing", "body": body[:110]}


def plan(doc: dict, tz_name: str, today: date | None = None) -> list[dict]:
    """Pure: the schedule rows this document should have. No database access.

    Offsets already in the past are skipped rather than fired immediately —
    a document added late should not produce a burst of stale alerts.
    """
    if not doc.get("expiry_date"):
        return []
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz, tz_name = ZoneInfo("UTC"), "UTC"

    expiry = date.fromisoformat(doc["expiry_date"])
    now_local = datetime.now(tz)
    today = today or now_local.date()

    rows = []
    for days in OFFSETS.get(doc.get("type") or "", []):
        send_date = expiry - timedelta(days=days)
        if send_date <= today:
            continue
        send_local = datetime.combine(send_date, SEND_LOCAL_HOUR).replace(tzinfo=tz)
        rows.append({
            "channel": "push",
            "class": "document",
            "topic": f"doc:{doc['id']}",
            "send_at": send_local.astimezone(ZoneInfo("UTC")).isoformat(),
            "local_time": SEND_LOCAL_HOUR.strftime("%H:%M"),
            "tz_name": tz_name,
            "payload": _copy(doc, days),
            "status": "pending",
            "idem_key": f"doc:{doc['id']}:{days}",
        })
    return rows



def cancel(db, doc_id: str) -> int:
    """Drop this document's *pending* reminders. Returns how many went.

    Deleted, not marked cancelled, and that is deliberate: idem_key carries a
    unique constraint, so a cancelled row keeps occupying doc:{id}:{offset}
    and the next reschedule would collide with it and silently write nothing.
    Rows already sent or failed are left alone — they are the delivery record.
    """
    res = (db.table("notification_schedule").delete()
           .eq("topic", f"doc:{doc_id}").eq("status", "pending").execute())
    return len(res.data or [])


def reschedule(db, doc: dict, user_id: str, tz_name: str) -> int:
    """Cancel then re-plan. Safe to call on every create and edit."""
    cancel(db, doc["id"])
    rows = plan(doc, tz_name)
    if not rows:
        return 0
    for r in rows:
        r["user_id"] = user_id
    db.table("notification_schedule").insert(rows).execute()
    return len(rows)
