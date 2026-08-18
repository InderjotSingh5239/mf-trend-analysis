"""
User endpoints — self-service profile access.
"""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead, tags=["Users"])
def read_current_user(current_user: User = Depends(get_current_user)) -> UserRead:
    return current_user
