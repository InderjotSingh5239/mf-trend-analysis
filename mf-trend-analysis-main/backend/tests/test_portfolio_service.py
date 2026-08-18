import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.portfolio import TransactionType
from app.schemas.portfolio import TransactionCreate
from app.services.portfolio_service import PortfolioService


class TestPortfolioServiceIntegration:
    def test_buy_transaction_creates_holding(self, db_session, sample_user_id):
        service = PortfolioService(db_session)
        portfolio = service.create_portfolio(sample_user_id, "Growth Portfolio", None, "INR")

        fund_id = uuid.uuid4()
        payload = TransactionCreate(
            fund_id=fund_id,
            fund_name="Axis Bluechip Fund",
            transaction_type=TransactionType.BUY,
            units=100,
            nav=50.0,
            transaction_date=datetime.now(timezone.utc) - timedelta(days=365),
            category="large cap",
            sector="Diversified",
        )
        service.record_transaction(portfolio.id, payload)

        holdings = service.repo.list_holdings(portfolio.id)
        assert len(holdings) == 1
        assert holdings[0].units == pytest.approx(100)
        assert holdings[0].invested_amount == pytest.approx(5000.0)

    def test_weighted_average_nav_on_second_buy(self, db_session, sample_user_id):
        service = PortfolioService(db_session)
        portfolio = service.create_portfolio(sample_user_id, "Portfolio 2", None, "INR")
        fund_id = uuid.uuid4()

        service.record_transaction(
            portfolio.id,
            TransactionCreate(
                fund_id=fund_id,
                fund_name="Fund A",
                transaction_type=TransactionType.BUY,
                units=100,
                nav=50.0,
                transaction_date=datetime.now(timezone.utc) - timedelta(days=100),
            ),
        )
        service.record_transaction(
            portfolio.id,
            TransactionCreate(
                fund_id=fund_id,
                fund_name="Fund A",
                transaction_type=TransactionType.BUY,
                units=100,
                nav=60.0,
                transaction_date=datetime.now(timezone.utc) - timedelta(days=10),
            ),
        )

        holding = service.repo.get_holding(portfolio.id, fund_id)
        assert holding.units == pytest.approx(200)
        assert holding.avg_nav == pytest.approx(55.0)
        assert holding.invested_amount == pytest.approx(11000.0)

    def test_sell_more_than_held_raises(self, db_session, sample_user_id):
        service = PortfolioService(db_session)
        portfolio = service.create_portfolio(sample_user_id, "Portfolio 3", None, "INR")
        fund_id = uuid.uuid4()

        service.record_transaction(
            portfolio.id,
            TransactionCreate(
                fund_id=fund_id,
                fund_name="Fund B",
                transaction_type=TransactionType.BUY,
                units=50,
                nav=100.0,
                transaction_date=datetime.now(timezone.utc) - timedelta(days=30),
            ),
        )
        with pytest.raises(ValueError):
            service.record_transaction(
                portfolio.id,
                TransactionCreate(
                    fund_id=fund_id,
                    fund_name="Fund B",
                    transaction_type=TransactionType.SELL,
                    units=100,
                    nav=110.0,
                    transaction_date=datetime.now(timezone.utc),
                ),
            )

    def test_dashboard_summary_computes_pnl(self, db_session, sample_user_id):
        service = PortfolioService(db_session)
        portfolio = service.create_portfolio(sample_user_id, "Portfolio 4", None, "INR")
        fund_id = uuid.uuid4()

        service.record_transaction(
            portfolio.id,
            TransactionCreate(
                fund_id=fund_id,
                fund_name="Fund C",
                transaction_type=TransactionType.BUY,
                units=100,
                nav=50.0,
                transaction_date=datetime.now(timezone.utc) - timedelta(days=365),
                category="mid cap",
                sector="Technology",
            ),
        )
        service.update_market_price(portfolio.id, fund_id, current_nav=65.0)

        summary = service.get_dashboard_summary(portfolio.id)
        assert summary.total_invested == pytest.approx(5000.0)
        assert summary.current_value == pytest.approx(6500.0)
        assert summary.total_pnl == pytest.approx(1500.0)
        assert summary.total_pnl_percent == pytest.approx(30.0)
        assert summary.number_of_holdings == 1
        assert "Technology" in summary.sector_allocation
