"""
Loguru logging configuration. Call setup_logging() once at app startup.
"""

import sys
from pathlib import Path

from loguru import logger

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)


def setup_logging() -> None:
    logger.remove()

    logger.add(
        sys.stdout,
        level="INFO",
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True,
    )

    logger.add(
        LOG_DIR / "app.log",
        rotation="10 MB",
        retention="14 days",
        level="INFO",
        enqueue=True,
        backtrace=False,
        diagnose=False,
    )

    logger.add(
        LOG_DIR / "errors.log",
        rotation="10 MB",
        retention="30 days",
        level="ERROR",
        enqueue=True,
        backtrace=True,
        diagnose=True,
    )
