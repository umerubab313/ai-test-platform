"""Celery task: execute a ticket's approved test cases via Newman.

PLACEHOLDER: Newman integration is Phase 7. Confirms real dispatch now.
"""

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.test_run import TestRun


@celery_app.task(name="execute_test_run_task")
def execute_test_run_task(run_id: str) -> dict:
    db = SessionLocal()
    try:
        run = db.query(TestRun).filter(TestRun.id == run_id).first()
        if run is None:
            return {"status": "failed", "error": "Run not found"}
        return {"status": "pending", "run_id": run_id}
    finally:
        db.close()