from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router
from app.queues.router import router as queues_router
from app.services.router import router as services_router
from app.notifications.router import router as notifications_router
from app.organizations.router import router as organizations_router

app = FastAPI(
    title="QueueLess API",
    description="Predictive queue management platform",
    version="0.1.0",
)

# settings.frontend_url can be a single URL or a comma-separated list of URLs
# (e.g. "http://localhost:5174,https://your-production-frontend.com").
# This lets local dev and production both work without hardcoding origins here.
allowed_origins = [
    origin.strip()
    for origin in settings.frontend_url.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(queues_router)
app.include_router(services_router)
app.include_router(notifications_router)
app.include_router(organizations_router)

# Phase 2+ routers will be included here as they're built:
# app.include_router(analytics_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "QueueLess API"}