from datetime import datetime, timedelta
from api.notifications.governor import Action, Candidate, UserState, evaluate

NOON = datetime(2026, 7, 27, 12, 0)


def d(decisions, cid):
    return next(x for x in decisions if x.candidate_id == cid)


def test_f33_canonical_wednesday():
    """Spec scenario: 5 candidates, budget 3 -> 2 tasks + 1 weather send;
    2nd weather -> digest; social -> digest."""
    cands = [
        Candidate("w1", "weather", "weather:kyoto:rain", urgency=0.9),
        Candidate("w2", "weather", "weather:kyoto:wind", urgency=0.4),
        Candidate("t1", "task", "task:laundry"),
        Candidate("t2", "task", "task:charge"),
        Candidate("s1", "social", "social:claim"),
    ]
    dec = evaluate(NOON, cands, UserState())
    sends = {x.candidate_id for x in dec if x.action == Action.SEND}
    assert sends == {"t1", "t2", "w1"}
    assert d(dec, "w2").action == Action.DIGEST
    assert d(dec, "s1").action == Action.DIGEST


def test_departure_day_budget_is_five():
    cands = [Candidate(f"t{i}", "task", f"task:{i}") for i in range(6)]
    dec = evaluate(NOON, cands, UserState(), departure_day=True)
    assert sum(1 for x in dec if x.action == Action.SEND) == 5


def test_safety_bypasses_budget_quiet_and_snooze():
    late = datetime(2026, 7, 27, 23, 30)  # inside 22:00-08:00 quiet
    state = UserState(sent_today=3, snoozed_until=late + timedelta(days=1))
    dec = evaluate(late, [Candidate("s", "safety", "safety:typhoon")], state)
    assert d(dec, "s").action == Action.SEND


def test_topic_cooldown_suppresses_with_reason():
    state = UserState(last_topic_sent={"weather:kyoto:rain": NOON - timedelta(hours=3)})
    dec = evaluate(NOON, [Candidate("w", "weather", "weather:kyoto:rain")], state)
    assert d(dec, "w").action == Action.SUPPRESS
    assert "cooldown" in d(dec, "w").reason


def test_muted_class_and_quiet_hours():
    state = UserState(muted_classes={"weather"})
    dec = evaluate(NOON, [Candidate("w", "weather", "weather:x")], state)
    assert d(dec, "w").action == Action.SUPPRESS
    late = datetime(2026, 7, 27, 23, 0)
    dec2 = evaluate(late, [Candidate("t", "task", "task:x")], UserState())
    assert d(dec2, "t").action == Action.DEFER


def test_cap_one_picks_single_most_important():
    """Arbitration under a budget of one: the higher class wins the slot.

    Written with 'document' as the important class, which no longer works as an
    example — document is budget-exempt, so it sends without taking the slot
    and the loser keeps it. Rewritten with two classes that do draw on the
    budget, so it still tests the ordering it was written to test. The document
    behaviour it used to assert now lives in
    test_governor_document_budget.py::test_documents_do_not_starve_the_classes_they_outrank.
    """
    state = UserState(daily_cap=1)
    cands = [Candidate("w", "weather", "weather:x"), Candidate("t", "task", "task:x")]
    dec = evaluate(NOON, cands, state)
    assert d(dec, "t").action == Action.SEND       # task (3) outranks weather (2)
    assert d(dec, "w").action == Action.DIGEST
