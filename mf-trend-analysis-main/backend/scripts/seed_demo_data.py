"""
Seed a demo user, a few mutual funds, a portfolio with transactions, a
watchlist, and an alert so you can explore the API (Swagger UI / Postman)
without manually creating data first.

Usage:
    python scripts/seed_demo_data.py

Requires the database to be migrated (`alembic upgrade head`) and
DATABASE_URL in .env to point at a reachable Postgres instance.
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from loguru import logger  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402
from app.models.alerts import AlertType  # noqa: E402
from app.models.amc import AMC  # noqa: E402
from app.models.mutual_fund import MutualFund  # noqa: E402
from app.models.portfolio import TransactionType  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.models.watchlist import WatchlistItem  # noqa: E402
from app.repositories.watchlist_repository import WatchlistRepository  # noqa: E402
from app.schemas.alerts import AlertCreate  # noqa: E402
from app.schemas.portfolio import TransactionCreate  # noqa: E402
from app.schemas.user import UserCreate  # noqa: E402
from app.services.alert_service import AlertService  # noqa: E402
from app.services.auth_service import AuthError, AuthService  # noqa: E402
from app.services.portfolio_service import PortfolioService  # noqa: E402

DEMO_EMAIL = "demo@mfplatform.example.com"
DEMO_PASSWORD = "DemoPassword123!"


def _get_or_create_demo_user(db) -> User:
    existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if existing:
        logger.info(f"Demo user already exists: {DEMO_EMAIL}")
        return existing

    auth_service = AuthService(db)
    try:
        user = auth_service.register(
            UserCreate(email=DEMO_EMAIL, password=DEMO_PASSWORD, full_name="Demo User")
        )
    except AuthError:
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    user.role = UserRole.USER
    user.is_active = True
    user.is_verified = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _get_or_create_demo_funds(db) -> list[MutualFund]:
    amc = db.query(AMC).filter(AMC.name == "Demo Asset Management").first()
    if amc is None:
        amc = AMC(name="Demo Asset Management", code="DEMOAMC")
        db.add(amc)
        db.commit()
        db.refresh(amc)

    fund_specs = [
        {
            "scheme_code": "DEMO001",
            "scheme_name": "Demo Flexi Cap Fund",
            "category": "flexi cap",
            "risk_category": "moderately high",
            "units": 200,
            "nav": 45.20,
            "current_nav": 52.10,
        },
        {
            "scheme_code": "DEMO002",
            "scheme_name": "Demo Small Cap Fund",
            "category": "small cap",
            "risk_category": "very high",
            "units": 150,
            "nav": 60.00,
            "current_nav": 71.35,
        },
        {
            "scheme_code": "DEMO003",
            "scheme_name": "Demo Corporate Bond Fund",
            "category": "debt",
            "risk_category": "low",
            "units": 500,
            "nav": 22.10,
            "current_nav": 23.05,
        },
    ]

    funds = []
    for spec in fund_specs:
        fund = db.query(MutualFund).filter(MutualFund.scheme_code == spec["scheme_code"]).first()
        if fund is None:
            fund = MutualFund(
                scheme_code=spec["scheme_code"],
                scheme_name=spec["scheme_name"],
                amc_id=amc.id,
                category=spec["category"],
                risk_category=spec["risk_category"],
            )
            db.add(fund)
            db.commit()
            db.refresh(fund)
        fund.__dict__["_demo_units"] = spec["units"]
        fund.__dict__["_demo_nav"] = spec["nav"]
        fund.__dict__["_demo_current_nav"] = spec["current_nav"]
        funds.append(fund)
    return funds


def main() -> None:
    db = SessionLocal()
    try:
        user = _get_or_create_demo_user(db)
        logger.info(f"Seeding demo data for user_id={user.id} ({user.email})")

        funds = _get_or_create_demo_funds(db)

        portfolio_service = PortfolioService(db)
        portfolio = portfolio_service.create_portfolio(
            user.id, "Demo Growth Portfolio", "Seeded by seed_demo_data.py", "INR"
        )

        for fund in funds:
            payload = TransactionCreate(
                fund_id=fund.id,
                fund_name=fund.scheme_name,
                transaction_type=TransactionType.BUY,
                units=fund.__dict__["_demo_units"],
                nav=fund.__dict__["_demo_nav"],
                transaction_date=datetime.now(timezone.utc) - timedelta(days=365),
                category=fund.category,
                sector="Diversified",
            )
            portfolio_service.record_transaction(portfolio.id, payload)
            portfolio_service.update_market_price(portfolio.id, fund.id, fund.__dict__["_demo_current_nav"])
            logger.info(f"  -> bought {fund.__dict__['_demo_units']} units of {fund.scheme_name}")

        watchlist_repo = WatchlistRepository(db)
        watchlist = watchlist_repo.create_watchlist(user.id, "Funds I'm Watching")
        watchlist_repo.add_item(
            WatchlistItem(
                watchlist_id=watchlist.id,
                fund_id=funds[0].id,
                fund_name=funds[0].scheme_name,
                notes="Considering increasing SIP",
            )
        )
        logger.info(f"  -> created watchlist '{watchlist.name}'")

        alert_service = AlertService(db)
        alert_service.create_alert(
            user.id,
            AlertCreate(
                portfolio_id=portfolio.id,
                alert_type=AlertType.PORTFOLIO_DRAWDOWN,
                threshold_value=-15.0,
                is_recurring=True,
            ),
        )
        logger.info("  -> created a -15% drawdown alert on the demo portfolio")

        summary = portfolio_service.get_dashboard_summary(portfolio.id)
        logger.info("Demo portfolio summary:")
        logger.info(f"  total_invested = {summary.total_invested}")
        logger.info(f"  current_value  = {summary.current_value}")
        logger.info(f"  total_pnl      = {summary.total_pnl} ({summary.total_pnl_percent}%)")
        logger.info(f"  diversification_score = {summary.diversification_score}")
        logger.info("")
        logger.info(f"Login with: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        logger.info(f"portfolio_id: {portfolio.id}")
        logger.info(
            "Try: POST /api/v1/auth/login, then "
            f"GET /api/v1/portfolios/{portfolio.id}/summary with the returned Bearer token"
        )

    finally:
        db.close()


if __name__ == "__main__":
    main()
