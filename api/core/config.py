"""Config — model IDs, budgets, and provider keys live HERE, never in code (Part 1 §6).
Model defaults verified against https://platform.claude.com/docs/en/about-claude/pricing (2026-07-27)."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "local"
    supabase_url: str = ""
    supabase_service_key: str = ""          # server-side only, never shipped to the app
    dev_user_id: str = ""                    # local dev stand-in for a logged-in user (v0.5)
    llm_api_key: str = ""                    # Anthropic API key
    # --- AI gateway routing (Part 1 §6 routing table) ---
    model_small: str = "claude-haiku-4-5"    # extraction, copywriting ($1/$5 per MTok)
    model_mid: str = "claude-sonnet-5"       # packing generation ($2/$10 intro thru Aug 31 2026)
    model_frontier: str = "claude-opus-5"    # multi-dest / family / specialist ($5/$25)
    ai_daily_cost_cap_usd: float = 0.50      # per user per day (Part 1 §8 guardrails)
    # --- notifications ---
    default_daily_cap: int = 3               # decision register #7

    class Config:
        env_file = ".env"


settings = Settings()
