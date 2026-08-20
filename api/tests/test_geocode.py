"""Locating a guide's places: politeness, idempotency, and giving up.

The external service is free, unkeyed and run by a foundation. Everything here
guards the ways a client turns from polite into a nuisance — sending too fast,
retrying a name that will never resolve, or redoing work it already did.

No network: the lookup is stubbed. What is being tested is the surrounding
discipline, which is where the bugs would be.
"""
import time

import pytest

from api.guide import geocode


@pytest.fixture(autouse=True)
def _reset_throttle():
    geocode._last_request_at = 0.0
    yield
    geocode._last_request_at = 0.0


def _guide(names, field="restaurants"):
    return {field: [{"name": n} for n in names]}


# ── politeness ─────────────────────────────────────────────────────────────

def test_the_interval_honours_the_stated_policy():
    """Nominatim's policy is an absolute maximum of one request per second.
    The margin is deliberate: exactly 1.0 races the far end's own clock."""
    assert geocode.MIN_INTERVAL_S >= 1.0


def test_the_throttle_is_global_not_per_client():
    """A per-instance interval would let N parallel tasks send N requests a
    second while each believed it was behaving. The lock and the timestamp are
    module-level for that reason."""
    import threading
    assert isinstance(geocode._rate_lock, type(threading.Lock()))
    assert hasattr(geocode, "_last_request_at")


def test_the_throttle_actually_waits(monkeypatch):
    calls = []
    monkeypatch.setattr(geocode.time, "sleep", lambda s: calls.append(s))
    monkeypatch.setattr(geocode.time, "monotonic", lambda: 100.0)
    geocode._last_request_at = 99.5           # half a second ago

    class FakeClient:
        def get(self, url, params=None):
            raise RuntimeError("stop here — the wait is what matters")

    try:
        geocode._throttled_get(FakeClient(), {})
    except RuntimeError:
        pass
    assert calls and calls[0] > 0.5, f"did not wait long enough: {calls}"


def test_the_user_agent_identifies_and_can_be_contacted():
    """Their policy requires an application identity and a way to reach us. A
    bare library default is what gets a client blocked."""
    assert "VoyageOS" in geocode.USER_AGENT
    assert "http" in geocode.USER_AGENT


# ── idempotency ────────────────────────────────────────────────────────────

def test_a_located_row_is_never_looked_up_again(monkeypatch):
    seen = []
    monkeypatch.setattr(geocode, "_lookup", lambda c, n, city, cc: seen.append(n) or {"lat": 1, "lng": 2})
    g = _guide(["A", "B"])
    geocode.locate(g, "Kyoto", "JP")
    assert seen == ["A", "B"]
    geocode.locate(g, "Kyoto", "JP")          # second run
    assert seen == ["A", "B"], "re-looked-up an already located row"


def test_a_never_tried_row_is_distinguishable_from_a_failed_one():
    """Three states, and they must not collapse: absent means never tried,
    a dict means located, and null means tried and failed. Collapsing the
    first and third is what makes a task either redo work or lose the record
    of a failure."""
    g = {"restaurants": [{"name": "never"}, {"name": "ok", "coords": {"lat": 1, "lng": 2}},
                         {"name": "failed", "coords": None, "geo_tries": 1}]}
    assert geocode.pending(g) == 2            # the untried one and the retryable one


def test_a_run_resumes_where_the_last_one_stopped(monkeypatch):
    """The budget is a stopping point, not a discard. A task killed halfway
    must not restart from the beginning."""
    monkeypatch.setattr(geocode, "MAX_LOOKUPS", 2)
    monkeypatch.setattr(geocode, "_lookup", lambda c, n, city, cc: {"lat": 1, "lng": 2})
    g = _guide(["A", "B", "C", "D"])
    geocode.locate(g, "Kyoto", "JP")
    done = [r for r in g["restaurants"] if r.get("coords")]
    assert len(done) == 2, "budget not respected"
    assert geocode.pending(g) == 2, "the remainder was not left for a later run"

    geocode.locate(g, "Kyoto", "JP")
    assert all(r.get("coords") for r in g["restaurants"]), "did not resume"


def test_the_same_name_in_two_sections_is_one_lookup(monkeypatch):
    seen = []
    monkeypatch.setattr(geocode, "_lookup", lambda c, n, city, cc: seen.append(n) or None)
    g = {"restaurants": [{"name": "Gion"}], "visit": [{"name": "Gion"}]}
    geocode.locate(g, "Kyoto", "JP")
    assert seen == ["Gion"], f"looked the same name up twice: {seen}"


# ── giving up ──────────────────────────────────────────────────────────────

def test_a_failing_name_is_retried_then_abandoned(monkeypatch):
    """A place that is not in OpenStreetMap will not appear in it because we
    asked again. Retrying forever is the unbounded traffic the policy exists to
    prevent — but one transient outage should not condemn a real place."""
    tries = []
    monkeypatch.setattr(geocode, "_lookup", lambda c, n, city, cc: tries.append(n) or None)
    g = _guide(["Ghost"])
    for _ in range(geocode.MAX_TRIES + 3):
        geocode.locate(g, "Kyoto", "JP")
    assert len(tries) == geocode.MAX_TRIES, f"retried {len(tries)} times"
    assert g["restaurants"][0]["coords"] is None
    assert geocode.pending(g) == 0, "still considered pending after giving up"


def test_a_recovered_name_drops_its_failure_count(monkeypatch):
    """A row that succeeds on retry should not carry a scar that counts toward
    a future abandonment."""
    state = {"fail": True}
    monkeypatch.setattr(geocode, "_lookup",
                        lambda c, n, city, cc: None if state["fail"] else {"lat": 1, "lng": 2})
    g = _guide(["Flaky"])
    geocode.locate(g, "Kyoto", "JP")
    assert g["restaurants"][0]["geo_tries"] == 1
    state["fail"] = False
    geocode.locate(g, "Kyoto", "JP")
    assert g["restaurants"][0]["coords"] == {"lat": 1, "lng": 2}
    assert "geo_tries" not in g["restaurants"][0]


# ── the honest count ───────────────────────────────────────────────────────

def test_the_count_reports_what_was_found_not_what_was_tried(monkeypatch):
    monkeypatch.setattr(geocode, "_lookup",
                        lambda c, n, city, cc: {"lat": 1, "lng": 2} if n == "Gion" else None)
    g = {"restaurants": [{"name": "Gion"}, {"name": "Ghost"}], "visit": [{"name": "Other"}]}
    geocode.locate(g, "Kyoto", "JP")
    assert g["located"] == {"found": 1, "total": 3}
