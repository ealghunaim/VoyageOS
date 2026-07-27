"""AI gateway — the ONE place model calls happen (Part 1 §6.4).

v0.5: interface + logging contract. Wire a provider SDK behind `_call`.
Every call writes ai_runs (tokens, cost, latency) — observability is not a later feature.
"""
from __future__ import annotations
from dataclasses import dataclass
from api.core.config import settings

TASK_ROUTE = {  # Part 1 §6 routing table
    "extract_items": "small",
    "notification_copy": "small",
    "packing_generate": "mid",
    "packing_generate_complex": "frontier",
}


@dataclass
class AiResult:
    text: str
    model: str
    tokens_in: int = 0
    tokens_out: int = 0
    cost_usd: float = 0.0


def route(task: str) -> str:
    tier = TASK_ROUTE.get(task, "small")
    return {"small": settings.model_small, "mid": settings.model_mid,
            "frontier": settings.model_frontier}[tier]


async def complete(task: str, system: str, payload: dict) -> AiResult:
    model = route(task)
    # TODO(v0.5 wk3): provider SDK call + JSON-schema validation + one-retry-then-
    # template-fallback (Part 2 §1.3) + ai_runs insert + cost-cap check.
    raise NotImplementedError(f"wire provider for task={task} model={model}")
