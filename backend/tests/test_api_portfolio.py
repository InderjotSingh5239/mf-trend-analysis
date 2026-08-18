import uuid

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user_id
from app.database.session import get_db
from app.main import app


@pytest.fixture()
def client(db_session, sample_user_id):
    def _override_get_db():
        yield db_session

    def _override_get_user():
        return sample_user_id

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_id] = _override_get_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestPortfolioAPI:
    def test_health_check(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_create_and_fetch_portfolio(self, client):
        response = client.post(
            "/api/v1/portfolios",
            json={"name": "My First Portfolio", "description": "test", "base_currency": "INR"},
        )
        assert response.status_code == 201
        portfolio_id = response.json()["id"]

        get_response = client.get(f"/api/v1/portfolios/{portfolio_id}")
        assert get_response.status_code == 200
        assert get_response.json()["name"] == "My First Portfolio"

    def test_add_transaction_and_get_summary(self, client):
        create_response = client.post("/api/v1/portfolios", json={"name": "Txn Portfolio"})
        portfolio_id = create_response.json()["id"]

        txn_payload = {
            "fund_id": str(uuid.uuid4()),
            "fund_name": "HDFC Flexi Cap",
            "transaction_type": "BUY",
            "units": 100,
            "nav": 45.0,
            "transaction_date": "2024-01-15T00:00:00Z",
            "category": "flexi cap",
            "sector": "Diversified",
        }
        txn_response = client.post(f"/api/v1/portfolios/{portfolio_id}/transactions", json=txn_payload)
        assert txn_response.status_code == 201

        summary_response = client.get(f"/api/v1/portfolios/{portfolio_id}/summary")
        assert summary_response.status_code == 200
        summary = summary_response.json()
        assert summary["total_invested"] == pytest.approx(4500.0)
        assert summary["number_of_holdings"] == 1

    def test_calculator_endpoints_work_without_db(self, client):
        response = client.post(
            "/api/v1/calculators/sip",
            json={"monthly_investment": 5000, "expected_annual_return_percent": 12, "duration_years": 5},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_invested"] == pytest.approx(300000, rel=1e-6)

    def test_monte_carlo_endpoint(self, client):
        response = client.post(
            "/api/v1/calculators/monte-carlo",
            json={
                "initial_investment": 100000,
                "monthly_contribution": 2000,
                "expected_annual_return_percent": 10,
                "annual_volatility_percent": 15,
                "duration_years": 5,
                "num_simulations": 500,
            },
        )
        assert response.status_code == 200
        assert response.json()["num_simulations"] == 500

    def test_other_user_cannot_access_foreign_portfolio(self, client):
        """A different authenticated user must get 404, not the portfolio, on someone else's data."""
        create_response = client.post("/api/v1/portfolios", json={"name": "Private Portfolio"})
        portfolio_id = create_response.json()["id"]

        other_user_id = uuid.uuid4()
        app.dependency_overrides[get_current_user_id] = lambda: other_user_id
        response = client.get(f"/api/v1/portfolios/{portfolio_id}")
        assert response.status_code == 404

    def test_unauthenticated_request_is_rejected(self):
        """Without any auth dependency override, protected routes must reject anonymous callers."""
        with TestClient(app) as anon_client:
            response = anon_client.get(f"/api/v1/portfolios/{uuid.uuid4()}")
        assert response.status_code in (401, 403)
