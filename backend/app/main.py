import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.app.config import settings
from backend.app.core.limiter import limiter
from backend.app.core.keep_alive import start_keep_alive
from backend.app.init_db import init_db
from backend.app.api.v1.reports import router as reports_router
from backend.app.api.v1.orders import router as orders_router
from backend.app.api.v1.payments import router as payments_router
from backend.app.api.v1.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize storage directories
    settings.uploads_path
    settings.screenshots_path
    settings.receipts_path
    settings.batches_path
    # Initialize database & seed admin
    await init_db()

    # Launch ultra-lightweight keep-alive runner if running on Render or custom URL configured
    keep_alive_target = settings.KEEP_ALIVE_URL or settings.RENDER_EXTERNAL_URL
    keep_alive_task = None
    if keep_alive_target:
        keep_alive_task = asyncio.create_task(
            start_keep_alive(keep_alive_target, settings.KEEP_ALIVE_INTERVAL_SECONDS)
        )

    try:
        yield
    finally:
        if keep_alive_task:
            keep_alive_task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production backend for College Project Report Printing Management",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
allowed_origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(reports_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }
