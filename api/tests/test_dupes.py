"""Duplicate detection on add-item.

The asymmetry that drives every case here: a MISSED duplicate costs one extra
row the traveller can delete, while a WRONG match silently merges two different
things into one. So the tests lean hard on what must NOT match.
"""
from api.packing.dupes import find_duplicates, index_existing, merged_qty, normalize


def item(name, qty=1, id=None):
    return {"id": id or f"id-{name}", "name": name, "qty": qty}


# ── normalisation: what cannot change which item is meant ───────────────────

def test_case_and_whitespace_are_ignored():
    for a, b in (("Socks", "socks"), ("SOCKS", "socks"), ("  Socks  ", "socks"),
                 ("Power  Bank", "power bank")):
        assert normalize(a) == normalize(b), (a, b)


def test_punctuation_and_accents_normalise():
    assert normalize("T-Shirt") == normalize("T Shirt")
    assert normalize("Café Mug") == normalize("Cafe Mug")
    assert normalize("Adapter (EU)") == normalize("Adapter EU")


def test_a_leading_article_is_dropped():
    assert normalize("The Adapter") == normalize("Adapter")
    assert normalize("A Towel") == normalize("Towel")


def test_an_article_inside_the_name_is_kept():
    """Only a LEADING article is noise. "Pass The Parcel" is not "Parcel"."""
    assert normalize("Pass The Parcel") != normalize("Parcel")


def test_names_that_normalise_away_never_match():
    for junk in ("", "   ", "!!!", None, 123):
        assert normalize(junk) == ""


# ── what must NOT be treated as the same item ──────────────────────────────

def test_singular_and_plural_are_different_items():
    """No stemming, on purpose. A stemmer that folds Sock/Socks also folds
    Short/Shorts and Glass/Glasses, and merging shorts into a shirt is worse
    than showing a duplicate somebody can dismiss."""
    for a, b in (("Sock", "Socks"), ("Short", "Shorts"), ("Glass", "Glasses")):
        assert not find_duplicates([item(a)], [item(b)]), (a, b)


def test_an_extra_word_makes_a_different_item():
    assert not find_duplicates([item("Wool Socks")], [item("Socks")])
    assert not find_duplicates([item("Socks")], [item("Running Socks")])


def test_a_one_letter_difference_is_a_different_item():
    assert not find_duplicates([item("Charger")], [item("Chargers")])


def test_an_empty_list_matches_nothing():
    assert find_duplicates([item("Socks")], []) == []
    assert find_duplicates([], [item("Socks")]) == []


# ── what SHOULD be caught ──────────────────────────────────────────────────

def test_the_obvious_duplicate():
    hits = find_duplicates([item("Socks", 2)], [item("socks", 3, id="x1")])
    assert len(hits) == 1
    h = hits[0]
    assert (h["name"], h["qty"]) == ("Socks", 2)
    assert (h["existing_id"], h["existing_qty"]) == ("x1", 3)


def test_it_reports_the_name_as_it_exists_not_as_typed():
    """The prompt should show the row that is on the list, not the spelling
    just entered — otherwise "Socks already on the list" points at nothing the
    traveller can see."""
    hits = find_duplicates([item("SOCKS")], [item("Wool socks")])
    assert hits == []                       # different item, not a rename
    hits = find_duplicates([item("SOCKS")], [item("socks")])
    assert hits[0]["existing_name"] == "socks"


def test_several_duplicates_in_one_add():
    hits = find_duplicates(
        [item("Socks"), item("Adapter"), item("Novel")],
        [item("socks", id="a"), item("the adapter", id="b")])
    assert {h["name"] for h in hits} == {"Socks", "Adapter"}


def test_first_existing_row_wins_when_the_list_already_has_two():
    idx = index_existing([item("Socks", id="first"), item("socks", id="second")])
    assert idx[normalize("Socks")]["id"] == "first"


# ── merging quantities ─────────────────────────────────────────────────────

def test_merge_adds_the_quantities():
    assert merged_qty(3, 2) == 5


def test_merge_is_capped_at_the_same_ceiling_quick_add_clamps_to():
    assert merged_qty(98, 5) == 99
    assert merged_qty(99, 99) == 99


def test_merge_treats_nonsense_quantities_as_one():
    """A missing or absurd qty must not poison the merge — treat it as 1 so the
    result is still a sane number, never zero or negative."""
    for bad in (None, "", "x", 0, -4):
        assert merged_qty(bad, 1) == 2, bad          # bad→1, plus 1
        assert merged_qty(3, bad) == 4, bad          # and on the other side
