import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.alerts import AlertStatus, AlertType


class AlertCreate(BaseModel):
    fund_id: uuid.UUID | None = None
    portfolio_id: uuid.UUID | None = None
    alert_type: AlertType
    threshold_value: float
    is_recurring: bool = False


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    fund_id: uuid.UUID | None
    portfolio_id: uuid.UUID | None
    alert_type: AlertType
    threshold_value: float
    status: AlertStatus
    is_recurring: bool
    created_at: datetime
    triggered_at: datetime | None = None


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    alert_id: uuid.UUID
    message: str
    is_read: bool
    created_at: datetime


class AlertCheckResult(BaseModel):
    alert_id: uuid.UUID
    triggered: bool
    current_value: float
    threshold_value: float
    message: str = Field(default="")
