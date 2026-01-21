"""Pytest configuration and fixtures."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, SQLModel

from app.core.dependencies import get_db
from app.main import app
from app.config import settings

# Create a test database engine
test_engine = create_engine(
    str(settings.SQLALCHEMY_DATABASE_URI).replace(
        settings.POSTGRES_DB, f"{settings.POSTGRES_DB}_test"
    ),
    connect_args={"check_same_thread": False} if "sqlite" in str(settings.SQLALCHEMY_DATABASE_URI) else {},
)


@pytest.fixture(scope="function")
def db_session() -> Session:
    """Create a test database session.

    Yields:
        Session: Test database session
    """
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> TestClient:
    """Create a test client.

    Args:
        db_session: Test database session

    Yields:
        TestClient: FastAPI test client
    """
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
