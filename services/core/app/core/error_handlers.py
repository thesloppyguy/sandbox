"""Error handlers for FastAPI."""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import CoreException, NotFoundError, ValidationError


async def core_exception_handler(request: Request, exc: CoreException) -> JSONResponse:
    """Handle core exceptions.

    Args:
        request: FastAPI request
        exc: Exception instance

    Returns:
        JSONResponse: Error response
    """
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if isinstance(exc, NotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, ValidationError):
        status_code = status.HTTP_400_BAD_REQUEST

    return JSONResponse(
        status_code=status_code,
        content={"detail": str(exc), "type": exc.__class__.__name__},
    )


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Handle database integrity errors.

    Args:
        request: FastAPI request
        exc: IntegrityError instance

    Returns:
        JSONResponse: Error response
    """
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Database integrity error", "type": "IntegrityError"},
    )
