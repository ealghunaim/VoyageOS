"""Distance between two points on the earth.

Small enough to be tempting to inline, and it was inlined twice — once in the
weather provider to refuse a country match on the wrong continent, once here
to refuse a landmark photo from the wrong city. Both are the same guard
against a same-named place somewhere else, so they should not be able to drift
apart.
"""
from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371


def km_between(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    dlat, dlng = radians(b_lat - a_lat), radians(b_lng - a_lng)
    h = sin(dlat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlng / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(h))
