"""One ceiling for item quantities.

WHY THIS FILE EXISTS

The number 99 appeared in seven places — the generation prompt, the packing
schema, the quick-add schema and its clamp, the router's patch model, the
service layer's insert, and dupes.merged_qty — while the database column
carried `check (qty between 1 and 14)` and gear/router.py used 14. Nobody was
wrong locally. Every site was internally consistent and the system as a whole
was not.

What that cost: the quantity engine deliberately leaves MEDICATION uncapped so
a real day-count survives, so a three-week trip with a daily medication
produces qty 24. The insert is batched, so ONE such row made the whole
generated packing list fail — after the model had already been paid for.

The ceiling now lives here, and test_qty_ceiling.py asserts every site agrees
with it. A literal in an eighth place is the failure mode this is guarding.
"""

#: Maximum quantity for a single packing list item.
#:
#: Matched by `packing_list_items_qty_check` in migration 0031. Changing this
#: number REQUIRES a migration — the column is the one place that can reject
#: a value rather than merely clamp it, and it fails a whole batch when it does.
MAX_QTY = 99

#: Minimum. A row for zero of something is not a row.
MIN_QTY = 1


def clamp_qty(value) -> int:
    """A quantity the column will accept, from anything.

    Clamping at the write boundary rather than trusting callers: the cost of a
    value the column refuses is not one bad row, it is the entire batch it
    travelled in.
    """
    try:
        n = int(value)
    except (TypeError, ValueError):
        return MIN_QTY
    return max(MIN_QTY, min(n, MAX_QTY))
