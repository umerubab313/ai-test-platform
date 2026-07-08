"""Celery task: AI test case generation for a ticket."""

import asyncio

from app.ai.exceptions import AIGenerationError
from app.ai.generator import generate_with_retry
from app.ai.prompts import TEST_CASE_SYSTEM_PROMPT, build_test_case_prompt
from app.ai.schemas import TEST_CASE_RESPONSE_SCHEMA
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.test_case import TestCase
from app.models.ticket import Ticket
from app.services.sanitize import strip_html


@celery_app.task(name="generate_test_cases_task")
def generate_test_cases_task(ticket_id: str) -> dict:
    """Background job: call the AI using the ticket's project's stored
    endpoint_map, persist generated test cases.

    Defensive check on endpoint_map is kept here too, even though the
    API layer already checks before dispatching — in case the project's
    endpoint_map is somehow cleared between the check and this running.
    Either way, no AI call happens without a real endpoint_map.
    """
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if ticket is None:
            return {"status": "failed", "error": "Ticket not found"}

        project = ticket.project if hasattr(ticket, "project") else None
        if project is None:
            from app.models.project import Project
            project = db.query(Project).filter(Project.id == ticket.project_id).first()
        if not project or not project.endpoint_map:
            return {"status": "failed", "error": "NO_ENDPOINT_MAP"}

        user_prompt = build_test_case_prompt(
            ticket_title=ticket.title,
            ticket_description=strip_html(ticket.description),
            acceptance_criteria=strip_html(ticket.acceptance_criteria or ""),
            endpoint_map=project.endpoint_map,
        )
        try:
            result = asyncio.run(
                generate_with_retry(TEST_CASE_SYSTEM_PROMPT, user_prompt, TEST_CASE_RESPONSE_SCHEMA)
            )
        except AIGenerationError as exc:
            return {"status": "failed", "error": str(exc)}

        for tc in result["test_cases"]:
            db.add(TestCase(
                ticket_id=ticket.id,
                type=tc["type"],
                title=tc["title"],
                endpoint=tc["endpoint"],
                method=tc["method"],
                headers_json=tc.get("headers"),
                input_payload_json=tc.get("input_payload"),
                expected_status_code=tc["expected_status_code"],
                expected_response_json=tc.get("expected_response_contains"),
                assertion_notes=tc.get("assertion_notes"),
            ))
        db.commit()
        return {"status": "completed", "generated_count": len(result["test_cases"])}
    finally:
        db.close()