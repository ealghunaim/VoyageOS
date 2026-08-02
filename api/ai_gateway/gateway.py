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
    "guide_a": "small",   # Know + Eat — fast first paint; bump to "mid" for more nuance
    "guide_b": "mid",     # Play + Visit + Go — richer content stays on Sonnet
    "items_parse": "small",
    "trip_qa": "small",
    "family_play": "mid",
    "phrases": "small",
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
    #: Why the model stopped. "end_turn" is a complete answer; "max_tokens"
    #: means the text is cut off mid-sentence and any JSON in it is invalid.
    #: Callers must branch on this — a truncated response is a length problem,
    #: not a formatting one, and retrying it unchanged fails the same way.
    stop_reason: str = ""

    @property
    def truncated(self) -> bool:
        return self.stop_reason == "max_tokens"


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
    # Prompt caching: long, static system prompts (guide/packing) are marked
    # cacheable — repeat reads bill at ~10% and return faster. Short prompts
    # skip the flag (below the API's cacheable minimum).
    system_payload = (
        [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
        if len(system) >= 4000 else system
    )
    resp = None
    for attempt in range(2):
        try:
            resp = _client().messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system_payload,
                messages=[{"role": "user", "content": user_content}],
            )
            break
        except HTTPException:
            raise
        except Exception as e:
            if attempt == 0:
                print(f"[ai] {task} transient {type(e).__name__} — retrying once")
                time.sleep(1.0)
                continue
            print(f"[ai] {task} model call failed: {type(e).__name__}: {e}")
            raise HTTPException(502, "The AI service is busy right now — tap retry in a moment.")
    latency_ms = int((time.monotonic() - t0) * 1000)

    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    stop = getattr(resp, "stop_reason", "") or ""
    tin, tout = resp.usage.input_tokens, resp.usage.output_tokens
    if stop == "max_tokens":
        # Loud on purpose. This failure previously surfaced as a JSON parse
        # error at the call site, which reads as the model's mistake rather
        # than our ceiling being too low, and it hid a 50% failure rate in
        # packing_generate for weeks.
        print(f"[ai] {task} TRUNCATED at max_tokens={max_tokens} "
              f"({tout} out) — raise the ceiling for this task")
    cread = getattr(resp.usage, "cache_read_input_tokens", 0) or 0
    cwrite = getattr(resp.usage, "cache_creation_input_tokens", 0) or 0
    if cread or cwrite:
        print(f"[ai] cache {task}: read {cread} · wrote {cwrite}")
    cost = round(tin * in_price / 1e6 + tout * out_price / 1e6, 5)

    if db is not None:
        # Observability must never take the feature down with it. The model
        # call already succeeded and the user is owed its result; if this
        # insert fails — a column not yet migrated, a transient network blip —
        # log loudly and carry on rather than turning a good answer into a 500.
        try:
            db.table("ai_runs").insert({
                "user_id": user_id, "task": task, "provider": "anthropic", "model": model,
                "tokens_in": tin, "tokens_out": tout, "cost_usd": cost,
                "latency_ms": latency_ms, "stop_reason": stop,
            }).execute()
        except Exception as e:  # noqa: BLE001 — logging must not break the request
            print(f"[ai] ai_runs log failed ({type(e).__name__}: {str(e)[:160]}) — "
                  f"{task} cost ${cost} went unrecorded")

    return AiResult(text=text, model=model, tokens_in=tin, tokens_out=tout,
                    cost_usd=cost, latency_ms=latency_ms, stop_reason=stop)
