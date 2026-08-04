"""Fatigue governor — Master Design Doc Part 3, F3.3.

Deterministic arbiter between "system emitted an event" and "phone buzzed".
No model ever decides to notify (law 2). Every suppression carries a reason.

v0.5 scope: budgets, class arbitration, per-topic cooldown, quiet hours,
mutes, safety bypass. Adaptive throttling (14-day action rates demoting a
class) plugs into `class_action_rates` when notification_log has volume.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from enum import Enum

BASE_DAILY_BUDGET = 3
DEPARTURE_DAY_BUDGET = 5          # T-1 and T-0
TOPIC_COOLDOWN = timedelta(hours=24)

CLASS_PRIORITY = {
    "safety": 6,
    "document": 5,
    "departure": 4,
    "task": 3,
    "weather": 2,
    "social": 1,
    "system": 0,
}

#: Classes that do not draw from the daily budget.
#:
#: Priority alone could not protect these. Arbitration ranks candidates within
#: a single tick, but `sent_today` is spent across the whole day — so three
#: weather nudges at 08:00 leave budget=0, and a passport reminder at 09:00
#: loses to nothing at all. It was marked 'digested', which is terminal and
#: which nothing reads: the reminder was deleted in all but name.
#:
#: 'document' is exempted because the class is rare (at most three reminders in
#: a visa's life, one in a passport's), individually actionable, and explicitly
#: created by the traveller. The daily cap exists to hold back ambient noise —
#: weather, tasks, social — and a renewal deadline is not that.
#:
#: Narrower than the 'safety' bypass on purpose: exempt candidates still
#: respect quiet hours, mutes, snooze and topic cooldown, because all of those
#: are decided before arbitration. Only the budget is bypassed.
BUDGET_EXEMPT = {"document"}


class Action(str, Enum):
    SEND = "send"
    DEFER = "defer"        # quiet hours — re-queue at quiet end
    DIGEST = "digest"      # lost arbitration; lives in inbox/evening digest
    SUPPRESS = "suppress"  # cooldown / mute / snooze — logged, not shown


@dataclass(frozen=True)
class Candidate:
    id: str
    cls: str                     # one of CLASS_PRIORITY keys
    topic: str                   # cooldown key, e.g. "weather:kyoto:rain"
    urgency: float = 0.5         # 0..1, tiebreaker only


@dataclass
class UserState:
    daily_cap: int = BASE_DAILY_BUDGET
    sent_today: int = 0
    quiet_start: time = time(22, 0)
    quiet_end: time = time(8, 0)
    muted_classes: set[str] = field(default_factory=set)
    snoozed_until: datetime | None = None
    class_action_rates: dict[str, float] = field(default_factory=dict)  # 0..1
    last_topic_sent: dict[str, datetime] = field(default_factory=dict)


@dataclass(frozen=True)
class Decision:
    candidate_id: str
    action: Action
    reason: str


def _in_quiet_hours(now: datetime, s: UserState) -> bool:
    t = now.time()
    if s.quiet_start <= s.quiet_end:
        return s.quiet_start <= t < s.quiet_end
    return t >= s.quiet_start or t < s.quiet_end  # crosses midnight


def _score(c: Candidate, s: UserState) -> tuple:
    rate = s.class_action_rates.get(c.cls, 0.5)  # neutral prior for new users
    return (CLASS_PRIORITY.get(c.cls, 0) * (0.5 + rate), c.urgency, c.id)


def evaluate(
    now: datetime,
    candidates: list[Candidate],
    state: UserState,
    *,
    departure_day: bool = False,
) -> list[Decision]:
    decisions: list[Decision] = []
    budget = (DEPARTURE_DAY_BUDGET if departure_day else state.daily_cap) - state.sent_today
    quiet = _in_quiet_hours(now, state)

    contenders: list[Candidate] = []
    for c in candidates:
        # --- safety bypasses everything: budget, quiet hours, cooldown, snooze ---
        if c.cls == "safety":
            decisions.append(Decision(c.id, Action.SEND, "safety bypass"))
            continue
        if c.cls in state.muted_classes:
            decisions.append(Decision(c.id, Action.SUPPRESS, f"class '{c.cls}' muted"))
            continue
        if state.snoozed_until and now < state.snoozed_until:
            decisions.append(Decision(c.id, Action.SUPPRESS, "user snoozed"))
            continue
        last = state.last_topic_sent.get(c.topic)
        if last and now - last < TOPIC_COOLDOWN:
            decisions.append(Decision(c.id, Action.SUPPRESS, f"topic cooldown ({c.topic})"))
            continue
        if quiet:
            decisions.append(Decision(c.id, Action.DEFER, "quiet hours — resend at quiet end"))
            continue
        contenders.append(c)

    # --- arbitration: highest score wins the remaining budget ---
    #
    # `spent` counts only what actually draws on the budget. Using the loop
    # index instead would let a budget-exempt candidate consume a slot it never
    # used, silently digesting a weather nudge that should have been sent.
    contenders.sort(key=lambda c: _score(c, state), reverse=True)
    spent = 0
    for c in contenders:
        if c.cls in BUDGET_EXEMPT:
            decisions.append(Decision(c.id, Action.SEND, f"'{c.cls}' exempt from budget"))
            continue
        if spent < max(budget, 0):
            decisions.append(Decision(c.id, Action.SEND, "won arbitration"))
            spent += 1
        else:
            decisions.append(Decision(c.id, Action.DIGEST, "over daily budget"))

    order = {c.id: i for i, c in enumerate(candidates)}
    decisions.sort(key=lambda d: order[d.candidate_id])
    return decisions
