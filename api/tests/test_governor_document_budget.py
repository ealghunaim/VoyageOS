"""Document reminders must not be lost to the daily cap.

The bug these cover: 'document' had priority 5, second only to safety, and it
protected nothing. Arbitration ranks candidates within a single 60-second
tick, but `sent_today` is spent across the whole day — so three weather nudges
at 08:00 left budget=0, and a visa reminder at 09:00 lost to an empty field.
The worker wrote status='digested', which is terminal and which nothing in the
codebase reads. The reminder was deleted in all but name.
"""
from datetime import datetime, timedelta

from api.notifications.governor import (Action, Candidate, UserState, evaluate)

NINE_AM = datetime(2026, 8, 4, 9, 0)
ELEVEN_PM = datetime(2026, 8, 4, 23, 0)


def d(decisions, cid):
    return next(x for x in decisions if x.candidate_id == cid)


def test_sharp_case_visa_reminder_survives_an_exhausted_cap():
    """3 weather nudges at 08:00, then the 7-day visa reminder at 09:00.

    This is the collision that matters most: the 7-day offset lands in
    trip-prep, exactly when departure and task notifications have already
    eaten a cap of 3. Before the fix this asserted SEND and got DIGEST.
    """
    state = UserState(daily_cap=3, sent_today=3)
    visa7 = Candidate(id="visa-7day", cls="document", topic="doc:visa-abc")
    dec = evaluate(NINE_AM, [visa7], state)
    assert dec[0].action is Action.SEND, dec[0].reason
    assert "exempt" in dec[0].reason


def test_exempt_candidate_does_not_consume_a_budget_slot():
    """[document, weather, weather, weather] with budget 3 → all four send.

    Guards the arbitration loop specifically. The original used the loop index
    against the budget; with an exemption in the list that lets the document
    swallow a slot it never drew on, silently digesting a weather nudge that
    should have gone out. Only a separate spend counter gets this right.
    """
    state = UserState(daily_cap=3, sent_today=0)
    cands = [
        Candidate(id="doc", cls="document", topic="doc:passport"),
        Candidate(id="w1", cls="weather", topic="weather:1"),
        Candidate(id="w2", cls="weather", topic="weather:2"),
        Candidate(id="w3", cls="weather", topic="weather:3"),
    ]
    dec = evaluate(NINE_AM, cands, state)
    assert {x.candidate_id for x in dec if x.action is Action.SEND} == \
        {"doc", "w1", "w2", "w3"}


def test_exemption_is_narrower_than_safety_quiet_hours_still_defer():
    """A renewal notice is not an emergency: it waits until morning."""
    state = UserState(daily_cap=3, sent_today=3)
    doc = Candidate(id="doc", cls="document", topic="doc:passport")
    assert d(evaluate(ELEVEN_PM, [doc], state), "doc").action is Action.DEFER


def test_muted_class_still_suppresses_a_document():
    state = UserState(muted_classes={"document"})
    doc = Candidate(id="doc", cls="document", topic="doc:passport")
    assert d(evaluate(NINE_AM, [doc], state), "doc").action is Action.SUPPRESS


def test_snooze_still_suppresses_a_document():
    state = UserState(snoozed_until=NINE_AM + timedelta(hours=2))
    doc = Candidate(id="doc", cls="document", topic="doc:passport")
    assert d(evaluate(NINE_AM, [doc], state), "doc").action is Action.SUPPRESS


def test_topic_cooldown_still_suppresses_a_document():
    """Offsets are days apart, so this should never fire in practice — but the
    exemption must not be a way around the cooldown either."""
    state = UserState(last_topic_sent={"doc:passport": NINE_AM - timedelta(hours=2)})
    doc = Candidate(id="doc", cls="document", topic="doc:passport")
    assert d(evaluate(NINE_AM, [doc], state), "doc").action is Action.SUPPRESS


def test_non_exempt_classes_are_unchanged_by_the_exemption():
    """The cap still holds back ambient noise — that is what it is for."""
    state = UserState(daily_cap=3, sent_today=3)
    w = Candidate(id="w", cls="weather", topic="weather:1")
    assert d(evaluate(NINE_AM, [w], state), "w").action is Action.DIGEST


def test_documents_do_not_starve_the_classes_they_outrank():
    """Several exempt documents plus a task: the task keeps its budget."""
    state = UserState(daily_cap=1, sent_today=0)
    cands = [
        Candidate(id="d1", cls="document", topic="doc:1"),
        Candidate(id="d2", cls="document", topic="doc:2"),
        Candidate(id="d3", cls="document", topic="doc:3"),
        Candidate(id="t1", cls="task", topic="task:1"),
    ]
    dec = evaluate(NINE_AM, cands, state)
    assert {x.candidate_id for x in dec if x.action is Action.SEND} == \
        {"d1", "d2", "d3", "t1"}
