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


def test_family_play_bands_and_price_clamp():
    from api.guide.family import sanitize_family_play
    out = sanitize_family_play({"activities": [
        {"name": "Desert safari", "bands": {"toddlers": "skip", "teens": "great", "young": "bogus"},
         "price": 9, "indoor": "outdoor", "stroller": False},
        {"junk": 1}]})
    a = out["activities"][0]
    assert len(out["activities"]) == 1
    assert a["bands"]["teens"] == "great" and a["bands"]["young"] == "okay"  # bogus -> okay
    assert a["bands"]["older"] == "okay"  # missing -> okay
    assert a["price"] == 4 and a["indoor"] == "outdoor"
