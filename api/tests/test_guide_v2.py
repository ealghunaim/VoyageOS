from api.guide.service import sanitize


def test_health_list_survives_and_clips():
    out = sanitize({"health": [f"tip {i}" for i in range(9)]})
    assert len(out["health"]) == 5


def test_gateway_kind_whitelist_and_fallback():
    out = sanitize({"gateway": {"kind": "spaceport", "name": "X", "code": "abc"}})
    assert out["gateway"]["kind"] == "airport" and out["gateway"]["code"] == "ABC"
    out2 = sanitize({"gateway": {"kind": "port", "name": "Male Ferry Terminal"}})
    assert out2["gateway"]["kind"] == "port"


def test_gateways_list_and_mode_ordering():
    out = sanitize({"gateways": [
        {"kind": "airport", "name": "Capodichino", "code": "NAP"},
        {"kind": "port", "name": "Molo Beverello"}]}, travel_mode="ship")
    assert {g["kind"] for g in out["gateways"]} == {"airport", "port"}
    assert out["gateway"]["kind"] == "port"   # travel_mode=ship sorts port first


def test_gateway_compat_single():
    out = sanitize({"gateway": {"kind": "port", "name": "Male Ferry Terminal"}})
    assert out["gateways"][0]["kind"] == "port" and out["gateway"]["kind"] == "port"


def test_souvenirs_shape_and_cap():
    out = sanitize({"souvenirs": [{"name": f"item{i}", "note": "x", "price_band": "€5"} for i in range(8)]})
    assert len(out["souvenirs"]) == 5
    assert set(out["souvenirs"][0]) == {"name", "note", "price_band"}


def test_eat_split_dishes_restaurants_and_price_clamp():
    out = sanitize({"dishes": [{"name": "Machboos", "note": "spiced rice"}],
                    "restaurants": [{"name": "A", "note": "n", "area": "Souq", "price": 9},
                                    {"name": "B", "price": 0}]})
    assert out["dishes"][0]["name"] == "Machboos"
    assert out["restaurants"][0]["price"] == 4 and out["restaurants"][1]["price"] == 1


def test_cuisine_survives_both_sanitizers():
    """The tag the Eat filter groups on. Both the legacy sanitize() and the
    phase-a sanitize_a() have to emit it — a guide written through whichever
    one lacks it would show an empty filter row."""
    from api.guide.service import sanitize_a
    raw = {"restaurants": [{"name": "A", "note": "n", "price": 2, "cuisine": "Japanese"}]}
    for fn in (sanitize, sanitize_a):
        assert fn(raw)["restaurants"][0]["cuisine"] == "Japanese", fn.__name__


def test_missing_cuisine_is_none_not_empty_string():
    """Guides generated before the tag existed must read as untagged, not as a
    restaurant whose cuisine is "". The client hides the filter row when no
    entry carries one, and "" would count as one."""
    from api.guide.service import sanitize_a
    for fn in (sanitize, sanitize_a):
        out = fn({"restaurants": [{"name": "A", "note": "n", "price": 2}]})
        assert out["restaurants"][0]["cuisine"] is None, fn.__name__


def test_restaurant_cap_is_twelve():
    """Raised from 8 so a cuisine split has something to split. It is a
    ceiling, not a quota — the prompt is explicit that a city with six worth
    naming gets six."""
    from api.guide.service import sanitize_a
    raw = {"restaurants": [{"name": f"R{i}", "note": "n", "price": 2} for i in range(20)]}
    for fn in (sanitize, sanitize_a):
        assert len(fn(raw)["restaurants"]) == 12, fn.__name__


def test_family_play_bands_and_price_clamp():
    from api.guide.family import sanitize_family_play
    out = sanitize_family_play({"activities": [
        {"name": "Desert safari", "bands": {"toddlers": "skip", "teens": "great", "young": "bogus"},
         "price": 9, "indoor": "outdoor", "stroller": False},
        {"junk": 1}]}, ["toddlers", "young", "older", "teens"])
    a = out["activities"][0]
    assert len(out["activities"]) == 1
    assert a["bands"]["teens"] == "great" and a["bands"]["young"] == "okay"  # bogus -> okay
    assert a["bands"]["older"] == "okay"  # missing -> okay
    assert a["price"] == 4 and a["indoor"] == "outdoor"


def test_phrases_sanitize():
    from api.guide.phrases import sanitize_phrases
    out = sanitize_phrases({"language": "Arabic", "phrases": [
        {"en": "Hello", "local": "مرحبا", "pron": "marhaba"}, {"junk": 1},
        {"en": "x" * 200, "local": "y"}]})
    assert out["language"] == "Arabic" and len(out["phrases"]) == 2
    assert out["phrases"][0]["pron"] == "marhaba" and len(out["phrases"][1]["en"]) == 60
