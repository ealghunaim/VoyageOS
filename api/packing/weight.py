"""Weight math — pure, tested, model-free (Part 2 F2.3, generic mode)."""


def sum_weight(rows: list[dict]) -> tuple[int, int, int]:
    """rows: qty, status, items{default_weight_g}? → (total_g, counted, unweighed).
    Only accepted/packed items count; rejected and merely-suggested don't ride."""
    total = counted = unweighed = 0
    for r in rows:
        if r.get("status") not in ("accepted", "packed"):
            continue
        w = (r.get("items") or {}).get("default_weight_g")
        if w is None:
            unweighed += 1
            continue
        total += int(w) * int(r.get("qty") or 1)
        counted += 1
    return total, counted, unweighed
