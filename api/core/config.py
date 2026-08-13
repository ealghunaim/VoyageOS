"""Config — model IDs, budgets, and provider keys live HERE, never in code (Part 1 §6)."""
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Put .env into the real process environment, not just into Settings.
#
# Pydantic reads .env to populate this class and stops there, so anything that
# consults os.environ directly sees nothing locally. api/core/crypto.py does
# exactly that — its keys are versioned (MASTER_KEK_V1, _V2, …) and cannot be
# declared as fields — so without this the app starts with no master key on a
# developer machine while working perfectly on Render, where the variables are
# genuinely in the environment. A failure that only appears locally is the kind
# that gets debugged twice.
#
# override=False: a real environment variable always wins over the file.
load_dotenv(override=False)


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
    # --- RevenueCat (1b) ---
    # The webhook path is exempt from shared_secret_guard — RevenueCat cannot
    # send x-voyageos-key — so these two are the ONLY thing standing between a
    # stranger and granting themselves Voyager. Both are verified; see
    # api/subscriptions/webhook_auth.py for why neither alone is enough.
    revenuecat_webhook_secret: str = ""      # HMAC-SHA256 signing secret
    revenuecat_webhook_auth: str = ""        # static Authorization header value

    class Config:
        env_file = ".env"
        # Tolerate env vars this class does not model. MASTER_KEK_V1, _V2 … are
        # read straight from os.environ by api/core/crypto.py, because their
        # names are versioned and a settings class cannot declare a field per
        # future rotation. Without this, adding one to .env fails validation at
        # import and takes down every module that touches settings.
        extra = "ignore"


settings = Settings()
