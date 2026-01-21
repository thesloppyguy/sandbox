"""FastAPI dependencies."""

from collections.abc import Generator

from fastapi import Depends
from sqlmodel import Session

from app.clients.db import get_session


def get_db() -> Generator[Session, None, None]:
    """Get database session dependency.

    Yields:
        Session: Database session
    """
    yield from get_session()
