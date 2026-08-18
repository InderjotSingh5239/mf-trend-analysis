"""
News intelligence endpoints: browse recent sentiment-scored
financial news and trigger a NewsAPI sync (admin).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database.session import get_db
from app.etl.news_etl import NewsAPINotConfiguredError
from app.repositories.news_repository import NewsRepository
from app.schemas.news import NewsRead, NewsSyncResponse
from app.services.news_service import NewsService

router = APIRouter()


@router.get("", response_model=list[NewsRead], tags=["News"])
def list_news(
    limit: int = Query(default=50, ge=1, le=200),
    category: str | None = Query(default=None),
    sentiment: str | None = Query(default=None, description="positive | neutral | negative"),
    db: Session = Depends(get_db),
) -> list[NewsRead]:
    repo = NewsRepository(db)
    if sentiment:
        return repo.list_by_sentiment(sentiment, limit=limit)  # type: ignore[return-value]
    return repo.list_recent(limit=limit, category=category)  # type: ignore[return-value]


@router.post(
    "/sync",
    response_model=NewsSyncResponse,
    tags=["News", "Admin"],
    dependencies=[Depends(require_admin)],
)
def trigger_news_sync(db: Session = Depends(get_db)) -> NewsSyncResponse:
    try:
        result = NewsService(db).sync_news()
    except NewsAPINotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return NewsSyncResponse(**result)
