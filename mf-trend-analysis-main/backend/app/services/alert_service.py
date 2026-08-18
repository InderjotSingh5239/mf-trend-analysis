"""
Alert business logic: create alerts, evaluate whether current market/portfolio
values breach a threshold, and generate notifications when triggered.

`check_alert` is designed to be called by a Celery beat task (in the
Core Platform's `tasks/` module) on a schedule, passing in the latest NAV /
return / drawdown figures for the relevant fund or portfolio.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.alerts import Alert, AlertStatus, AlertType, Notification
from app.repositories.alert_repository import AlertRepository
from app.schemas.alerts import AlertCheckResult, AlertCreate


class AlertService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AlertRepository(db)

    def create_alert(self, user_id: uuid.UUID, payload: AlertCreate) -> Alert:
        alert = Alert(
            user_id=user_id,
            fund_id=payload.fund_id,
            portfolio_id=payload.portfolio_id,
            alert_type=payload.alert_type,
            threshold_value=payload.threshold_value,
            is_recurring=payload.is_recurring,
        )
        return self.repo.create_alert(alert)

    def list_alerts(self, user_id: uuid.UUID, status: AlertStatus | None = None) -> list[Alert]:
        return self.repo.list_alerts(user_id, status)

    def disable_alert(self, alert: Alert) -> Alert:
        return self.repo.update_alert_status(alert, AlertStatus.DISABLED)

    def check_alert(self, alert: Alert, current_value: float) -> AlertCheckResult:
        """
        Evaluate a single alert against a freshly fetched current value
        (NAV, return %, risk score, or drawdown %, depending on alert_type).
        """
        triggered = self._evaluate(alert.alert_type, current_value, alert.threshold_value)

        message = ""
        if triggered:
            message = self._build_message(alert, current_value)
            new_status = AlertStatus.ACTIVE if alert.is_recurring else AlertStatus.TRIGGERED
            self.repo.update_alert_status(alert, new_status, triggered_at=datetime.now(timezone.utc))
            notification = Notification(
                alert_id=alert.id,
                user_id=alert.user_id,
                message=message,
            )
            self.repo.create_notification(notification)

        return AlertCheckResult(
            alert_id=alert.id,
            triggered=triggered,
            current_value=current_value,
            threshold_value=alert.threshold_value,
            message=message,
        )

    def check_all_active_alerts(self, value_lookup: dict[uuid.UUID, float]) -> list[AlertCheckResult]:
        """
        Bulk-check all ACTIVE alerts. `value_lookup` maps alert.id -> the
        latest observed value for that alert (the caller is responsible for
        fetching NAV/return/risk data and building this map).
        """
        results = []
        for alert in self.repo.list_active_alerts():
            if alert.id in value_lookup:
                results.append(self.check_alert(alert, value_lookup[alert.id]))
        return results

    @staticmethod
    def _evaluate(alert_type: AlertType, current_value: float, threshold: float) -> bool:
        if alert_type in (AlertType.NAV_ABOVE, AlertType.RETURN_ABOVE, AlertType.RISK_SCORE_ABOVE):
            return current_value >= threshold
        if alert_type in (AlertType.NAV_BELOW, AlertType.RETURN_BELOW, AlertType.PORTFOLIO_DRAWDOWN):
            return current_value <= threshold
        return False

    @staticmethod
    def _build_message(alert: Alert, current_value: float) -> str:
        readable = {
            AlertType.NAV_ABOVE: f"NAV crossed above {alert.threshold_value} (current: {current_value})",
            AlertType.NAV_BELOW: f"NAV dropped below {alert.threshold_value} (current: {current_value})",
            AlertType.RETURN_ABOVE: f"Return exceeded {alert.threshold_value}% (current: {current_value}%)",
            AlertType.RETURN_BELOW: f"Return fell below {alert.threshold_value}% (current: {current_value}%)",
            AlertType.RISK_SCORE_ABOVE: f"Risk score exceeded {alert.threshold_value} (current: {current_value})",
            AlertType.PORTFOLIO_DRAWDOWN: f"Portfolio drawdown reached {current_value}% (threshold: {alert.threshold_value}%)",
        }
        return readable.get(alert.alert_type, "Alert triggered")
