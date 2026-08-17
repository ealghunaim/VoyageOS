"""Spotting an item that is already on the list.

NORMALISED EXACT, NEVER FUZZY

The same rule tipMatch.ts uses, for a related reason. Normalisation removes
only what cannot change which item is meant — case, surrounding whitespace,
punctuation, an article. Everything else stays distinct.

No stemming, and that is deliberate rather than lazy. "Sock" and "Socks" look
like an obvious merge until you consider "Short" and "Shorts", "Glass" and
"Glasses", "Legging" and "Leggings" — a stemmer folds those together too, and
merging shorts into a shirt is a worse outcome than showing a duplicate the
traveller can see and dismiss. A missed duplicate costs one extra row they can
delete; a wrong merge silently changes what they packed.

Plural handling is therefore left to the person, who can read.

WHY THIS IS ITS OWN MODULE

The endpoint that uses it also calls a model, inserts rows and checks
ownership. None of that needs to be stood up to answer "does this name already
appear", and a rule this consequential should be exercised directly.
"""
from __future__ import annotations

import re
import unicodedata

#: Leading articles carry no meaning in an item name — "The Adapter" and
#: "Adapter" are one thing. Kept short on purpose: every entry here is a way
#: for two different items to be treated as one.
_LEADING_ARTICLES = ("the ", "a ", "an ")


def normalize(name: str | None) -> str:
    """The comparison form of an item name.

    Empty string for anything that normalises away entirely, which callers
    treat as "no match possible" rather than "matches other empty names".
    """
    if not name or not isinstance(name, str):
        return ""
    # café → cafe, so an accented spelling does not read as a separate item.
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)      # & . ' - → space
    s = re.sub(r"\s+", " ", s).strip()
    for art in _LEADING_ARTICLES:
        if s.startswith(art):
            s = s[len(art):]
            break
    return s.strip()


def index_existing(items: list[dict]) -> dict[str, dict]:
    """normalised name → the existing row.

    First occurrence wins. A list that already contains two rows normalising
    the same way is itself a duplicate the traveller can see; picking the
    earlier one keeps the choice stable rather than depending on sort order.
    """
    out: dict[str, dict] = {}
    for it in items or []:
        key = normalize(it.get("name"))
        if key and key not in out:
            out[key] = it
    return out


def find_duplicates(new_items: list[dict], existing: list[dict]) -> list[dict]:
    """Which of `new_items` are already on the list.

    Returns one entry per collision:

        {"name", "qty", "existing_id", "existing_name", "existing_qty"}

    `existing_name` is carried so the caller can show what is actually on the
    list rather than what was typed — "Socks" matching an existing "socks"
    should display the row that exists.
    """
    idx = index_existing(existing)
    hits = []
    for it in new_items or []:
        key = normalize(it.get("name"))
        if not key:
            continue
        found = idx.get(key)
        if not found:
            continue
        hits.append({
            "name": it.get("name"),
            "qty": it.get("qty") or 1,
            "existing_id": found.get("id"),
            "existing_name": found.get("name"),
            "existing_qty": found.get("qty") or 1,
        })
    return hits


def merged_qty(existing_qty, adding_qty, *, cap: int = 99) -> int:
    """What a merge should leave behind.

    Capped at the same ceiling the quick-add parser clamps to, so merging
    cannot produce a quantity the app would otherwise refuse to create.
    """
    def n(v):
        try:
            return max(1, int(v))
        except (TypeError, ValueError):
            return 1
    return min(n(existing_qty) + n(adding_qty), cap)
