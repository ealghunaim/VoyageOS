from api.guide.service import sanitize


def test_health_list_survives_and_clips():
    out = sanitize({"health": [f"tip {i}" for i in range(9)]})
    assert len(out["health"]) == 5


def test_gateway_kind_whitelist_and_fallback():
    out = sanitize({"gateway": {"kind": "spaceport", "name": "X", "code": "abc"}})
    assert out["gateway"]["kind"] == "airport" and out["gateway"]["code"] == "ABC"
    out2 = sanitize({"gateway": {"kind": "port", "name": "Male Ferry Terminal"}})
    assert out2["gateway"]["kind"] == "port"


def test_gateway_mode_enforced_server_side():
    out = sanitize({"gateway": {"kind": "airport", "name": "Capodichino", "code": "NAP"}},
                   travel_mode="ship")
    assert out["gateway"]["kind"] == "port" and out["gateway"]["name"] == ""
