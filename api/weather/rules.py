"""Weather rules engine — pure, deterministic, versioned (Part 1 §12).
No model in the decision path; a model may only ever rephrase these outputs."""
from __future__ import annotations

RULESET = "wx-v1"

# thresholds — the product spec, as data
RAIN_PROB = 60          # %
HEAT_TMAX = 32          # °C
UV_HIGH = 8
COLD_TMIN = 5           # °C
WIND_KPH = 40


def _fmt_day(d: str) -> str:
    return d[5:]  # YYYY-MM-DD → MM-DD, compact for reasons


def evaluate(days: list[dict], place: str) -> list[dict]:
    """days: provider rows → insights. Each insight: key, reason, items[] with
    dedupe terms (so 'Sunscreen' never duplicates an existing 'Sunscreen SPF 50')."""
    if not days:
        return []
    insights: list[dict] = []

    rain_days = [d for d in days if (d.get("precip_prob") or 0) >= RAIN_PROB]
    if rain_days:
        worst = max(rain_days, key=lambda d: d["precip_prob"])
        insights.append({
            "key": "rain_kit", "severity": "normal",
            "reason": f"Rain {int(worst['precip_prob'])}% {_fmt_day(worst['date'])} in {place}",
            "items": [
                {"name": "Packable rain jacket", "category": "clothing", "item_class": "other",
                 "qty": 1, "dedupe": ["rain jacket", "raincoat", "rain shell"]},
                {"name": "Compact umbrella", "category": "misc", "item_class": "other",
                 "qty": 1, "dedupe": ["umbrella"]},
            ],
        })

    hot = [d for d in days if (d.get("temp_max") or -99) >= HEAT_TMAX or (d.get("uv") or 0) >= UV_HIGH]
    if hot:
        worst = max(hot, key=lambda d: d.get("temp_max") or 0)
        insights.append({
            "key": "sun_kit", "severity": "normal",
            "reason": f"Highs {round(worst['temp_max'])}°C in {place}",
            "items": [
                {"name": "Sunscreen", "category": "toiletries", "item_class": "other",
                 "qty": 1, "dedupe": ["sunscreen", "spf"]},
                {"name": "Sun hat", "category": "clothing", "item_class": "other",
                 "qty": 1, "dedupe": ["hat", "cap"]},
                {"name": "Water bottle", "category": "activity_gear", "item_class": "other",
                 "qty": 1, "dedupe": ["water bottle", "hydration"]},
            ],
        })

    cold = [d for d in days if (d.get("temp_min") or 99) <= COLD_TMIN]
    if cold:
        worst = min(cold, key=lambda d: d["temp_min"])
        insights.append({
            "key": "cold_layer", "severity": "normal",
            "reason": f"Lows {round(worst['temp_min'])}°C in {place}",
            "items": [
                {"name": "Thermal base layer", "category": "clothing", "item_class": "tops",
                 "qty": 1, "dedupe": ["thermal", "base layer"]},
                {"name": "Fleece jacket", "category": "clothing", "item_class": "other",
                 "qty": 1, "dedupe": ["fleece"]},
                {"name": "Warm hat", "category": "clothing", "item_class": "other",
                 "qty": 1, "dedupe": ["beanie", "warm hat"]},
            ],
        })

    windy = [d for d in days if (d.get("wind_kph") or 0) >= WIND_KPH]
    if windy:
        worst = max(windy, key=lambda d: d["wind_kph"])
        insights.append({
            "key": "wind_layer", "severity": "normal",
            "reason": f"Wind to {round(worst['wind_kph'])} kph in {place}",
            "items": [
                {"name": "Windbreaker", "category": "clothing", "item_class": "other",
                 "qty": 1, "dedupe": ["windbreaker", "wind jacket", "rain jacket"]},
            ],
        })

    return insights
