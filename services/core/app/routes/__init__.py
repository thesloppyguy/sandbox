"""API routes."""

from app.routes.health import router as health_router
from app.routes.example import router as example_router

from fastapi import APIRouter

api_router = APIRouter()

# Include all route modules
api_router.include_router(health_router, tags=["health"])
api_router.include_router(example_router, prefix="/examples", tags=["examples"])

__all__ = ["api_router"]
