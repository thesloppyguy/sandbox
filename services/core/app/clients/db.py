"""Database client and session management."""

from collections.abc import Generator

from sqlalchemy.engine import Engine
from sqlmodel import Session, create_engine

from app.config import settings

# Create engine with connection pooling
engine: Engine = create_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    # Connection pool settings
    pool_pre_ping=True,  # Verify connections before using
    pool_size=5,  # Number of connections to maintain
    max_overflow=10,  # Max connections beyond pool_size
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=False,  # Set to True for SQL query logging
)


def get_session() -> Generator[Session, None, None]:
    """Get a database session.

    Yields:
        Session: SQLModel database session
    """
    with Session(engine) as session:
        yield session
