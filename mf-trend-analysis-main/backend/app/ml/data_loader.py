"""
Bridges the repository layer (SQLAlchemy) and the ML feature pipeline
(pandas). Kept separate from app/repositories so the ML package has
no FastAPI/DB coupling beyond this one thin adapter.
"""

import uuid

from sqlalchemy.orm import Session

from app.repositories.fund_repository import FundRepository


def load_nav_series(db: Session, fund_id: uuid.UUID) -> list[tuple]:
    """Returns [(date, nav_value), ...] sorted ascending for a fund."""
    repo = FundRepository(db)
    rows = repo.get_nav_series(fund_id)
    return [(row.nav_date, float(row.nav_value)) for row in rows]
