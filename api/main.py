"""VoyageOS API — the complete v0.5 monolith: trips, packing, timeline,
notifications, memory, kits, weight, documents. Worker inside; guard optional."""
from contextlib import asynccontextmanager
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
from api.notifications.worker import run_due


@asynccontextmanager
async def lifespan(app: FastAPI):
    sched = BackgroundScheduler(daemon=True)
    sched.add_job(run_due, "interval", seconds=60, id="notification_worker",
                  max_instances=1, coalesce=True)
    sched.start()
    print("[worker] notification worker started (60s tick)")
    yield
    sched.shutdown(wait=False)


app = FastAPI(title="VoyageOS API", version="0.5.0", lifespan=lifespan)


@app.middleware("http")
async def shared_secret_guard(request: Request, call_next):
    """When APP_SHARED_SECRET is set (cloud deploys), every request must carry it.
    Local dev leaves it unset. This guards the dev-auth stand-in until real
    Supabase JWT auth lands in v1.0 — never expose an unguarded dev API."""
    secret = settings.app_shared_secret
    if secret and request.url.path not in ("/health", "/docs", "/openapi.json"):
        if request.headers.get("x-voyageos-key") != secret:
            return JSONResponse({"detail": "unauthorized"}, status_code=401)
    return await call_next(request)


for r in (trips_router, packing_router, packing_items_router, timeline_router,
          notifications_router, history_router, gear_router, documents_router):
    app.include_router(r)


@app.get("/health")
def health():
    return {"ok": True, "version": "0.5.0"}
