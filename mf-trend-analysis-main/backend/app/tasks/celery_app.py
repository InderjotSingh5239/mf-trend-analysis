"""
Celery application instance and beat schedule.

The AMFI NAV file is published once per business day, so the ETL
sync is scheduled to run daily after market close (IST).
"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "mf_platform",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.etl_tasks",
        "app.tasks.ml_tasks",
        "app.tasks.market_tasks",
        "app.tasks.news_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
)

celery_app.conf.beat_schedule = {
    "daily-amfi-nav-sync": {
        "task": "app.tasks.etl_tasks.sync_amfi_nav_task",
        # Runs daily at 21:00 IST, after AMFI publishes the day's NAV file.
        "schedule": crontab(hour=21, minute=0),
    },
    "weekly-model-retraining": {
        "task": "app.tasks.ml_tasks.retrain_all_funds_task",
        # Runs weekly (Sunday 23:00 IST) — NAV/fundamentals don't
        # shift fast enough to justify retraining every fund daily.
        "schedule": crontab(day_of_week=0, hour=23, minute=0),
    },
    "daily-yahoo-finance-sync": {
        "task": "app.tasks.market_tasks.sync_yahoo_finance_task",
        "schedule": crontab(hour=20, minute=0),
    },
    "daily-fred-sync": {
        "task": "app.tasks.market_tasks.sync_fred_task",
        # FRED indicators update at most daily (many monthly/quarterly).
        "schedule": crontab(hour=20, minute=30),
    },
    "news-sync-every-3-hours": {
        "task": "app.tasks.news_tasks.sync_news_task",
        "schedule": crontab(minute=0, hour="*/3"),
    },
}
