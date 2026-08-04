"""The parts of the landmark matcher that need no network.

The gates themselves were tuned against real guide data and measured live;
these cover the text handling underneath them, which is where a silent
regression would be hardest to notice — a broken affix strip would not error,
it would just quietly stop matching the Play section.
"""
from api.photos.wikimedia import (_commons_filename, _NON_FREE, normalize,
                                  strip_affixes)


def test_strip_affixes_recovers_the_place_from_an_activity_phrase():
    """Play items are places with a verb bolted on; this is what lets them
    match at all."""
    assert strip_affixes("Hike the Fushimi Inari trail") == "Fushimi Inari"
    assert strip_affixes("Cycle through Arashiyama") == "Arashiyama"
    assert strip_affixes("Evening walk through Gion") == "Gion"
    assert strip_affixes("Sadu House visit") == "Sadu House"


def test_strip_affixes_never_empties_a_name():
    """'Visit' alone must not strip to nothing and search for the destination
    on its own, which would match the city and photograph it."""
    assert strip_affixes("visit") == "visit"
    assert strip_affixes("  ") == ""


def test_strip_affixes_leaves_a_plain_landmark_alone():
    assert strip_affixes("Fushimi Inari Taisha") == "Fushimi Inari Taisha"
    assert strip_affixes("Tokyo Skytree") == "Tokyo Skytree"


def test_normalize_drops_parentheticals_both_sides():
    """'Kinkaku-ji (Golden Pavilion)' vs 'Kinkaku-ji' scored 0.53 before this
    and was rejected; it scores 1.00 after."""
    assert normalize("Kinkaku-ji (Golden Pavilion)") == "kinkaku-ji"
    assert normalize("Liberation Tower (Kuwait)") == "liberation tower"


def test_commons_filename_strips_the_tracking_query_first():
    """The image URL carries ?utm_source=…; unquoting before stripping it asks
    Commons for a file whose name ends in the query string, and every
    attribution came back empty."""
    url = ("https://upload.wikimedia.org/wikipedia/commons/0/0f/"
           "Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg"
           "?utm_source=en.wikipedia.org&utm_campaign=api")
    assert _commons_filename(url) == "File:Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg"


def test_commons_filename_decodes_percent_escapes():
    url = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Sens%C5%8D-ji_2020.jpg"
    assert _commons_filename(url) == "File:Sensō-ji_2020.jpg"


def test_non_free_licences_are_rejected():
    for bad in ["Fair use", "Non-free media", "CC BY-NC-SA 4.0",
                "All rights reserved", "noncommercial"]:
        assert _NON_FREE.search(bad), bad


def test_permissive_licences_are_not_rejected():
    """These are the licences that actually came back from real matches."""
    for good in ["CC BY-SA 4.0", "CC BY 4.0", "CC0", "CC BY-SA 3.0",
                 "CC BY 2.5", "Public domain"]:
        assert not _NON_FREE.search(good), good
