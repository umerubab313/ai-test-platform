"""API routes for fetching the final test report."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.execution.result_parser import parse_results

from app.database import get_db
from app.models.bug_report import BugReport
from app.models.test_case import TestCase
from app.models.test_run import TestRun
from app.report_pdf import build_report_pdf_bytes
from app.schemas.report import BugReportItem, ReportCoverage, ReportResponse, ReportSummary
from app.auth.dependencies import require_auth

router = APIRouter(tags=["reports"], dependencies=[Depends(require_auth)])


def _get_run_or_404(run_id: uuid.UUID, db: Session) -> TestRun:
    """Fetch a test run by ID or raise 404."""
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run not found")
    return run


@router.get("/runs/{run_id}/report", response_model=ReportResponse)
def get_report(run_id: uuid.UUID, db: Session = Depends(get_db)) -> ReportResponse:
    """Build the final report for a completed run, using real Newman execution data."""
    run = _get_run_or_404(run_id, db)
    total_endpoints = (
        db.query(TestCase.endpoint)
        .filter(TestCase.ticket_id == run.ticket_id)
        .distinct()
        .count()
    )
    parsed_results = parse_results(run.newman_output_json) if run.newman_output_json else []
    endpoints_tested = len({r["endpoint"] for r in parsed_results})
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
        results=parsed_results,
        bug_reports=bug_items,
    )


@router.get("/runs/{run_id}/report/pdf")
def get_report_pdf(run_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    """Download the report as a PDF.
    """
    report = get_report(run_id, db)
    pdf_bytes = build_report_pdf_bytes(report)
    filename = f"run-{run_id}-report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )