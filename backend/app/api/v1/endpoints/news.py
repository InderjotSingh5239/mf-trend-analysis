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
from app.schemas.news import NewsListResponse, NewsRead, NewsSyncResponse
from app.services.news_service import NewsService

router = APIRouter()


@router.get("", response_model=NewsListResponse, tags=["News"])
def list_news(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None),
    sentiment: str | None = Query(
        default=None,
        description="positive | neutral | negative",
    ),
    db: Session = Depends(get_db),
) -> NewsListResponse:
    items, total = NewsRepository(db).list_recent(
        page=page,
        page_size=page_size,
        category=category,
        sentiment=sentiment,
    )

    return NewsListResponse(
        items=[NewsRead.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/sync",
    response_model=NewsSyncResponse,
    tags=["News", "Admin"],
    dependencies=[Depends(require_admin)],
)
def trigger_news_sync(
    db: Session = Depends(get_db),
) -> NewsSyncResponse:
    try:
        result = NewsService(db).sync_news()
    except NewsAPINotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return NewsSyncResponse(**result)
