"""Celery application instance and configuration."""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ai_test_platform",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.generate_task",
        "app.tasks.parse_task",
        "app.tasks.execute_task",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)