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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
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