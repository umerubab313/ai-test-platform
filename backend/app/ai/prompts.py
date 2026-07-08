"""Prompt templates for AI test case and bug report generation.

Reproduced verbatim from SDD section 8.2 — do not casually reword these;
prompt wording changes model behavior in ways that are easy to miss.
"""

import json

TEST_CASE_SYSTEM_PROMPT = """You are a Senior QA Engineer specialising in backend API testing.
You will receive a feature ticket and a structured JSON map of API endpoints.
Generate comprehensive test cases covering all scenario types.
Return ONLY valid JSON. No explanation. No markdown fences."""

BUG_REPORT_SYSTEM_PROMPT = """You are a Senior QA Engineer writing formal defect reports.
Return ONLY valid JSON. No explanation. No markdown fences."""


def build_test_case_prompt(
    ticket_title: str,
    ticket_description: str,
    acceptance_criteria: str,
    endpoint_map: list[dict],
) -> str:
    """Build the user-turn prompt for test case generation (SDD 8.2, Prompt 1)."""
    return f"""TICKET:
Title: {ticket_title}
Description: {ticket_description}
Acceptance Criteria: {acceptance_criteria}

ENDPOINT MAP (all endpoints in this project):
{json.dumps(endpoint_map)}

Only generate test cases for the endpoint(s) in the map that are actually
relevant to this specific ticket. Ignore unrelated endpoints — the map
covers the whole project, not just this ticket.

Generate test cases for types: happy_path, negative, validation, security, edge_case

Return JSON format:
{{
  "test_cases": [
    {{
      "type": "happy_path",
      "title": "Create order with valid payload",
      "endpoint": "POST /api/orders",
      "method": "POST",
      "headers": {{ "Authorization": "Bearer {{token}}" }},
      "input_payload": {{ "product_id": 1, "quantity": 2 }},
      "expected_status_code": 201,
      "expected_response_contains": {{ "status": "pending" }},
      "assertion_notes": "Response must contain order id and status"
    }}
  ]
}}"""

def build_bug_report_prompt(
    test_case: dict,
    actual_status: int,
    actual_response: dict,
    response_time_ms: int,
) -> str:
    """Build the user-turn prompt for bug report generation (SDD 8.2, Prompt 2)."""
    return f"""TEST CASE THAT FAILED:
{json.dumps(test_case)}

EXECUTION RESULT:
Actual Status Code: {actual_status}
Actual Response Body: {json.dumps(actual_response)}
Response Time: {response_time_ms}ms

Return JSON format:
{{
  "title": "...",
  "summary": "...",
  "steps_to_reproduce": ["step 1", "step 2"],
  "expected_result": "...",
  "actual_result": "...",
  "severity": "critical | high | medium | low"
}}"""