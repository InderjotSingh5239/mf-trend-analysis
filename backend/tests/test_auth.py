def test_register_and_login(client):
    register_payload = {
        "email": "trader@example.com",
        "full_name": "Test Trader",
        "password": "SuperSecret123",
    }
    response = client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == register_payload["email"]
    assert "hashed_password" not in body

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    assert login_response.status_code == 200
    tokens = login_response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens


def test_duplicate_registration_rejected(client):
    payload = {
        "email": "dup@example.com",
        "full_name": "Dup User",
        "password": "SuperSecret123",
    }
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


def test_login_with_wrong_password_rejected(client):
    payload = {
        "email": "wrongpass@example.com",
        "full_name": "Wrong Pass",
        "password": "SuperSecret123",
    }
    client.post("/api/v1/auth/register", json=payload)

    bad_login = client.post(
        "/api/v1/auth/login", json={"email": payload["email"], "password": "IncorrectPassword"}
    )
    assert bad_login.status_code == 401


def test_protected_route_requires_token(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_protected_route_with_valid_token(client):
    payload = {
        "email": "me@example.com",
        "full_name": "Me User",
        "password": "SuperSecret123",
    }
    client.post("/api/v1/auth/register", json=payload)
    login_response = client.post(
        "/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]}
    )
    access_token = login_response.json()["access_token"]

    response = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"})
    assert response.status_code == 200
    assert response.json()["email"] == payload["email"]


def test_refresh_token_flow(client):
    payload = {
        "email": "refresh@example.com",
        "full_name": "Refresh User",
        "password": "SuperSecret123",
    }
    client.post("/api/v1/auth/register", json=payload)
    login_response = client.post(
        "/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]}
    )
    refresh_token = login_response.json()["refresh_token"]

    refresh_response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_response.status_code == 200
    assert "access_token" in refresh_response.json()
