"""
News Intelligence ETL — fetches real financial news headlines via
NewsAPI (https://newsapi.org, free developer tier, requires
NEWSAPI_KEY) and runs VADER sentiment analysis (rule/lexicon-based,
no model download required — well suited to short headlines).

Impact score is a simple, transparent heuristic (not a black box):
combines how strongly-worded the sentiment is with recency, so a
strongly negative headline from an hour ago scores higher impact
than a mildly negative one from three days ago.
"""

from datetime import datetime, timedelta, timezone

import httpx
from loguru import logger
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from app.core.config import settings
from app.repositories.news_repository import NewsRepository

NEWSAPI_URL = "https://newsapi.org/v2/everything"

DEFAULT_QUERIES = [
    "mutual fund India",
    "NSE BSE India stock market",
    "RBI monetary policy",
    "SEBI mutual fund",
]

_analyzer = SentimentIntensityAnalyzer()


class NewsAPINotConfiguredError(Exception):
    pass


def _classify_sentiment(compound_score: float) -> str:
    if compound_score >= 0.05:
        return "positive"
    if compound_score <= -0.05:
        return "negative"
    return "neutral"


def _compute_impact_score(compound_score: float, published_at: datetime) -> float:
    age_hours = max(0.0, (datetime.now(timezone.utc) - published_at).total_seconds() / 3600)
    recency_weight = max(0.1, 1.0 - min(age_hours / 72, 1.0))  # decays over 3 days
    return round(abs(compound_score) * 100 * recency_weight, 2)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=20))
def _fetch_query(query: str, api_key: str, from_date: datetime) -> list[dict]:
    params = {
        "q": query,
        "from": from_date.strftime("%Y-%m-%d"),
        "sortBy": "publishedAt",
        "language": "en",
        "pageSize": 50,
        "apiKey": api_key,
    }
    with httpx.Client(timeout=20.0) as client:
        response = client.get(NEWSAPI_URL, params=params)
        response.raise_for_status()
        return response.json().get("articles", [])


def run_news_sync(db: Session, lookback_days: int = 3, queries: list[str] | None = None) -> dict:
    if not settings.NEWSAPI_KEY:
        raise NewsAPINotConfiguredError(
            "NEWSAPI_KEY is not set. Get a free key at https://newsapi.org/register " "and set it in .env"
        )

    queries = queries or DEFAULT_QUERIES
    from_date = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    started_at = datetime.utcnow()

    all_rows: dict[str, dict] = {}  # keyed by URL to dedupe across queries
    for query in queries:
        try:
            articles = _fetch_query(query, settings.NEWSAPI_KEY, from_date)
        except Exception as exc:  # noqa: BLE001
            logger.warning("NewsAPI query '{}' failed: {}", query, exc)
            continue

        for article in articles:
            url = article.get("url")
            title = article.get("title")
            if not url or not title:
                continue

            published_raw = article.get("publishedAt")
            try:
                published_at = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))
            except (TypeError, ValueError):
                published_at = datetime.now(timezone.utc)

            text_for_sentiment = f"{title}. {article.get('description') or ''}"
            scores = _analyzer.polarity_scores(text_for_sentiment)
            sentiment_label = _classify_sentiment(scores["compound"])
            impact_score = _compute_impact_score(scores["compound"], published_at)

            all_rows[url] = {
                "title": title[:500],
                "url": url,
                "source": (article.get("source") or {}).get("name"),
                "published_at": published_at,
                "summary": (article.get("description") or "")[:2000] or None,
                "category": query,
                "sentiment_label": sentiment_label,
                "sentiment_score": scores["compound"],
                "impact_score": impact_score,
                "related_symbols": None,
            }

    repo = NewsRepository(db)
    rows_upserted = repo.bulk_upsert(list(all_rows.values()))

    finished_at = datetime.utcnow()
    logger.info(
        "News sync complete: {} articles across {} queries in {:.2f}s",
        rows_upserted,
        len(queries),
        (finished_at - started_at).total_seconds(),
    )

    return {
        "articles_upserted": rows_upserted,
        "queries_run": len(queries),
        "started_at": started_at,
        "finished_at": finished_at,
    }
