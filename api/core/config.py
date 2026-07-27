"""Config — model IDs, budgets, and provider keys live HERE, never in code (Part 1 §6)."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "local"
    supabase_url: str = ""
    supabase_service_key: str = ""          # server-side only, never shipped to the app
    dev_user_id: str = ""                    # local dev stand-in for a logged-in user (v0.5)
    llm_api_key: str = ""
    accuweather_api_key: str = ""
    # --- AI gateway routing (Part 1 §6 routing table) ---
    model_small: str = "change-me-small"     # extraction, copywriting
    model_mid: str = "change-me-mid"         # single-dest generation
    model_frontier: str = "change-me-frontier"  # multi-dest / family / specialist
    ai_daily_cost_cap_usd: float = 0.50      # per user per day (Part 1 §8 guardrails)
    # --- notifications ---
    default_daily_cap: int = 3               # decision register #7

    class Config:
        env_file = ".env"


settings = Settings()
