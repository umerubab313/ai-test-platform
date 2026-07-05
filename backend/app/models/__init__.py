"""Import all models here so SQLAlchemy's Base.metadata sees every table."""

from app.models.bug_report import BugReport, Severity
from app.models.project import Framework, Project
from app.models.test_case import TestCase, TestCaseType
from app.models.test_run import TestRun, TestRunStatus
from app.models.ticket import Ticket

__all__ = [
    "BugReport",
    "Severity",
    "Framework",
    "Project",
    "TestCase",
    "TestCaseType",
    "TestRun",
    "TestRunStatus",
    "Ticket",
]