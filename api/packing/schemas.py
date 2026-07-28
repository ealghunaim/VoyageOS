"""Validation layer for generation output (Part 2 §1.3). Pydantic is the schema cop."""
from __future__ import annotations

import json
from typing import Literal
from pydantic import BaseModel, Field

Category = Literal["clothing", "footwear", "toiletries", "medications", "electronics",
                   "documents", "activity_gear", "kids", "comfort", "misc"]
ItemClassName = Literal["underwear", "tops", "bottoms", "sleepwear", "toiletry_kit",
                        "medication", "charger", "other"]


class GenItem(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    category: Category
    item_class: ItemClassName = "other"
    qty: int = Field(ge=1, le=99)
    reason: str = Field(min_length=1, max_length=120)
    confidence: float = Field(ge=0, le=1)
    source_signal: Literal["activity", "duration", "destination", "season", "history", "weather"] = "destination"
    style_tag: Literal["underwear", "casual", "smart_casual", "formal", "traditional", "outerwear", "footwear", "athleisure", "sleep"] | None = None
    priority: Literal["high", "normal", "optional"] = "normal"


class GenOutput(BaseModel):
    items: list[GenItem] = Field(min_length=1, max_length=80)
    missing_inputs: list[str] = []
    task_suggestions: list[str] = []


def parse_model_json(text: str) -> GenOutput:
    """Strip accidental fences, parse, validate. Raises on any deviation."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object found in model output")
    return GenOutput.model_validate(json.loads(cleaned[start:end + 1]))
