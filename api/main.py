"""VoyageOS API — one FastAPI monolith. The notification worker lives inside it
(solo addendum §3.3): APScheduler ticks the governor every 60 seconds."""
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from api.trips.router import router as trips_router
from api.packing.router import router as packing_router, items_router as packing_items_router
from api.timeline.router import router as timeline_router
from api.notifications.router import router as notifications_router
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
app.include_router(trips_router)
app.include_router(packing_router)
app.include_router(packing_items_router)
app.include_router(timeline_router)
app.include_router(notifications_router)


@app.get("/health")
def health():
    return {"ok": True, "version": "0.5.0"}
