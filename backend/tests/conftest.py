"""
Shared pytest fixtures. Tests run against an in-memory SQLite DB so
they need no external Postgres instance; the ORM models are
Postgres-flavored (UUID columns) but SQLAlchemy's generic types keep
this compatible enough for unit-level API tests.
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  ensures every model is registered on Base.metadata
from app.database.base import Base
from app.database.session import get_db
from app.main import app

SQLALCHEMY_TEST_URL = "sqlite:///:memory:"


@pytest.fixture()
def db_session():
    engine = create_engine(
        SQLALCHEMY_TEST_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def sample_user_id():
    """A stand-in authenticated-user id for Phase 4 (portfolio/watchlist/alerts) tests."""
    return uuid.uuid4()
