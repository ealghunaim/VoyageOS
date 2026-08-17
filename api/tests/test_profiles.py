"""Traveler profiles: what is stored, and what reaches the model.

Two properties matter more than the rest. Absent profiles must behave exactly
as before this feature existed, and no name or birth date may leave for the
model.
"""
from datetime import date

from api.packing.profiles import (MAX_NOTE, STARTING_SETS, WARDROBE, age_band,
                                  party_block, sanitize_profile)

TODAY = date(2026, 8, 17)


# ── the vocabulary ─────────────────────────────────────────────────────────

def test_accessories_is_in_the_vocabulary():
    """Belts and watches already appear in generated lists. Without a category
    they would either bypass the clothing filter or disappear for anyone with a
    profile — a silent regression for the people who filled this in."""
    assert "accessories" in WARDROBE


def test_no_per_person_style_is_stored():
    """Style stays account-level. A payload carrying one is tolerated and
    ignored rather than rejected."""
    p = sanitize_profile({"style": "thorough", "wardrobe": ["tops"]})
    assert p == {"wardrobe": ["tops"]}


def test_every_starting_set_uses_only_real_categories():
    for name, cats in STARTING_SETS.items():
        assert set(cats) <= set(WARDROBE), name


def test_starting_sets_are_supersets_of_basics():
    basics = set(STARTING_SETS["basics"])
    for name, cats in STARTING_SETS.items():
        assert basics <= set(cats), f"{name} drops something from basics"


def test_trip_dependent_categories_are_in_no_starting_set():
    """swimwear and activewear follow the trip, not the person — the
    activities on a trip inform them better than a default would."""
    for name, cats in STARTING_SETS.items():
        assert "swimwear" not in cats and "activewear" not in cats, name


# ── sanitising ─────────────────────────────────────────────────────────────

def test_unknown_categories_are_dropped():
    assert sanitize_profile({"wardrobe": ["tops", "invented", "kilt"]}) == {"wardrobe": ["tops"]}


def test_order_is_canonical_so_the_context_hash_is_stable():
    """Two people who ticked the same boxes must produce identical JSON, or the
    generation cache misses for no reason."""
    a = sanitize_profile({"wardrobe": ["footwear", "tops"]})
    b = sanitize_profile({"wardrobe": ["tops", "footwear", "tops"]})
    assert a == b == {"wardrobe": ["tops", "footwear"]}


def test_empty_and_absent_are_the_same_thing():
    for raw in (None, {}, {"wardrobe": []}, {"wardrobe": [], "notes": "  "},
                "nonsense", 42, {"wardrobe": ["nope"]}):
        assert sanitize_profile(raw) is None, raw


def test_notes_are_trimmed_and_capped():
    p = sanitize_profile({"notes": "  contact lenses  "})
    assert p == {"notes": "contact lenses"}
    long = sanitize_profile({"notes": "x" * 500})
    assert len(long["notes"]) == MAX_NOTE


# ── age bands ──────────────────────────────────────────────────────────────

def test_age_bands():
    for dob, want in (("2024-01-01", "0-3"), ("2020-01-01", "4-7"),
                      ("2016-01-01", "8-12"), ("2010-01-01", "13-17"),
                      ("1990-01-01", "adult")):
        assert age_band(dob, TODAY) == want, dob


def test_a_birthday_later_this_year_has_not_happened_yet():
    assert age_band("2018-12-31", TODAY) == "4-7"     # 7, not 8


def test_unknown_or_broken_ages_default_to_adult():
    """An adult list is the safer default; a missing birthday should not
    quietly turn somebody into a toddler."""
    for dob in (None, "", "not-a-date", "2030-01-01", 12345):
        assert age_band(dob, TODAY) == "adult", dob


# ── the party block ────────────────────────────────────────────────────────

def test_a_lone_traveler_with_no_profile_sends_nothing():
    """Behaviour before this feature, preserved exactly."""
    assert party_block({}) == []
    assert party_block({"dob": "1990-01-01"}) == []
    assert party_block(None) == []


def test_the_owner_appears_once_they_have_a_profile():
    p = party_block({"dob": "1990-01-01", "packing": {"wardrobe": ["tops"]}}, on=TODAY)
    assert p == [{"label": "You", "age_band": "adult", "wardrobe": ["tops"]}]


def test_members_appear_even_without_profiles():
    """A second person is itself information the prompt never had."""
    p = party_block({"members": [{"name": "Layla", "relation": "partner"}]}, on=TODAY)
    assert p == [{"label": "You", "age_band": "adult"},
                 {"label": "partner", "age_band": "adult"}]


def test_names_and_birth_dates_never_reach_the_model():
    extras = {"dob": "1990-05-05",
              "members": [{"name": "Layla", "relation": "partner", "dob": "1993-04-02",
                           "packing": {"wardrobe": ["dresses"]}}]}
    blob = repr(party_block(extras, on=TODAY))
    assert "Layla" not in blob
    assert "1993-04-02" not in blob and "1990-05-05" not in blob
    assert "partner" in blob and "adult" in blob


def test_a_child_is_labelled_and_banded():
    p = party_block({"packing": {"wardrobe": ["tops"]},
                     "members": [{"relation": "child", "dob": "2020-06-01"}]}, on=TODAY)
    assert p[1] == {"label": "child", "age_band": "4-7"}


def test_junk_members_are_skipped_not_fatal():
    p = party_block({"packing": {"wardrobe": ["tops"]},
                     "members": ["nonsense", None, {"relation": "friend"}]}, on=TODAY)
    assert [e["label"] for e in p] == ["You", "friend"]


# ── the prompt contract ────────────────────────────────────────────────────
#
# These assert on the prompt TEXT. They cannot prove the model obeys it — only
# a real generation can, and that is the measurement gate — but they do stop
# the clothing-only scoping being edited away by someone tightening wording.

def test_the_wardrobe_rule_scopes_to_clothing_only():
    """The failure this guards against: "suggest only from these categories"
    reads as a whole-list filter and starves a profiled traveller of
    toiletries, chargers and documents."""
    from api.ai_gateway.prompts import PACKING_SYSTEM_PROMPT as P
    assert "CONSTRAINS CLOTHING ONLY" in P
    assert "toothbrush" in P.lower()
    for word in ("toiletries", "medications", "electronics", "documents"):
        assert word in P, word


def test_the_prompt_says_a_profileless_traveler_keeps_default_judgement():
    from api.ai_gateway.prompts import PACKING_SYSTEM_PROMPT as P
    assert "no `wardrobe` gets your default judgement" in P


def test_the_output_schema_is_unchanged_by_party():
    """One flat list. A per-person breakdown would break every consumer of
    the generation output."""
    from api.ai_gateway.prompts import PACKING_SYSTEM_PROMPT as P
    assert "Do NOT add a per-person breakdown" in P


def test_prompt_version_was_bumped_for_this_change():
    """generation_snapshot records the version; leaving it stale would make
    old and new lists indistinguishable in the record."""
    from api.ai_gateway.prompts import PROMPT_VERSION
    assert PROMPT_VERSION != "v0.5-4"
