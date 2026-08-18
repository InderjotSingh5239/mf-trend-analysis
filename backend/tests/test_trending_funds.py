"""
Tests for GET /api/v1/funds/trending — real trailing-3Y-CAGR ranking.

Covers PROJECT_AUDIT.md item D: trending must be ranked by an actual
computed 3Y CAGR from stored NAV history, and funds without enough
history must be excluded rather than assigned a fabricated value.
"""

from datetime import date, timedelta

from app.models.mutual_fund import MutualFund
from app.models.nav_history import NAVHistory


def _make_fund(db_session, scheme_code: str, scheme_name: str) -> MutualFund:
    fund = MutualFund(scheme_code=scheme_code, scheme_name=scheme_name)
    db_session.add(fund)
    db_session.flush()
    return fund


def _add_nav(db_session, fund_id, nav_date, nav_value):
    db_session.add(NAVHistory(fund_id=fund_id, nav_date=nav_date, nav_value=nav_value))


def test_trending_ranks_by_real_cagr_and_excludes_short_history(client, db_session):
    today = date.today()

    # Fund A: full ~3.2y history, doubled in value -> high CAGR
    fund_a = _make_fund(db_session, "A001", "Fund A - Long History Grower")
    _add_nav(db_session, fund_a.id, today - timedelta(days=int(3.2 * 365)), 100.0)
    _add_nav(db_session, fund_a.id, today, 200.0)

    # Fund B: full ~3.1y history, modest growth -> lower CAGR than A
    fund_b = _make_fund(db_session, "B001", "Fund B - Long History Modest")
    _add_nav(db_session, fund_b.id, today - timedelta(days=int(3.1 * 365)), 100.0)
    _add_nav(db_session, fund_b.id, today, 120.0)

    # Fund C: only ~6 months of history -> must be excluded, not fabricated
    fund_c = _make_fund(db_session, "C001", "Fund C - New Fund")
    _add_nav(db_session, fund_c.id, today - timedelta(days=180), 100.0)
    _add_nav(db_session, fund_c.id, today, 500.0)  # would look "best" if included

    db_session.commit()

    response = client.get("/api/v1/funds/trending?limit=10")
    assert response.status_code == 200
    body = response.json()

    assert body["ranking_metric"] == "cagr_3y"
    names = [item["scheme_name"] for item in body["items"]]

    # Fund C excluded despite the largest raw NAV jump.
    assert "Fund C - New Fund" not in names

    # Fund A (higher CAGR) ranked above Fund B.
    assert names.index("Fund A - Long History Grower") < names.index("Fund B - Long History Modest")

    # cagr_3y is populated with a real, non-zero computed value.
    fund_a_item = next(item for item in body["items"] if item["scheme_name"] == "Fund A - Long History Grower")
    assert fund_a_item["cagr_3y"] is not None
    assert fund_a_item["cagr_3y"] > 0


def test_trending_empty_when_no_fund_has_enough_history(client, db_session):
    today = date.today()
    fund = _make_fund(db_session, "D001", "Fund D - Too New")
    _add_nav(db_session, fund.id, today - timedelta(days=30), 100.0)
    _add_nav(db_session, fund.id, today, 110.0)
    db_session.commit()

    response = client.get("/api/v1/funds/trending")
    assert response.status_code == 200
    assert response.json()["items"] == []
