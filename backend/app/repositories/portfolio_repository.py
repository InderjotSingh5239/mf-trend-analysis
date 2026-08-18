"""
Repository layer for Portfolio / Holding / Transaction persistence.
Keeps raw SQLAlchemy query logic isolated from business logic (services).
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.portfolio import Holding, Portfolio, Transaction


class PortfolioRepository:
    def __init__(self, db: Session):
        self.db = db

    # ---------- Portfolio ----------
    def create_portfolio(
        self, user_id: uuid.UUID, name: str, description: str | None, base_currency: str
    ) -> Portfolio:
        portfolio = Portfolio(
            user_id=user_id, name=name, description=description, base_currency=base_currency
        )
        self.db.add(portfolio)
        self.db.commit()
        self.db.refresh(portfolio)
        return portfolio

    def get_portfolio(self, portfolio_id: uuid.UUID) -> Portfolio | None:
        return self.db.get(Portfolio, portfolio_id)

    def list_portfolios(self, user_id: uuid.UUID) -> list[Portfolio]:
        stmt = select(Portfolio).where(Portfolio.user_id == user_id).order_by(Portfolio.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def delete_portfolio(self, portfolio: Portfolio) -> None:
        self.db.delete(portfolio)
        self.db.commit()

    def update_portfolio(self, portfolio: Portfolio, **fields) -> Portfolio:
        for key, value in fields.items():
            if value is not None:
                setattr(portfolio, key, value)
        self.db.commit()
        self.db.refresh(portfolio)
        return portfolio

    # ---------- Holding ----------
    def get_holding(self, portfolio_id: uuid.UUID, fund_id: uuid.UUID) -> Holding | None:
        stmt = select(Holding).where(Holding.portfolio_id == portfolio_id, Holding.fund_id == fund_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_holdings(self, portfolio_id: uuid.UUID) -> list[Holding]:
        stmt = select(Holding).where(Holding.portfolio_id == portfolio_id)
        return list(self.db.execute(stmt).scalars().all())

    def upsert_holding(self, holding: Holding) -> Holding:
        self.db.add(holding)
        self.db.commit()
        self.db.refresh(holding)
        return holding

    def delete_holding(self, holding: Holding) -> None:
        self.db.delete(holding)
        self.db.commit()

    # ---------- Transaction ----------
    def add_transaction(self, transaction: Transaction) -> Transaction:
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def list_transactions(self, portfolio_id: uuid.UUID) -> list[Transaction]:
        stmt = (
            select(Transaction)
            .where(Transaction.portfolio_id == portfolio_id)
            .order_by(Transaction.transaction_date.asc())
        )
        return list(self.db.execute(stmt).scalars().all())
