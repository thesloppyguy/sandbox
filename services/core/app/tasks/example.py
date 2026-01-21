"""Example background tasks."""

import logging

logger = logging.getLogger(__name__)


async def example_task(data: dict) -> None:
    """Example background task.

    Args:
        data: Task data
    """
    logger.info(f"Processing example task with data: {data}")
    # Add your task logic here
    pass
