import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.database.session import get_db
from app.models.alerts import Alert, AlertStatus
from app.repositories.alert_repository import AlertRepository
from app.schemas.alerts import AlertCreate, AlertRead, NotificationRead
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def _get_owned_alert(repo: AlertRepository, alert_id: uuid.UUID, user_id: uuid.UUID) -> Alert:
    alert = repo.get_alert(alert_id)
    if alert is None or alert.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.post("", response_model=AlertRead, status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: AlertCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = AlertService(db)
    return service.create_alert(user_id, payload)


@router.get("", response_model=list[AlertRead])
def list_alerts(
    status_filter: AlertStatus | None = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = AlertService(db)
    return service.list_alerts(user_id, status_filter)


@router.post("/{alert_id}/disable", response_model=AlertRead)
def disable_alert(
    alert_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = AlertRepository(db)
    alert = _get_owned_alert(repo, alert_id, user_id)
    service = AlertService(db)
    return service.disable_alert(alert)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = AlertRepository(db)
    alert = _get_owned_alert(repo, alert_id, user_id)
    repo.delete_alert(alert)
    return None


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = False,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    repo = AlertRepository(db)
    return repo.list_notifications(user_id, unread_only)
