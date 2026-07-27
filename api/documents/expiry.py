"""Expiry evaluation (F4.2-lite) — pure date math, law-5 wording (unsourced variant)."""
from __future__ import annotations
from datetime import date


def evaluate(expiry: date, today: date) -> dict:
    days = (expiry - today).days
    if days < 0:
        level, msg = "expired", "This document has expired."
    elif days < 183:
        level = "critical"
        msg = (f"Expires {expiry.isoformat()}. Some countries want 6+ months' validity — "
               "check the official rule before you travel.")
    elif days < 365:
        level, msg = "soon", f"Expires {expiry.isoformat()} — renew before your next big trip."
    else:
        level, msg = "ok", f"Valid until {expiry.isoformat()}."
    return {"level": level, "message": msg, "days_left": days}
