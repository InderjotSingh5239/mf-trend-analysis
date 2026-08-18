"""
Portfolio business logic:
  - Recording transactions and recalculating aggregated holdings
  - Computing portfolio-level P&L, XIRR, and the full dashboard summary
"""

import uuid
from datetime import datetime, timezone

from scipy.optimize import brentq
from sqlalchemy.orm import Session

from app.models.portfolio import Holding, Portfolio, Transaction, TransactionType
from app.repositories.portfolio_repository import PortfolioRepository
from app.schemas.portfolio import PortfolioSummary, TransactionCreate
from app.services.portfolio_analytics_service import AnalyticsService


class PortfolioService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PortfolioRepository(db)

    # ------------------------------------------------------------------
    def create_portfolio(
        self, user_id: uuid.UUID, name: str, description: str | None, base_currency: str
    ) -> Portfolio:
        return self.repo.create_portfolio(user_id, name, description, base_currency)

    def get_portfolio_or_raise(self, portfolio_id: uuid.UUID) -> Portfolio:
        portfolio = self.repo.get_portfolio(portfolio_id)
        if portfolio is None:
            raise ValueError(f"Portfolio {portfolio_id} not found")
        return portfolio

    # ------------------------------------------------------------------
    def record_transaction(self, portfolio_id: uuid.UUID, payload: TransactionCreate) -> Transaction:
        """
        Persist a transaction and update the corresponding Holding using
        weighted-average NAV accounting.
        """
        portfolio = self.get_portfolio_or_raise(portfolio_id)

        amount = round(payload.units * payload.nav, 4)
        transaction = Transaction(
            portfolio_id=portfolio.id,
            fund_id=payload.fund_id,
            fund_name=payload.fund_name,
            transaction_type=payload.transaction_type,
            units=payload.units,
            nav=payload.nav,
            amount=amount,
            transaction_date=payload.transaction_date,
        )
        transaction = self.repo.add_transaction(transaction)

        self._apply_transaction_to_holding(portfolio_id, payload)
        return transaction

    def _apply_transaction_to_holding(self, portfolio_id: uuid.UUID, payload: TransactionCreate) -> Holding:
        holding = self.repo.get_holding(portfolio_id, payload.fund_id)
        is_buy_side = payload.transaction_type in (
            TransactionType.BUY,
            TransactionType.SIP,
            TransactionType.DIVIDEND_REINVEST,
            TransactionType.SWITCH_IN,
        )

        if holding is None:
            if not is_buy_side:
                raise ValueError("Cannot sell/switch-out units for a fund with no existing holding")
            holding = Holding(
                portfolio_id=portfolio_id,
                fund_id=payload.fund_id,
                fund_name=payload.fund_name,
                sector=payload.sector,
                category=payload.category,
                units=0.0,
                avg_nav=0.0,
                invested_amount=0.0,
                current_nav=payload.nav,
            )

        if is_buy_side:
            new_total_units = holding.units + payload.units
            new_invested = holding.invested_amount + (payload.units * payload.nav)
            holding.avg_nav = round(new_invested / new_total_units, 6) if new_total_units > 0 else 0.0
            holding.units = round(new_total_units, 6)
            holding.invested_amount = round(new_invested, 4)
        else:
            if payload.units > holding.units:
                raise ValueError("Cannot sell more units than currently held")
            # Reduce invested amount proportionally to units sold, at average cost.
            invested_reduction = holding.avg_nav * payload.units
            holding.units = round(holding.units - payload.units, 6)
            holding.invested_amount = round(max(holding.invested_amount - invested_reduction, 0.0), 4)

        holding.current_nav = payload.nav
        return self.repo.upsert_holding(holding)

    def update_market_price(self, portfolio_id: uuid.UUID, fund_id: uuid.UUID, current_nav: float) -> Holding:
        """Mark-to-market a holding with the latest NAV (called by the NAV ETL/scheduler)."""
        holding = self.repo.get_holding(portfolio_id, fund_id)
        if holding is None:
            raise ValueError("Holding not found")
        holding.current_nav = current_nav
        return self.repo.upsert_holding(holding)

    # ------------------------------------------------------------------
    def compute_xirr(self, portfolio_id: uuid.UUID) -> float | None:
        """
        XIRR from all cash flows: each BUY/SIP is a negative cash flow (money out),
        each SELL is a positive cash flow, and the current portfolio value is
        treated as a final positive cash flow today.
        """
        transactions = self.repo.list_transactions(portfolio_id)
        holdings = self.repo.list_holdings(portfolio_id)
        if not transactions:
            return None

        cash_flows: list[tuple[datetime, float]] = []
        for t in transactions:
            sign = (
                -1
                if t.transaction_type in (TransactionType.BUY, TransactionType.SIP, TransactionType.SWITCH_IN)
                else 1
            )
            cash_flows.append((t.transaction_date, sign * t.amount))

        current_value = sum(h.current_value for h in holdings)
        cash_flows.append((datetime.now(timezone.utc), current_value))

        try:
            return self._xirr(cash_flows)
        except (ValueError, RuntimeError):
            return None

    @staticmethod
    def _to_utc(dt: datetime) -> datetime:
        """Normalize a datetime to timezone-aware UTC.

        Some database backends (notably SQLite, used in the test suite) do
        not preserve tzinfo on `DateTime(timezone=True)` columns and return
        naive datetimes; on Postgres in production, the same column reliably
        returns aware datetimes. Cash-flow math must not depend on which DB
        is behind it, so every datetime is normalized here before use.
        """
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @staticmethod
    def _xirr(cash_flows: list[tuple[datetime, float]]) -> float | None:
        if len(cash_flows) < 2:
            return None
        normalized = [(PortfolioService._to_utc(date), amount) for date, amount in cash_flows]
        t0 = min(cf[0] for cf in normalized)

        def npv(rate: float) -> float:
            total = 0.0
            for date, amount in normalized:
                days = (date - t0).days
                total += amount / ((1 + rate) ** (days / 365.0))
            return total

        try:
            rate = brentq(npv, -0.9999, 10.0, maxiter=1000)
            return round(rate * 100, 4)
        except ValueError:
            return None

    # ------------------------------------------------------------------
    def get_dashboard_summary(
        self,
        portfolio_id: uuid.UUID,
        daily_portfolio_returns: list[float] | None = None,
    ) -> PortfolioSummary:
        portfolio = self.get_portfolio_or_raise(portfolio_id)
        holdings = self.repo.list_holdings(portfolio_id)

        total_invested = sum(h.invested_amount for h in holdings)
        current_value = sum(h.current_value for h in holdings)
        total_pnl = current_value - total_invested
        total_pnl_percent = (total_pnl / total_invested * 100) if total_invested > 0 else 0.0

        volatility = AnalyticsService.annualized_volatility(daily_portfolio_returns or [])
        sharpe = AnalyticsService.sharpe_ratio(daily_portfolio_returns or [])

        sorted_holdings = sorted(holdings, key=lambda h: h.current_value, reverse=True)
        top_holdings = sorted_holdings[:5]

        xirr = self.compute_xirr(portfolio_id)

        from app.schemas.portfolio import HoldingRead

        return PortfolioSummary(
            portfolio_id=portfolio.id,
            total_invested=round(total_invested, 2),
            current_value=round(current_value, 2),
            total_pnl=round(total_pnl, 2),
            total_pnl_percent=round(total_pnl_percent, 4),
            xirr=xirr,
            number_of_holdings=len(holdings),
            diversification_score=AnalyticsService.diversification_score(holdings),
            risk_score=AnalyticsService.risk_score(holdings, volatility),
            volatility=volatility,
            sharpe_ratio=sharpe,
            sector_allocation=AnalyticsService.sector_allocation(holdings),
            category_allocation=AnalyticsService.category_allocation(holdings),
            top_holdings=[HoldingRead.model_validate(h) for h in top_holdings],
        )
