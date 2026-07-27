"""Offline tests for the generation pipeline: validation + quantity override + fallback.
No API calls — the gateway is exercised live by scripts/smoke_test_generation.sh."""
import pytest
from api.packing.fallback import template_items
from api.packing.schemas import parse_model_json
from api.packing.service import _apply_quantity_engine

GOOD = '''{"items":[
 {"name":"Hiking boots","category":"footwear","item_class":"other","qty":1,
  "reason":"Daily trail hiking, 8 days","confidence":0.95,"source_signal":"activity","priority":"high"},
 {"name":"Underwear","category":"clothing","item_class":"underwear","qty":12,
  "reason":"8-day trip","confidence":0.9,"source_signal":"duration","priority":"normal"}
],"missing_inputs":[],"task_suggestions":["Check France entry requirements"]}'''


def test_valid_output_parses():
    out = parse_model_json(GOOD)
    assert len(out.items) == 2
    assert out.task_suggestions == ["Check France entry requirements"]


def test_fenced_output_still_parses():
    assert len(parse_model_json("```json\n" + GOOD + "\n```").items) == 2


def test_engine_overrides_model_qty():
    items = [it.model_dump() for it in parse_model_json(GOOD).items]
    div = _apply_quantity_engine(items, duration_days=8, laundry=False, style="standard")
    under = next(i for i in items if i["name"] == "Underwear")
    assert under["qty"] == 8          # engine: min(8+1, cap 8) — model said 12
    assert div == 1                    # divergence logged for evals


@pytest.mark.parametrize("bad", [
    "not json at all",
    '{"items": []}',                                # min_length 1
    '{"items":[{"name":"X","category":"weapons","item_class":"other","qty":1,'
    '"reason":"r","confidence":0.5}]}',              # bad category
])
def test_bad_output_rejected(bad):
    with pytest.raises(Exception):
        parse_model_json(bad)


def test_fallback_covers_hiking():
    names = {i["name"] for i in template_items("hiking")}
    assert {"Hiking boots", "Rain jacket", "Phone charger"} <= names
