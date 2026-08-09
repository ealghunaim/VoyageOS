"""The consolidated ownership guard.

The behavioural proof that this refactor changed nothing lives in
scripts/ownership_snapshot.py, which drives all 21 guarded routes three ways
and diffs the results. These cover the guard's own contract — in particular
the property that is easy to lose later: missing and forbidden must be
indistinguishable.
"""
import pytest
from fastapi import HTTPException

from api.core.trips import NOT_FOUND, owned_trip, owned_trip_via_destination


class FakeQuery:
    def __init__(self, rows, log): self._rows, self._log, self._f = rows, log, {}
    def select(self, *a): return self
    def limit(self, n): return self
    def eq(self, col, val): self._f[col] = val; return self
    def execute(self):
        self._log.append(dict(self._f))
        rows = [r for r in self._rows
                if all(r.get(k) == v for k, v in self._f.items())]
        return type("R", (), {"data": rows})()


class FakeDB:
    def __init__(self, **tables): self.tables, self.log = tables, []
    def table(self, name): return FakeQuery(self.tables.get(name, []), self.log)


TRIP = {"id": "t1", "owner_id": "u1", "title": "Kyoto"}


def test_the_owner_gets_the_whole_row():
    db = FakeDB(trips=[TRIP])
    assert owned_trip(db, "t1", "u1") == TRIP


def test_someone_elses_trip_is_404():
    db = FakeDB(trips=[TRIP])
    with pytest.raises(HTTPException) as e:
        owned_trip(db, "t1", "u2")
    assert e.value.status_code == 404


def test_a_missing_trip_is_404():
    db = FakeDB(trips=[])
    with pytest.raises(HTTPException) as e:
        owned_trip(db, "nope", "u1")
    assert e.value.status_code == 404


def test_forbidden_and_missing_are_indistinguishable():
    """The property worth protecting. A 403 for "exists but not yours" would
    turn the endpoint into an oracle for other people's trip ids — ask for one,
    and the status tells you whether it exists."""
    db = FakeDB(trips=[TRIP])
    with pytest.raises(HTTPException) as forbidden:
        owned_trip(db, "t1", "u2")
    with pytest.raises(HTTPException) as missing:
        owned_trip(db, "does-not-exist", "u2")
    assert (forbidden.value.status_code, forbidden.value.detail) == \
           (missing.value.status_code, missing.value.detail)
    assert forbidden.value.detail == NOT_FOUND == "Trip not found"


def test_the_query_filters_on_both_id_and_owner():
    """Belt and braces: an owner filter dropped in a future edit would make
    every trip readable by everyone, and the row-shape tests above would all
    still pass."""
    db = FakeDB(trips=[TRIP])
    owned_trip(db, "t1", "u1")
    assert db.log[0] == {"id": "t1", "owner_id": "u1"}


def test_writing_does_not_change_behaviour_yet():
    """The seam for the subscription lock. It must be inert until 2b."""
    db = FakeDB(trips=[TRIP])
    assert owned_trip(db, "t1", "u1", writing=True) == \
           owned_trip(db, "t1", "u1", writing=False)


# ── the destination variant ─────────────────────────────────────────────────

DEST = {"id": "d1", "trip_id": "t1", "place_name": "Kyoto"}


def test_destination_variant_returns_both():
    db = FakeDB(destinations=[DEST], trips=[TRIP])
    dest, trip = owned_trip_via_destination(db, "d1", "u1")
    assert dest == DEST and trip == TRIP


def test_destination_variant_keeps_its_own_message():
    """It must NOT say "Trip not found". Reached through a destination id,
    that phrasing would confirm the destination exists and hangs off a trip
    that is not yours."""
    db = FakeDB(destinations=[DEST], trips=[TRIP])
    with pytest.raises(HTTPException) as e:
        owned_trip_via_destination(db, "d1", "u2")
    assert e.value.detail == "Destination not found"
    assert e.value.detail != NOT_FOUND


def test_destination_missing_and_forbidden_also_match():
    db = FakeDB(destinations=[DEST], trips=[TRIP])
    with pytest.raises(HTTPException) as forbidden:
        owned_trip_via_destination(db, "d1", "u2")
    with pytest.raises(HTTPException) as missing:
        owned_trip_via_destination(db, "nope", "u2")
    assert (forbidden.value.status_code, forbidden.value.detail) == \
           (missing.value.status_code, missing.value.detail)
