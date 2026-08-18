"""
Health and readiness check endpoints — used by Docker healthchecks,
load balancers, and monitoring.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db

router = APIRouter()


@router.get("/health", tags=["Monitoring"])
def health() -> dict:
    return {"status": "ok"}


@router.get("/health/db", tags=["Monitoring"])
def health_db(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
