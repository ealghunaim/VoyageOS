from api.packing.quick import clamp_items


def test_clamp_normalizes_and_caps():
    raw = [{"name": " polo shirt ", "category": "clothing", "qty": "3", "style_tag": "casual"},
           {"name": "Power Bank", "category": "gadgets", "qty": 200, "style_tag": "laser"},
           {"junk": True}, {"name": ""}] + [{"name": f"x{i}", "category": "misc"} for i in range(10)]
    out = clamp_items(raw)
    assert out[0] == {"name": "polo shirt", "category": "clothing", "qty": 3, "style_tag": "casual"}
    assert out[1]["category"] == "misc" and out[1]["style_tag"] is None and out[1]["qty"] == 99
    assert len(out) == 6  # cap applies to raw input first


def test_garbage_in_empty_out():
    assert clamp_items("nonsense") == []
