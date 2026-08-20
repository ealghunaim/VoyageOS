"""Every mutating route must declare itself a write.

`owned_trip(..., writing=True)` is the seam the trip lock will branch on. It
does nothing today, which is exactly the problem: a route that forgets it
behaves identically until the lock ships, and then silently permits an edit to
a locked trip. There is no failing test to find later — the bug arrives with
the feature.

So the invariant is asserted structurally, by reading the source. Twelve routes
were missing the flag when this was written; this stops the thirteenth.
"""
import ast
import pathlib

API = pathlib.Path(__file__).resolve().parent.parent
MUTATING = {"post", "patch", "put", "delete"}


def _routes():
    """(file, function, method, calls_owned_trip, declares_writing) per route."""
    for path in sorted(API.rglob("router.py")) + sorted(API.rglob("quick.py")):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            # ANY name ending in "router", not just the literal `router`.
            #
            # This said `== "router"` and therefore could not see
            # @items_router.patch — so update_item, a PATCH and the single
            # most-hit write in the app, was never audited and carried no
            # writing=True. The test that existed to close the class had a
            # blind spot exactly the width of one variable name.
            methods = {
                d.func.attr
                for d in node.decorator_list
                if isinstance(d, ast.Call)
                and isinstance(d.func, ast.Attribute)
                and isinstance(d.func.value, ast.Name)
                and d.func.value.id.endswith("router")
            }
            if not methods:
                continue
            owned = writing = False
            for sub in ast.walk(node):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) \
                        and sub.func.id.startswith("owned_trip"):
                    owned = True
                    if any(k.arg == "writing" and getattr(k.value, "value", None) is True
                           for k in sub.keywords):
                        writing = True
            for m in methods:
                yield path.relative_to(API), node.name, m, owned, writing


def test_every_mutating_route_declares_the_write():
    missing = [f"{f}:{fn} ({m.upper()})"
               for f, fn, m, owned, writing in _routes()
               if m in MUTATING and owned and not writing]
    assert not missing, (
        "these change a trip but do not pass writing=True, so the coming lock "
        "would not stop them:\n  " + "\n  ".join(missing))


def test_no_read_route_claims_to_write():
    """The flag has to mean something. A GET carrying writing=True would make
    the lock refuse a read, which is the opposite of the intent — a locked trip
    stays fully readable."""
    liars = [f"{f}:{fn} (GET)"
             for f, fn, m, _owned, writing in _routes()
             if m == "get" and writing]
    assert not liars, "read routes claiming to write:\n  " + "\n  ".join(liars)


def test_the_audit_actually_sees_routes():
    """A parser that silently matches nothing would make both tests above pass
    forever. Guard the guard."""
    found = list(_routes())
    assert len(found) > 30, f"only {len(found)} routes parsed — the AST walk is broken"
    assert any(m in MUTATING and owned for _f, _fn, m, owned, _w in found)


# ── the user_id-without-a-foreign-key class ────────────────────────────────
#
# Five tables carry a user_id with no FK. Three are deleted with the user
# (NON_CASCADING), two outlive them with the person removed (PSEUDONYMIZE).
# The bug this guards against is a sixth appearing in neither, which is how
# ai_runs and notification_log sat unswept until the constraint census.

def test_the_two_retention_policies_are_disjoint():
    """A table in both lists would be deleted AND nulled, and which happened
    would depend on call order."""
    from api.account.deletion import NON_CASCADING, PSEUDONYMIZE
    overlap = {t for t, _ in NON_CASCADING} & {t for t, _ in PSEUDONYMIZE}
    assert not overlap, f"tables in both policies: {overlap}"


def test_every_fk_less_user_table_has_a_stated_policy():
    """Names the five known members explicitly. A new table with an unreferenced
    user_id must be added to one list or the other — and choosing is the point,
    since the failure mode is not choosing."""
    from api.account.deletion import NON_CASCADING, PSEUDONYMIZE
    known = {"device_tokens", "food_tips", "flight_api_usage",   # deleted
             "ai_runs", "notification_log"}                      # pseudonymized
    covered = {t for t, _ in NON_CASCADING} | {t for t, _ in PSEUDONYMIZE}
    assert known == covered, (
        f"missing a policy: {known - covered};  unexpected: {covered - known}")


# ── every write declares what KIND of write it is ──────────────────────────
#
# may_write(trip, user, scope) decides by scope: PLAN hits the lock, RECORD
# passes it. That only holds if every writing route says which it is. A route
# that omits scope silently takes the PLAN default — safe, but silent, and a
# journal write defaulting to PLAN would lock the one surface the lock exists
# to leave open.

def _writing_routes():
    for path in sorted(API.rglob("*.py")):
        if "tests" in path.parts:
            continue
        src = path.read_text()
        if "writing=True" not in src:
            continue
        tree = ast.parse(src)
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for sub in ast.walk(node):
                if (isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name)
                        and sub.func.id.startswith("owned_trip")):
                    kw = {k.arg: k for k in sub.keywords}
                    if getattr(kw.get("writing"), "value", None) is None:
                        continue
                    if kw["writing"].value.value is not True:
                        continue
                    scope = kw.get("scope")
                    name = getattr(scope.value, "id", None) if scope else None
                    # A route may COMPUTE its scope — update_item does, because
                    # ItemPatch mixes a status transition with content edits.
                    # That is legitimate only if it chooses between the two
                    # constants; anything else is a scope nobody defined.
                    if name is not None and name not in ("PLAN", "RECORD"):
                        body = ast.dump(node)
                        if "'PLAN'" in body and "'RECORD'" in body:
                            name = "COMPUTED"
                    yield path.relative_to(API), node.name, name


def test_every_writing_route_declares_a_scope():
    missing = [f"{f}:{fn}" for f, fn, scope in _writing_routes() if scope is None]
    assert not missing, (
        "these write but do not say whether they are PLAN or RECORD, so they "
        "take the PLAN default silently:\n  " + "\n  ".join(missing))


def test_scopes_are_only_the_two_that_exist():
    from api.core.trips import PLAN, RECORD
    assert {PLAN, RECORD} == {"plan", "record"}
    bad = [f"{f}:{fn} → {scope}" for f, fn, scope in _writing_routes()
           if scope not in ("PLAN", "RECORD", "COMPUTED")]
    assert not bad, "unknown scope:\n  " + "\n  ".join(bad)


def test_a_computed_scope_chooses_between_the_two_constants():
    """update_item is the only mixed route: `status` alone is a RECORD, and any
    content field makes it a PLAN. The risk is someone later computing a scope
    from something else entirely, so the computation is required to mention
    both constants."""
    computed = {fn for _f, fn, scope in _writing_routes() if scope == "COMPUTED"}
    assert computed == {"update_item"}, f"mixed-scope routes changed: {computed}"

    src = (API / "packing" / "router.py").read_text()
    assert 'proposed == {"status"}' in src, (
        "update_item no longer splits on status-only — the exemption argued for "
        "was status TRANSITIONS, not the whole route")


def test_the_record_exemptions_are_exactly_the_ones_argued_for():
    """Named explicitly so widening the exemption list is a decision somebody
    makes, not a line somebody adds. Each of these has a reason:

      add_note, patch_note  journaling a finished trip is the point (2d)
      debrief               revising one is the point, and it replaces safely
      delete_trip           a lock that traps data is a hostage, not a lock
      set_lock              the lock cannot gate the changing of the lock
    """
    record = {fn for _f, fn, scope in _writing_routes() if scope == "RECORD"}
    assert record == {"add_note", "patch_note", "debrief", "delete_trip",
                      "set_lock"}, f"RECORD scope changed: {record}"
