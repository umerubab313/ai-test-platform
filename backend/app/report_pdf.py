"""PDF report generation for test runs.

Keeps PDF building separate from the API router so the `/report/pdf` endpoint
can remain thin and reuse the exact same data shape as the JSON report.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas.report import BugReportItem, ReportResponse


def build_report_pdf_bytes(report: ReportResponse) -> bytes:
    """Build a PDF (bytes) from the same shape as the JSON report endpoint."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=f"Test Run Report {report.run_id}",
    )

    styles = getSampleStyleSheet()
    story: list[Any] = []

    story.append(Paragraph("AI Test Run Report", styles["Title"]))
    story.append(Paragraph(f"Run ID: {report.run_id}", styles["Normal"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Summary", styles["Heading2"]))
    summary_data = [
        ["Passed", str(report.summary.passed)],
        ["Failed", str(report.summary.failed)],
        ["Total", str(report.summary.total)],
        ["Avg response time (ms)", f"{report.summary.avg_ms:.2f}"],
    ]
    story.append(_key_value_table(summary_data))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Coverage", styles["Heading2"]))
    coverage_data = [
        ["Endpoints tested", str(report.coverage.endpoints_tested)],
        ["Total endpoints", str(report.coverage.total_endpoints)],
        ["Coverage %", f"{report.coverage.pct:.2f}"],
    ]
    story.append(_key_value_table(coverage_data))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Results", styles["Heading2"]))
    story.extend(_results_section(report.results, styles))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Bug reports", styles["Heading2"]))
    story.extend(_bug_reports_section(report.bug_reports, styles))

    doc.build(story)
    return buffer.getvalue()


def _key_value_table(rows: list[list[str]]) -> Table:
    table = Table([["Field", "Value"], *rows], colWidths=[2.2 * inch, 4.8 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _results_section(results: list[dict], styles: Any) -> list[Any]:
    if not results:
        return [Paragraph("No execution results available for this run.", styles["Italic"])]

    header = ["Title", "Method", "Status", "RT (ms)", "Passed"]
    rows: list[list[str]] = [header]
    for r in results:
        rows.append(
            [
                str(r.get("title") or ""),
                str(r.get("method") or ""),
                "" if r.get("status_code") is None else str(r.get("status_code")),
                "" if r.get("response_time_ms") is None else str(r.get("response_time_ms")),
                "yes" if r.get("passed") else "no",
            ]
        )

    table = Table(rows, colWidths=[2.9 * inch, 0.8 * inch, 0.7 * inch, 0.8 * inch, 0.7 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return [table]


def _bug_reports_section(bugs: list[BugReportItem], styles: Any) -> list[Any]:
    if not bugs:
        return [Paragraph("No bug reports recorded for this run.", styles["Italic"])]

    blocks: list[Any] = []
    for idx, b in enumerate(bugs, start=1):
        blocks.append(Paragraph(f"{idx}. {b.title} (severity: {b.severity})", styles["Heading3"]))
        if b.steps_to_reproduce:
            steps = "<br/>".join([f"- { _escape(str(s)) }" for s in b.steps_to_reproduce])
            blocks.append(Paragraph(f"<b>Steps to reproduce</b><br/>{steps}", styles["Normal"]))
        blocks.append(Paragraph(f"<b>Expected</b><br/>{_escape(b.expected_result)}", styles["Normal"]))
        blocks.append(Paragraph(f"<b>Actual</b><br/>{_escape(b.actual_result)}", styles["Normal"]))
        blocks.append(Spacer(1, 8))
    return blocks


def _escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )

