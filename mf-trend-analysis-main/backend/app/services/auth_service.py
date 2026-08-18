"""
Authentication service — business logic for register/login/refresh,
sitting between the API layer and the repository layer.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.user import UserCreate


class AuthError(Exception):
    pass


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)

    def register(self, payload: UserCreate) -> User:
        if self.users.get_by_email(payload.email):
            raise AuthError("A user with this email already exists")

        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
        )
        return self.users.create(user)

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise AuthError("Incorrect email or password")
        if not user.is_active:
            raise AuthError("User account is disabled")
        return user

    def issue_tokens(self, user: User) -> TokenResponse:
        access = create_access_token(str(user.id), role=user.role.value)
        refresh = create_refresh_token(str(user.id))

        token_row = RefreshToken(
            user_id=user.id,
            token=refresh,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        self.db.add(token_row)
        self.db.commit()

        return TokenResponse(access_token=access, refresh_token=refresh)

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.authenticate(email, password)
        return self.issue_tokens(user)

    def refresh_access_token(self, refresh_token: str) -> str:
        try:
            payload = decode_token(refresh_token)
        except ValueError as exc:
            raise AuthError("Invalid refresh token") from exc

        if payload.get("type") != "refresh":
            raise AuthError("Token is not a refresh token")

        stored = (
            self.db.query(RefreshToken)
            .filter(RefreshToken.token == refresh_token, RefreshToken.revoked.is_(False))
            .first()
        )
        if stored is None:
            raise AuthError("Refresh token not recognized or already revoked")
        # `stored.expires_at` may come back timezone-naive on backends that don't
        # preserve tzinfo on DateTime(timezone=True) columns (e.g. SQLite); normalize
        # before comparing so this works identically on SQLite and Postgres.
        expires_at = stored.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise AuthError("Refresh token expired")

        user = self.users.get_by_id(stored.user_id)
        if user is None or not user.is_active:
            raise AuthError("User not found or inactive")

        return create_access_token(str(user.id), role=user.role.value)
