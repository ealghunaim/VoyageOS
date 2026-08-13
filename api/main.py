"""VoyageOS API — v1 era begins: the complete v0.5 monolith + the weather engine.
Two background jobs now: the notification governor (60s) and weather (6h)."""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.core.config import settings
from api.trips.router import router as trips_router
from api.packing.router import router as packing_router, items_router as packing_items_router
from api.timeline.router import router as timeline_router
from api.notifications.router import router as notifications_router
from api.history.router import router as history_router
from api.gear.router import router as gear_router
from api.documents.router import router as documents_router
from api.weather.router import router as weather_router
from api.places.router import router as places_router
from api.guide.router import router as guide_router
from api.me.router import router as me_router
from api.notes.router import router as notes_router
from api.planner.router import router as planner_router
from api.tips.router import router as tips_router
from api.packing.quick import router as quick_router
from api.qa.router import router as qa_router
from api.flights.router import router as flights_router
from api.flights.routes import router as flight_routes_router
from api.photos.router import router as photos_router
from api.notifications.worker import run_due
from api.subscriptions.router import router as subscription_router
from api.subscriptions.webhook_router import PATH as WEBHOOK_PATH
from api.subscriptions.webhook_router import router as webhook_router
from api.weather.job import run_weather_tick


@asynccontextmanager
async def lifespan(app: FastAPI):
    sched = BackgroundScheduler(daemon=True)
    sched.add_job(run_due, "interval", seconds=60, id="notification_worker",
                  max_instances=1, coalesce=True)
    sched.add_job(run_weather_tick, "interval", hours=6, id="weather_tick",
                  max_instances=1, coalesce=True,
                  next_run_time=datetime.now() + timedelta(seconds=45))
    sched.start()
    print("[worker] notification worker started (60s tick)")
    print("[weather] snapshot job started (6h tick, first run in 45s)")
    yield
    sched.shutdown(wait=False)


app = FastAPI(title="VoyageOS API", version="0.6.0", lifespan=lifespan)


#: Paths that do not carry x-voyageos-key.
#:
#: The RevenueCat webhook is here because RevenueCat cannot send our header —
#: not because it is public. It verifies an HMAC-SHA256 signature and a static
#: Authorization header of its own, and it is the ONE exempt path that changes
#: state, so that verification is load-bearing in a way the others are not.
#: See api/subscriptions/webhook_auth.py.
OPEN_PATHS = ("/health", "/docs", "/openapi.json", WEBHOOK_PATH)


@app.middleware("http")
async def shared_secret_guard(request: Request, call_next):
    secret = settings.app_shared_secret
    if secret and request.url.path not in OPEN_PATHS:
        if request.headers.get("x-voyageos-key") != secret:
            return JSONResponse({"detail": "unauthorized"}, status_code=401)
    return await call_next(request)


for r in (trips_router, packing_router, packing_items_router, timeline_router,
          notifications_router, history_router, gear_router, documents_router,
          weather_router, subscription_router, webhook_router, places_router, guide_router, me_router, notes_router, tips_router, quick_router, qa_router, flights_router, photos_router, planner_router, flight_routes_router):
    app.include_router(r)


@app.get("/health")
def health():
    return {"ok": True, "version": "0.6.0"}
