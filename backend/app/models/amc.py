"""
Asset Management Company (AMC / fund house) model.
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPKMixin


class AMC(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "amcs"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    code: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)

    funds: Mapped[list["MutualFund"]] = relationship(back_populates="amc")  # noqa: F821
