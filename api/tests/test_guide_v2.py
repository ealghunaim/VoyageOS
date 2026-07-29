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
