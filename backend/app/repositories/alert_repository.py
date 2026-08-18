import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alerts import Alert, AlertStatus, Notification


class AlertRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_alert(self, alert: Alert) -> Alert:
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def get_alert(self, alert_id: uuid.UUID) -> Alert | None:
        return self.db.get(Alert, alert_id)

    def list_alerts(self, user_id: uuid.UUID, status: AlertStatus | None = None) -> list[Alert]:
        stmt = select(Alert).where(Alert.user_id == user_id)
        if status:
            stmt = stmt.where(Alert.status == status)
        return list(self.db.execute(stmt).scalars().all())

    def list_active_alerts(self) -> list[Alert]:
        stmt = select(Alert).where(Alert.status == AlertStatus.ACTIVE)
        return list(self.db.execute(stmt).scalars().all())

    def update_alert_status(self, alert: Alert, status: AlertStatus, triggered_at=None) -> Alert:
        alert.status = status
        if triggered_at is not None:
            alert.triggered_at = triggered_at
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def delete_alert(self, alert: Alert) -> None:
        self.db.delete(alert)
        self.db.commit()

    def create_notification(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def list_notifications(self, user_id: uuid.UUID, unread_only: bool = False) -> list[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        stmt = stmt.order_by(Notification.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())
