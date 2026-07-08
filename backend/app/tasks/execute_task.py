"""Celery task: execute a ticket's approved test cases via Newman."""

import asyncio

from app.ai.exceptions import AIGenerationError
from app.ai.generator import generate_with_retry
from app.ai.prompts import BUG_REPORT_SYSTEM_PROMPT, build_bug_report_prompt
from app.ai.schemas import BUG_REPORT_RESPONSE_SCHEMA
from app.celery_app import celery_app
from app.database import SessionLocal
from app.execution.collection_builder import build_collection
from app.execution.newman_runner import NewmanConnectError, NewmanTimeoutError, run_collection
from app.execution.result_parser import parse_failures, parse_summary
from app.models.bug_report import BugReport
from app.models.project import Project
from app.models.test_case import TestCase
from app.models.test_run import TestRun
from app.models.ticket import Ticket


@celery_app.task(name="execute_test_run_task")
def execute_test_run_task(run_id: str) -> dict:
    """Build a collection from approved test cases, run it, save results."""
    db = SessionLocal()
    try:
        run = db.query(TestRun).filter(TestRun.id == run_id).first()
        if run is None:
            return {"status": "failed", "error": "Run not found"}

        ticket = db.query(Ticket).filter(Ticket.id == run.ticket_id).first()
        project = db.query(Project).filter(Project.id == ticket.project_id).first()
        approved = (
            db.query(TestCase)
            .filter(TestCase.ticket_id == ticket.id, TestCase.approved.is_(True))
            .all()
        )
        if not approved:
            run.status = "failed"
            db.commit()
            return {"status": "failed", "error": "No approved test cases"}

        test_case_dicts = [_to_dict(tc) for tc in approved]
        collection = build_collection(ticket.title, project.base_url, test_case_dicts)

        try:
            report = run_collection(collection)
        except (NewmanTimeoutError, NewmanConnectError) as exc:
            run.status = "failed"
            db.commit()
            return {"status": "failed", "error": str(exc)}

        summary = parse_summary(report)
        run.status = "completed"
        run.total_tests = summary["total_tests"]
        run.passed = summary["passed"]
        run.failed = summary["failed"]
        run.skipped = summary["skipped"]
        run.avg_response_time_ms = summary["avg_response_time_ms"]
        run.newman_output_json = report
        run.collection_json = collection
        db.commit()

        failures = parse_failures(report)
        title_to_case = {tc.title: tc for tc in approved}
        for failure in failures:
            _create_bug_report(db, run, failure, title_to_case.get(failure["title"]))

        return {"status": "completed", "passed": run.passed, "failed": run.failed}
    finally:
        db.close()


def _to_dict(tc: TestCase) -> dict:
    """Convert a TestCase ORM row into the dict shape collection_builder expects."""
    return {
        "title": tc.title,
        "endpoint": tc.endpoint,
        "method": tc.method,
        "headers": tc.headers_json,
        "input_payload": tc.input_payload_json,
        "expected_status_code": tc.expected_status_code,
    }


def _create_bug_report(db, run: TestRun, failure: dict, test_case: TestCase | None) -> None:
    """Generate and persist an AI bug report for one failed execution."""
    prompt = build_bug_report_prompt(
        test_case={"endpoint": failure["endpoint"], "expected_status_code": test_case.expected_status_code}
        if test_case else {"endpoint": failure["endpoint"]},
        actual_status=failure["actual_status"],
        actual_response={"body": failure["actual_body"]},
        response_time_ms=failure["response_time_ms"],
    )
    try:
        result = asyncio.run(
            generate_with_retry(BUG_REPORT_SYSTEM_PROMPT, prompt, BUG_REPORT_RESPONSE_SCHEMA)
        )
    except AIGenerationError:
        return  # bug report generation failing shouldn't crash the whole run

    db.add(BugReport(
        run_id=run.id,
        test_case_id=test_case.id if test_case else None,
        title=result["title"],
        summary=result["summary"],
        steps_to_reproduce=result["steps_to_reproduce"],
        expected_result=result["expected_result"],
        actual_result=result["actual_result"],
        severity=result["severity"],
    ))
    db.commit()