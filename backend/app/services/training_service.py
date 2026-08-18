"""
Training service layer — orchestrates the ML training pipeline.
Kept as a thin wrapper (mirrors ETLService) so API endpoints and
Celery tasks share one entrypoint.
"""

import uuid

from sqlalchemy.orm import Session

from app.ml.training.trainer import train_fund_models
from app.repositories.fund_repository import FundRepository


class FundNotFoundError(Exception):
    pass


class TrainingService:
    def __init__(self, db: Session):
        self.db = db

    def train_fund(self, fund_id: uuid.UUID) -> dict:
        repo = FundRepository(self.db)
        fund = repo.get_by_id(fund_id)
        if fund is None:
            raise FundNotFoundError(f"Fund {fund_id} not found")

        return train_fund_models(self.db, fund)
