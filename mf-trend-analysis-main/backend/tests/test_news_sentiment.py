from datetime import datetime, timedelta, timezone

import pytest

vader = pytest.importorskip("vaderSentiment.vaderSentiment")

from app.etl.news_etl import _classify_sentiment, _compute_impact_score  # noqa: E402


def test_classify_sentiment_positive():
    assert _classify_sentiment(0.6) == "positive"


def test_classify_sentiment_negative():
    assert _classify_sentiment(-0.6) == "negative"


def test_classify_sentiment_neutral_near_zero():
    assert _classify_sentiment(0.0) == "neutral"
    assert _classify_sentiment(0.04) == "neutral"
    assert _classify_sentiment(-0.04) == "neutral"


def test_impact_score_higher_for_stronger_sentiment():
    now = datetime.now(timezone.utc)
    weak = _compute_impact_score(0.1, now)
    strong = _compute_impact_score(0.9, now)
    assert strong > weak


def test_impact_score_decays_with_age():
    now = datetime.now(timezone.utc)
    fresh = _compute_impact_score(0.8, now)
    stale = _compute_impact_score(0.8, now - timedelta(days=5))
    assert fresh > stale
