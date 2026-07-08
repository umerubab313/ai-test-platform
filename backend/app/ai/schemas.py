"""JSON Schemas that validate raw AI output before it's trusted or stored."""

TEST_CASE_TYPES = ["happy_path", "negative", "validation", "security", "edge_case"]
SEVERITY_LEVELS = ["critical", "high", "medium", "low"]

TEST_CASE_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["test_cases"],
    "properties": {
        "test_cases": {
            "type": "array",
            "minItems": 3,  # SDD 8.4: fewer than 3 is treated as a failed generation
            "items": {
                "type": "object",
                "required": ["type", "title", "endpoint", "method", "expected_status_code"],
                "properties": {
                    "type": {"enum": TEST_CASE_TYPES},
                    "title": {"type": "string"},
                    "endpoint": {"type": "string"},
                    "method": {"type": "string"},
                    "headers": {"type": "object"},
                    "input_payload": {"type": "object"},
                    "expected_status_code": {"type": "integer"},
                    "expected_response_contains": {"type": ["object", "array"]},
                    "assertion_notes": {"type": "string"},
                },
            },
        }
    },
}

BUG_REPORT_RESPONSE_SCHEMA = {
    "type": "object",
    "required": [
        "title", "summary", "steps_to_reproduce",
        "expected_result", "actual_result", "severity",
    ],
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "steps_to_reproduce": {"type": "array", "items": {"type": "string"}},
        "expected_result": {"type": "string"},
        "actual_result": {"type": "string"},
        "severity": {"enum": SEVERITY_LEVELS},
    },
}