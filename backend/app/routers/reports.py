"""API routes for fetching the final test report."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.execution.result_parser import parse_results

from app.database import get_db
from app.models.bug_report import BugReport
from app.models.test_case import TestCase
from app.models.test_run import TestRun
from app.schemas.report import BugReportItem, ReportCoverage, ReportResponse, ReportSummary

router = APIRouter(tags=["reports"])


def _get_run_or_404(run_id: uuid.UUID, db: Session) -> TestRun:
    """Fetch a test run by ID or raise 404."""
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run not found")
    return run


@router.get("/runs/{run_id}/report", response_model=ReportResponse)
def get_report(run_id: uuid.UUID, db: Session = Depends(get_db)) -> ReportResponse:
    """Build the final report for a completed run.

    Coverage and results reflect real DB data where available. Until
    Newman execution exists (Phase 7), 'endpoints_tested' and 'results'
    will read as 0 / empty for any run — that's accurate, since nothing
    has actually executed yet.
    """
    run = _get_run_or_404(run_id, db)
    total_endpoints = (
        db.query(TestCase.endpoint)
        .filter(TestCase.ticket_id == run.ticket_id)
        .distinct()
        .count()
    )
    endpoints_tested = 0
    pct = round((endpoints_tested / total_endpoints) * 100, 2) if total_endpoints else 0.0

    bug_rows = db.query(BugReport).filter(BugReport.run_id == run_id).all()
    bug_items = [
        BugReportItem(
            title=b.title,
            severity=b.severity,
            steps_to_reproduce=b.steps_to_reproduce,
            expected_result=b.expected_result,
            actual_result=b.actual_result,
        )
        for b in bug_rows
    ]

    return ReportResponse(
        run_id=run.id,
        summary=ReportSummary(
            passed=run.passed,
            failed=run.failed,
            total=run.total_tests,
            avg_ms=run.avg_response_time_ms,
        ),
        coverage=ReportCoverage(
            endpoints_tested=endpoints_tested,
            total_endpoints=total_endpoints,
            pct=pct,
        ),
        results=parse_results(run.newman_output_json) if run.newman_output_json else [],
        bug_reports=bug_items,
    )


@router.get("/runs/{run_id}/report/pdf")
def get_report_pdf(run_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    """Download the report as a PDF.

    PLACEHOLDER: PDF generation is built in Phase 9. Confirms the run
    exists now so the route is real, but the actual file isn't built yet.
    """
    _get_run_or_404(run_id, db)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="PDF report generation is implemented in Phase 9",
    )