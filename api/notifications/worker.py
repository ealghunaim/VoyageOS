"""Notification worker — claims due rows, runs the governor, delivers, logs.

The governor decides; this module obeys. Delivery goes through an adapter
(Part 9 §3): v0.5 dev = console (the phone mirrors the schedule locally via
Expo local notifications); the production flip is an ExpoPushAdapter here.
"""
from __future__ import annotations

import json
import traceback
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from api.core.db import get_db
from api.notifications.governor import Action, Candidate, UserState, evaluate


class ConsoleAdapter:
    """Dev delivery: prints. The schedule row + log are the real record."""
    def deliver(self, user_id: str, payload: dict) -> None:
        print(f"[deliver] {user_id[:8]}… «{payload.get('title')}» — {payload.get('body')}")


adapter = ConsoleAdapter()


def _parse_hhmm(s: str, default: time) -> time:
    try:
        h, m = s.split(":")
        return time(int(h), int(m))
    except Exception:
        return default


def _user_state(db, user_id: str, tz: ZoneInfo, now_utc: datetime) -> UserState:
    prefs_rows = db.table("user_preferences").select("notification_daily_cap,quiet_hours") \
        .eq("user_id", user_id).execute().data
    cap, qs, qe = 3, time(22, 0), time(8, 0)
    if prefs_rows:
        cap = prefs_rows[0].get("notification_daily_cap") or 3
        qh = prefs_rows[0].get("quiet_hours") or {}
        qs = _parse_hhmm(qh.get("start", "22:00"), qs)
        qe = _parse_hhmm(qh.get("end", "08:00"), qe)

    local_midnight = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    sent_today = len(db.table("notification_log").select("id").eq("user_id", user_id)
                     .eq("event", "sent")
                     .gte("at", local_midnight.astimezone(timezone.utc).isoformat())
                     .execute().data)

    recent = db.table("notification_schedule").select("topic,send_at") \
        .eq("user_id", user_id).eq("status", "sent") \
        .gte("send_at", (now_utc - timedelta(hours=24)).isoformat()).execute().data
    last_topic = {}
    for r in recent:
        if r.get("topic"):
            last_topic[r["topic"]] = datetime.fromisoformat(r["send_at"]).replace(tzinfo=None)

    return UserState(daily_cap=cap, sent_today=sent_today,
                     quiet_start=qs, quiet_end=qe, last_topic_sent=last_topic)


def _is_departure_window(db, user_id: str, tz: ZoneInfo) -> bool:
    today = datetime.now(tz).date()
    rows = db.table("trips").select("start_date").eq("owner_id", user_id) \
        .in_("start_date", [today.isoformat(), (today + timedelta(days=1)).isoformat()]) \
        .execute().data
    return bool(rows)


def run_due() -> int:
    """One tick. Returns rows processed. Never raises out (the scheduler must live)."""
    try:
        db = get_db()
        now_utc = datetime.now(timezone.utc)
        due = db.table("notification_schedule").select("*") \
            .eq("status", "pending").lte("send_at", now_utc.isoformat()) \
            .limit(25).execute().data
        if not due:
            return 0

        by_user: dict[str, list[dict]] = {}
        for row in due:
            by_user.setdefault(row["user_id"], []).append(row)

        processed = 0
        for user_id, rows in by_user.items():
            tz = ZoneInfo(rows[0].get("tz_name") or "UTC")
            state = _user_state(db, user_id, tz, now_utc)
            cands = [Candidate(id=r["id"], cls=r["class"], topic=r.get("topic") or r["class"])
                     for r in rows]
            decisions = evaluate(datetime.now(tz).replace(tzinfo=None), cands, state,
                                 departure_day=_is_departure_window(db, user_id, tz))
            row_by_id = {r["id"]: r for r in rows}
            for d in decisions:
                row = row_by_id[d.candidate_id]
                if d.action == Action.SEND:
                    adapter.deliver(user_id, row.get("payload") or {})
                    db.table("notification_schedule").update({"status": "sent"}) \
                        .eq("id", row["id"]).execute()
                    db.table("notification_log").insert({
                        "user_id": user_id, "schedule_id": row["id"],
                        "class": row["class"], "event": "sent"}).execute()
                elif d.action == Action.DEFER:
                    quiet_end_local = datetime.now(tz).replace(
                        hour=state.quiet_end.hour, minute=state.quiet_end.minute,
                        second=0, microsecond=0)
                    if quiet_end_local <= datetime.now(tz):
                        quiet_end_local += timedelta(days=1)
                    db.table("notification_schedule").update(
                        {"send_at": quiet_end_local.astimezone(timezone.utc).isoformat()}) \
                        .eq("id", row["id"]).execute()
                else:  # DIGEST / SUPPRESS — recorded with the governor's reason
                    status = "digested" if d.action == Action.DIGEST else "suppressed"
                    db.table("notification_schedule").update({"status": status}) \
                        .eq("id", row["id"]).execute()
                    db.table("notification_log").insert({
                        "user_id": user_id, "schedule_id": row["id"],
                        "class": row["class"], "event": f"{status}:{d.reason}"}).execute()
                processed += 1
        return processed
    except Exception:
        print("[worker] tick failed:\n" + traceback.format_exc())
        return -1
