"""VoyageOS API — one FastAPI monolith (solo addendum §3). Folders mirror Part 1 §6 services."""
from fastapi import FastAPI
from api.trips.router import router as trips_router
from api.packing.router import router as packing_router, items_router as packing_items_router

app = FastAPI(title="VoyageOS API", version="0.5.0")
app.include_router(trips_router)
app.include_router(packing_router)
app.include_router(packing_items_router)


@app.get("/health")
def health():
    return {"ok": True, "version": "0.5.0"}
