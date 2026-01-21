"""Example model for demonstration."""

from datetime import UTC, datetime
from typing import Optional

from sqlmodel import Column, DateTime, Field, SQLModel, func


class ExampleBase(SQLModel):
    """Base schema for Example model."""

    name: str = Field(max_length=255, description="Name of the example")
    description: Optional[str] = Field(default=None, description="Description of the example")


class Example(ExampleBase, table=True):
    """Example database model."""

    __tablename__ = "examples"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_column=Column(DateTime(timezone=True), onupdate=func.now()),
    )


class ExampleCreate(ExampleBase):
    """Schema for creating an example."""


class ExampleRead(ExampleBase):
    """Schema for reading an example."""

    id: int
    created_at: datetime
    updated_at: datetime


class ExampleUpdate(SQLModel):
    """Schema for updating an example."""

    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
