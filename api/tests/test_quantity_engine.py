import pytest
from api.packing.quantity_engine import ItemClass, compute_qty


# Table-driven cases straight from Part 2 §3
@pytest.mark.parametrize("cls,days,laundry,style,expected", [
    (ItemClass.UNDERWEAR, 7, False, "standard", 8),    # 7+1
    (ItemClass.UNDERWEAR, 14, True, "standard", 8),    # min(14,8)+1=9 -> cap 8
    (ItemClass.UNDERWEAR, 3, False, "standard", 4),    # 3+1
    (ItemClass.TOPS, 7, False, "standard", 5),         # ceil(7/1.5)
    (ItemClass.TOPS, 14, True, "standard", 5),         # ceil(min(14,7)/1.5)
    (ItemClass.TOPS, 10, False, "light", 5),           # ceil(10/1.5)=7 *0.75=5.25 -> 5
    (ItemClass.TOPS, 10, False, "thorough", 7),        # 7*1.25=8.75 -> 9 -> cap 7
    (ItemClass.BOTTOMS, 7, False, "standard", 2),      # ceil(7/4)
    (ItemClass.BOTTOMS, 30, False, "standard", 4),     # ceil(30/4)=8 -> cap 4
    (ItemClass.SLEEPWEAR, 10, False, "standard", 2),
    (ItemClass.TOILETRY_KIT, 21, False, "thorough", 1),  # style-exempt, cap 1
    # One package, whatever the trip length. Was 5+3=8, which counted doses in
    # a column that counts objects; the day-count now travels in the reason.
    (ItemClass.MEDICATION, 5, False, "light", 1),
    (ItemClass.MEDICATION, 24, False, "thorough", 1),   # length changes nothing
    (ItemClass.CHARGER, 12, False, "standard", 1),
])
def test_quantity_table(cls, days, laundry, style, expected):
    assert compute_qty(cls, days, laundry_available=laundry, packing_style=style).qty == expected


def test_engine_wins_and_flags_divergence():
    r = compute_qty(ItemClass.UNDERWEAR, 7, model_qty=12)
    assert r.qty == 8 and r.diverged is True
    r2 = compute_qty(ItemClass.UNDERWEAR, 7, model_qty=8)
    assert r2.diverged is False


def test_other_passes_model_qty_through_capped():
    assert compute_qty(ItemClass.OTHER, 5, model_qty=3).qty == 3
    assert compute_qty(ItemClass.OTHER, 5, model_qty=99).qty == 14  # schema cap


def test_floor_is_one():
    assert compute_qty(ItemClass.SLEEPWEAR, 1, packing_style="light").qty == 1


def test_rejects_bad_input():
    with pytest.raises(ValueError):
        compute_qty(ItemClass.TOPS, 0)
    with pytest.raises(ValueError):
        compute_qty(ItemClass.TOPS, 5, packing_style="maximal")
