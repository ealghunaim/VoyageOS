"""VoyageOS API — one FastAPI monolith (solo addendum §3). Folders mirror Part 1 §6 services."""
from fastapi import FastAPI

app = FastAPI(title="VoyageOS API", version="0.5.0")


@app.get("/health")
def health():
    return {"ok": True, "version": "0.5.0"}

# Routers land in v0.5 weeks 3-5 (see README build order):
# app.include_router(trips.router)      # /v1/trips CRUD
# app.include_router(packing.router)    # /v1/trips/{id}/packing-lists:generate
# app.include_router(timeline.router)   # /v1/trips/{id}/timeline
