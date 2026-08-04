"""Config — model IDs, budgets, and provider keys live HERE, never in code (Part 1 §6)."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "local"
    supabase_url: str = ""
    supabase_service_key: str = ""          # server-side only, never shipped to the app
    dev_user_id: str = ""                    # local dev stand-in for a logged-in user (v0.5)
    llm_api_key: str = ""                    # Anthropic API key
    accuweather_api_key: str = ""            # weather provider
    aerodatabox_api_key: str = ""            # RapidAPI key, flight lookup
    pexels_api_key: str = ""                 # Pexels, dish photos
    # --- AI gateway routing (Part 1 §6 routing table) ---
    model_small: str = "claude-haiku-4-5"    # extraction, copywriting, parse, Q&A
    model_mid: str = "claude-sonnet-5"       # guide & packing generation
    model_frontier: str = "claude-opus-5"    # multi-dest / family / specialist
    ai_daily_cost_cap_usd: float = 0.50      # per user per day (Part 1 §8); env overrides
    # --- notifications ---
    default_daily_cap: int = 3               # decision register #7
    app_shared_secret: str = ""              # set on cloud deploys; guard middleware reads this

    class Config:
        env_file = ".env"
        # Tolerate env vars this class does not model. MASTER_KEK_V1, _V2 … are
        # read straight from os.environ by api/core/crypto.py, because their
        # names are versioned and a settings class cannot declare a field per
        # future rotation. Without this, adding one to .env fails validation at
        # import and takes down every module that touches settings.
        extra = "ignore"


settings = Settings()
