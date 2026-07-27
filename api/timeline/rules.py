"""Default timeline rule set — Part 3 §2, as data. Versioned; edit deliberately."""
RULESET_VERSION = 1

DEFAULT_RULES = [
    # (key, class, days_before_departure, local_time, condition, title)
    ("doc_check",   "document", 30, "10:00", "international", "Check document expiry dates"),
    ("laundry",     "task",      3, "18:00", None,            "Laundry — get trip clothes ready"),
    ("power_prep",  "task",      2, "18:00", "has_electronics", "Charge power bank · download offline content"),
    ("charge_weigh","task",      1, "18:00", None,            "Charge devices · weigh your bag"),
    ("morning_of",  "departure", 0, "wake",  None,            "In-use items: charger · meds · sunglasses"),
]

RED_EYE_CUTOFF = "08:00"  # departures earlier than this shift morning_of to prior 20:00
