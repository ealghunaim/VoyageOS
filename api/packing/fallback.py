"""Template fallback (Part 2 §1.3): if the model fails twice, the user still gets a list.
Honestly labeled source='template'; never a blank screen."""

_BASE = [
    ("T-shirt", "clothing", "tops"), ("Underwear", "clothing", "underwear"),
    ("Socks", "clothing", "underwear"), ("Casual trousers", "clothing", "bottoms"),
    ("Pajamas", "clothing", "sleepwear"), ("Sneakers", "footwear", "other"),
    ("Toiletry bag", "toiletries", "toiletry_kit"),
    ("Personal prescription medications", "medications", "medication"),
    ("Phone charger", "electronics", "charger"), ("Power bank", "electronics", "other"),
    ("Universal travel adapter", "electronics", "other"),
    ("Passport holder", "documents", "other"), ("Water bottle", "activity_gear", "other"),
]
_EXTRAS = {
    "hiking": [("Hiking boots", "footwear", "other"), ("Rain jacket", "clothing", "other"),
               ("Wool hiking socks", "clothing", "underwear"), ("Hiking pants", "clothing", "bottoms"),
               ("Fleece jacket", "clothing", "other"), ("Day pack", "activity_gear", "other"),
               ("Small first-aid kit", "medications", "other"), ("Sunscreen", "toiletries", "other"),
               ("Headlamp", "activity_gear", "other")],
    "business": [("Dress shirt", "clothing", "tops"), ("Blazer", "clothing", "other"),
                 ("Dress pants", "clothing", "bottoms"), ("Dress shoes", "footwear", "other"),
                 ("Belt", "clothing", "other"), ("Laptop", "electronics", "other"),
                 ("Laptop charger", "electronics", "charger"), ("Business cards", "documents", "other")],
    "beach": [("Swimsuit", "clothing", "other"), ("Sandals", "footwear", "other"),
              ("Sunscreen", "toiletries", "other"), ("Beach towel", "activity_gear", "other"),
              ("Sun hat", "clothing", "other"), ("Flip-flops", "footwear", "other")],
}


def template_items(trip_type: str | None) -> list[dict]:
    rows = list(_BASE) + _EXTRAS.get((trip_type or "").lower(), [])
    label = trip_type or "general"
    return [
        {"name": n, "category": c, "item_class": ic, "qty": 1,
         "reason": f"Standard for {label} trips (offline template)",
         "confidence": 0.5, "source_signal": "destination", "priority": "normal"}
        for n, c, ic in rows
    ]
