"""
UPSC Clipper Backend — Application Entry Point
FastAPI app with CORS, lifespan, and router includes.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import init_db
from models import HealthResponse
from routers.clipper import router as clipper_router

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-20s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("upsc_clipper")


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("Starting UPSC Clipper Backend v1.0.0")
    init_db()
    yield
    logger.info("Shutting down UPSC Clipper Backend")


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="UPSC Clipper API",
    description="Backend service for the UPSC Clipper Chrome Extension",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Chrome extension to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",  # Chrome extension origin
        "http://localhost:*",
        "http://127.0.0.1:*",
    ],
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(clipper_router)


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check():
    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
    )


# ── Run directly ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
