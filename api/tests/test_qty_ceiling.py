"""One ceiling for quantities, asserted across every place that has an opinion.

The bug this exists to prevent was not a wrong number anywhere. It was seven
right numbers that disagreed: the prompt, the schemas, the clamps and
merged_qty all said 99, the column said 14, and gear/router.py said 14 too.
Each file was internally consistent. The system was not.

The cost was disproportionate to the cause. The quantity engine deliberately
leaves MEDICATION uncapped so a prescription day-count survives, so a 21-day
trip yields qty 24; the generated list is inserted as one batch; and one
rejected row loses the whole list, after the model has been paid for.

So the invariant is asserted rather than trusted, including against the
migration text — the column is the only participant that can reject rather
than clamp.
"""
import pathlib
import re

import pytest

from api.packing.limits import MAX_QTY, MIN_QTY, clamp_qty

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
MIGRATION = REPO / "supabase" / "migrations" / "0031_qty_ceiling.sql"


def test_the_migration_and_the_constant_agree():
    """The column is the one place a bad value is fatal rather than clamped,
    so the constant must match the constraint that ships."""
    # Comments stripped first. The migration's own prose quotes the OLD
    # constraint while explaining it, and a naive search matches that instead
    # of the statement that actually runs.
    sql = "\n".join(l for l in MIGRATION.read_text().split("\n")
                    if not l.lstrip().startswith("--"))
    m = re.search(r"check \(qty between (\d+) and (\d+)\)", sql)
    assert m, "0031 no longer states a qty range in a form this test can read"
    assert int(m.group(1)) == MIN_QTY
    assert int(m.group(2)) == MAX_QTY, (
        f"migration allows {m.group(2)} but MAX_QTY is {MAX_QTY} — the two "
        "drifting apart is the original bug")


def test_no_stray_qty_literals_remain():
    """An eighth literal is the failure mode. Anything validating or clamping a
    qty must reference the constant, not spell a number."""
    offenders = []
    for path in (REPO / "api").rglob("*.py"):
        if "tests" in path.parts or path.name == "limits.py":
            continue
        for i, line in enumerate(path.read_text().split("\n"), 1):
            if "qty" not in line.lower():
                continue
            if re.search(r"\ble=\s*\d+|\bge=\s*\d+|min\(\s*int|cap\s*[:=]\s*\d+", line):
                offenders.append(f"{path.relative_to(REPO)}:{i}: {line.strip()}")
    assert not offenders, "qty bounds spelled as literals:\n  " + "\n  ".join(offenders)


def test_the_quantity_engine_can_exceed_the_old_ceiling():
    """The regression in one line: if this ever returns <= 14 again, either
    medication got capped (which under-packs a prescription) or the engine
    changed and this test should be revisited deliberately."""
    from api.packing.quantity_engine import compute_qty
    r = compute_qty(item_class="medication", days=21, laundry_available=False, model_qty=21)
    assert r.qty > 14, "medication no longer produces a real day-count"
    assert r.qty <= MAX_QTY, f"engine produced {r.qty}, above the column ceiling"


@pytest.mark.parametrize("raw,want", [
    (1, 1), (14, 14), (15, 15), (99, 99),
    (100, MAX_QTY), (10_000, MAX_QTY),
    (0, MIN_QTY), (-5, MIN_QTY),
    (None, MIN_QTY), ("", MIN_QTY), ("abc", MIN_QTY), ("7", 7),
])
def test_clamp_never_returns_something_the_column_refuses(raw, want):
    assert clamp_qty(raw) == want


def test_merged_qty_caps_at_the_column_ceiling():
    """The shipped bug: merging 10 with 8 produced 18 against a column that
    refused anything over 14, so the update threw instead of capping."""
    from api.packing.dupes import merged_qty
    assert merged_qty(10, 8) == 18            # legal now, and it is a real total
    assert merged_qty(90, 90) == MAX_QTY      # still capped, never unbounded
    assert merged_qty(None, None) >= MIN_QTY
