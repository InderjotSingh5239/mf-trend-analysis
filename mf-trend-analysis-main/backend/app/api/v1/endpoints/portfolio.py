import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.database.session import get_db
from app.models.portfolio import Portfolio
from app.repositories.portfolio_repository import PortfolioRepository
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioRead,
    PortfolioSummary,
    PortfolioUpdate,
    TransactionCreate,
    TransactionRead,
)
from app.services.portfolio_service import PortfolioService

router = APIRouter(prefix="/portfolios", tags=["Portfolio"])


def _get_owned_portfolio(repo: PortfolioRepository, portfolio_id: uuid.UUID, user_id: uuid.UUID) -> Portfolio:
    """Fetch a portfolio and enforce that it belongs to the requesting user."""
    portfolio = repo.get_portfolio(portfolio_id)
    if portfolio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
    if portfolio.user_id != user_id:
        # 404 (not 403) to avoid leaking that the resource exists for another user.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
    return portfolio


@router.post("", response_model=PortfolioRead, status_code=status.HTTP_201_CREATED)
def create_portfolio(
    payload: PortfolioCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = PortfolioService(db)
    portfolio = service.create_portfolio(user_id, payload.name, payload.description, payload.base_currency)
    logger.info(f"Portfolio created: {portfolio.id} for user {user_id}")
    return portfolio


@router.get("", response_model=list[PortfolioRead])
def list_portfolios(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = PortfolioRepository(db)
    return repo.list_portfolios(user_id)


@router.get("/{portfolio_id}", response_model=PortfolioRead)
def get_portfolio(
    portfolio_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = PortfolioRepository(db)
    return _get_owned_portfolio(repo, portfolio_id, user_id)


@router.patch("/{portfolio_id}", response_model=PortfolioRead)
def update_portfolio(
    portfolio_id: uuid.UUID,
    payload: PortfolioUpdate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = PortfolioRepository(db)
    portfolio = _get_owned_portfolio(repo, portfolio_id, user_id)
    return repo.update_portfolio(portfolio, **payload.model_dump(exclude_unset=True))


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_portfolio(
    portfolio_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = PortfolioRepository(db)
    portfolio = _get_owned_portfolio(repo, portfolio_id, user_id)
    repo.delete_portfolio(portfolio)
    return None


@router.post(
    "/{portfolio_id}/transactions", response_model=TransactionRead, status_code=status.HTTP_201_CREATED
)
def add_transaction(
    portfolio_id: uuid.UUID,
    payload: TransactionCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = PortfolioRepository(db)
    _get_owned_portfolio(repo, portfolio_id, user_id)
    service = PortfolioService(db)
    try:
        return service.record_transaction(portfolio_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{portfolio_id}/transactions", response_model=list[TransactionRead])
def list_transactions(
    portfolio_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = PortfolioRepository(db)
    _get_owned_portfolio(repo, portfolio_id, user_id)
    return repo.list_transactions(portfolio_id)


@router.get("/{portfolio_id}/summary", response_model=PortfolioSummary)
def get_portfolio_summary(
    portfolio_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = PortfolioRepository(db)
    _get_owned_portfolio(repo, portfolio_id, user_id)
    service = PortfolioService(db)
    try:
        return service.get_dashboard_summary(portfolio_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
