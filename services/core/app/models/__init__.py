"""Database models."""

from sqlmodel import SQLModel

# Import all models here for Alembic autogenerate
from app.models.example import Example

__all__ = ["Base", "Example"]


class Base(SQLModel):
    """Base model class for all database models."""

    class Config:
        """Pydantic config."""

        arbitrary_types_allowed = True
