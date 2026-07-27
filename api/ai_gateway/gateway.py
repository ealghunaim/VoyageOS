"""AI gateway — the ONE place model calls happen (Part 1 §6.4).

Provider: Anthropic. Routing and prices live in config, never in call sites.
Every call: budget check first, ai_runs log after. Cost observability from day one.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import HTTPException

from api.core.config import settings

TASK_ROUTE = {  # Part 1 §6 routing table
    "extract_items": "small",
    "notification_copy": "small",
    "packing_generate": "mid",
    "guide_generate": "mid",
    "packing_generate_complex": "frontier",
}

# USD per million tokens (input, output). Verified against
# https://platform.claude.com/docs/en/about-claude/pricing on 2026-07-27.
# NOTE: Sonnet 5 is at introductory pricing through Aug 31, 2026; it becomes 3.0/15.0 after.
TIER_PRICES = {
    "small": (1.0, 5.0),      # claude-haiku-4-5
    "mid": (2.0, 10.0),       # claude-sonnet-5 (intro pricing)
    "frontier": (5.0, 25.0),  # claude-opus-5
}


@dataclass
class AiResult:
    text: str
    model: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    latency_ms: int


def _tier(task: str) -> str:
    return TASK_ROUTE.get(task, "small")


def _model_for(tier: str) -> str:
    return {"small": settings.model_small, "mid": settings.model_mid,
            "frontier": settings.model_frontier}[tier]


@lru_cache
def _client():
    if not settings.llm_api_key:
        raise RuntimeError("LLM_API_KEY missing from .env — add it and restart the server.")
    from anthropic import Anthropic
    return Anthropic(api_key=settings.llm_api_key)


def check_budget(db, user_id: str) -> None:
    """Per-user daily cost cap (Part 1 §8 guardrails). Raises 429 when exhausted."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z")
    rows = (
        db.table("ai_runs").select("cost_usd")
        .eq("user_id", user_id).gte("created_at", today).execute()
    ).data
    spent = sum(float(r["cost_usd"] or 0) for r in rows)
    if spent >= settings.ai_daily_cost_cap_usd:
        raise HTTPException(
            429,
            f"Daily AI budget reached (${spent:.2f} of ${settings.ai_daily_cost_cap_usd:.2f}). "
            "Resets at midnight UTC, or raise AI_DAILY_COST_CAP_USD in .env.",
        )


def complete(task: str, system: str, user_content: str, *,
             db=None, user_id: str | None = None, max_tokens: int = 3000) -> AiResult:
    tier = _tier(task)
    model = _model_for(tier)
    in_price, out_price = TIER_PRICES[tier]

    t0 = time.monotonic()
    resp = _client().messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    latency_ms = int((time.monotonic() - t0) * 1000)

    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    tin, tout = resp.usage.input_tokens, resp.usage.output_tokens
    cost = round(tin * in_price / 1e6 + tout * out_price / 1e6, 5)

    if db is not None:
        db.table("ai_runs").insert({
            "user_id": user_id, "task": task, "provider": "anthropic", "model": model,
            "tokens_in": tin, "tokens_out": tout, "cost_usd": cost, "latency_ms": latency_ms,
        }).execute()

    return AiResult(text=text, model=model, tokens_in=tin, tokens_out=tout,
                    cost_usd=cost, latency_ms=latency_ms)
