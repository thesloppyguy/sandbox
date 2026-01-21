"""Example API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.dependencies import get_db
from app.models.example import Example, ExampleCreate, ExampleRead, ExampleUpdate

router = APIRouter()


@router.post("", response_model=ExampleRead, status_code=status.HTTP_201_CREATED)
async def create_example(
    example: ExampleCreate,
    db: Session = Depends(get_db),
) -> Example:
    """Create a new example.

    Args:
        example: Example data to create
        db: Database session

    Returns:
        Example: Created example
    """
    db_example = Example.model_validate(example)
    db.add(db_example)
    db.commit()
    db.refresh(db_example)
    return db_example


@router.get("", response_model=list[ExampleRead])
async def list_examples(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[Example]:
    """List all examples.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List[Example]: List of examples
    """
    statement = select(Example).offset(skip).limit(limit)
    examples = db.exec(statement).all()
    return examples


@router.get("/{example_id}", response_model=ExampleRead)
async def get_example(
    example_id: int,
    db: Session = Depends(get_db),
) -> Example:
    """Get an example by ID.

    Args:
        example_id: Example ID
        db: Database session

    Returns:
        Example: Example data

    Raises:
        HTTPException: If example not found
    """
    example = db.get(Example, example_id)
    if not example:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Example with ID {example_id} not found",
        )
    return example


@router.patch("/{example_id}", response_model=ExampleRead)
async def update_example(
    example_id: int,
    example_update: ExampleUpdate,
    db: Session = Depends(get_db),
) -> Example:
    """Update an example.

    Args:
        example_id: Example ID
        example_update: Updated example data
        db: Database session

    Returns:
        Example: Updated example

    Raises:
        HTTPException: If example not found
    """
    example = db.get(Example, example_id)
    if not example:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Example with ID {example_id} not found",
        )

    update_data = example_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(example, field, value)

    db.add(example)
    db.commit()
    db.refresh(example)
    return example


@router.delete("/{example_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_example(
    example_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Delete an example.

    Args:
        example_id: Example ID
        db: Database session

    Raises:
        HTTPException: If example not found
    """
    example = db.get(Example, example_id)
    if not example:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Example with ID {example_id} not found",
        )
    db.delete(example)
    db.commit()
