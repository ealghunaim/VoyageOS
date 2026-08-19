"""Quantity engine — Master Design Doc Part 2 §3.

Law 2: the model proposes quantities; THIS module's number wins.
Pure functions, no I/O, exhaustively tested.

Semantics (documented + asserted by tests):
  1. laundry shortens effective days per class rule (cycle default 7)
  2. base = class rule over effective days (ceil for fractional rates)
  3. packing_style multiplier applies BEFORE caps (light .75 / standard 1 / thorough 1.25),
     rounded half-up, floor 1 — except meds & toiletry kit, which are exempt
  4. hard cap applies last
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum

LAUNDRY_CYCLE_DAYS = 7

STYLE_MULTIPLIER = {"light": 0.75, "standard": 1.0, "thorough": 1.25}


class ItemClass(str, Enum):
    UNDERWEAR = "underwear"        # incl. socks
    TOPS = "tops"                  # t-shirts / shirts
    BOTTOMS = "bottoms"            # trousers / shorts
    SLEEPWEAR = "sleepwear"
    TOILETRY_KIT = "toiletry_kit"
    MEDICATION = "medication"      # qty in doses
    CHARGER = "charger"            # per device class
    OTHER = "other"                # engine passes model qty through, capped


HARD_CAP = {
    ItemClass.UNDERWEAR: 8,
    ItemClass.TOPS: 7,
    ItemClass.BOTTOMS: 4,
    ItemClass.SLEEPWEAR: 2,
    ItemClass.TOILETRY_KIT: 1,
    ItemClass.CHARGER: 2,
    ItemClass.OTHER: 14,           # schema max (Part 2 §4)
}

STYLE_EXEMPT = {ItemClass.MEDICATION, ItemClass.TOILETRY_KIT}


def _round_half_up(x: float) -> int:
    return int(math.floor(x + 0.5))


def _effective_days(item_class: ItemClass, days: int, laundry: bool) -> int:
    if not laundry:
        return days
    if item_class == ItemClass.UNDERWEAR:
        return min(days, LAUNDRY_CYCLE_DAYS + 1)
    if item_class == ItemClass.TOPS:
        return min(days, LAUNDRY_CYCLE_DAYS)
    return days  # laundry does not affect bottoms/sleepwear/etc. per spec


def _base_qty(item_class: ItemClass, days_eff: int, model_qty: int | None) -> int | None:
    match item_class:
        case ItemClass.UNDERWEAR:
            return days_eff + 1                      # 1/day + 1 spare
        case ItemClass.TOPS:
            return math.ceil(days_eff / 1.5)         # 1 per 1.5 days
        case ItemClass.BOTTOMS:
            return math.ceil(days_eff / 4)           # 1 per 4 days
        case ItemClass.SLEEPWEAR:
            return math.ceil(days_eff / 7)           # 1 per 7 days
        case ItemClass.TOILETRY_KIT:
            return 1
        case ItemClass.MEDICATION:
            # DETERMINISTIC, AND THE CODE OVERRIDES THE MODEL HERE.
            #
            # model_qty is not consulted for this class at all: the dose count
            # follows the trip, so whatever the model proposed is discarded.
            # That makes the result a pure function of trip length — a 24-day
            # trip is always 27 — which is why it can exceed a column ceiling
            # without anyone having typed a large number anywhere.
            return days_eff + 3                      # doses: days + 3 buffer
        case ItemClass.CHARGER:
            return 1                                 # per device class
        case ItemClass.OTHER:
            return model_qty                         # engine has no opinion
    return model_qty


@dataclass(frozen=True)
class QtyResult:
    qty: int
    diverged: bool  # model proposed something else — log for evals (Part 2 §10)


def compute_qty(
    item_class: ItemClass,
    days: int,
    *,
    laundry_available: bool = False,
    packing_style: str = "standard",
    model_qty: int | None = None,
) -> QtyResult:
    """Return the authoritative quantity for one item."""
    if days < 1:
        raise ValueError("trip must be at least 1 day")
    if packing_style not in STYLE_MULTIPLIER:
        raise ValueError(f"unknown packing_style {packing_style!r}")

    days_eff = _effective_days(item_class, days, laundry_available)
    base = _base_qty(item_class, days_eff, model_qty)

    if base is None:  # OTHER with no model proposal
        base = 1

    if item_class not in STYLE_EXEMPT and item_class != ItemClass.OTHER:
        base = max(1, _round_half_up(base * STYLE_MULTIPLIER[packing_style]))

    cap = HARD_CAP.get(item_class)
    qty = min(base, cap) if cap else base
    qty = max(1, qty)

    return QtyResult(qty=qty, diverged=(model_qty is not None and model_qty != qty))
