"""Pydantic schemas for the final test report."""

import uuid

from pydantic import BaseModel


class ReportSummary(BaseModel):
    passed: int
    failed: int
    total: int
    avg_ms: float


class ReportCoverage(BaseModel):
    endpoints_tested: int
    total_endpoints: int
    pct: float


class BugReportItem(BaseModel):
    """Matches the exact fields shown in SDD section 6.5's example."""

    title: str
    severity: str
    steps_to_reproduce: list[str]
    expected_result: str
    actual_result: str


class ReportResponse(BaseModel):
    run_id: uuid.UUID
    summary: ReportSummary
    coverage: ReportCoverage
    results: list[dict]
    bug_reports: list[BugReportItem]