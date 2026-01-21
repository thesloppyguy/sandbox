"""Logging configuration."""

import logging
import sys
from typing import Any

from app.config import settings


def setup_logging() -> None:
    """Configure application logging."""
    log_level = logging.INFO
    if settings.ENVIRONMENT == "local":
        log_level = logging.DEBUG

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )

    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.WARNING if settings.ENVIRONMENT != "local" else logging.INFO
    )
