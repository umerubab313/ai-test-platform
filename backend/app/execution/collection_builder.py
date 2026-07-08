"""Converts approved test cases into a Postman Collection v2.1 JSON."""

import json
import re
from typing import Any


def build_collection(ticket_title: str, base_url: str, test_cases: list[dict]) -> dict[str, Any]:
    """Build a Postman Collection v2.1 JSON from approved test case dicts.

    Each test case dict must have: title, endpoint, method, headers,
    input_payload, expected_status_code.
    """
    return {
        "info": {
            "name": f"Generated tests: {ticket_title}",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": [_build_item(tc, base_url) for tc in test_cases],
    }


def _build_item(tc: dict, base_url: str) -> dict[str, Any]:
    """Build a single Postman request item with a status-code assertion."""
    raw_endpoint = tc["endpoint"]
    path = raw_endpoint.split(" ", 1)[1] if " " in raw_endpoint else raw_endpoint
    url = base_url.rstrip("/") + _to_postman_path(path)

    item: dict[str, Any] = {
        "name": tc["title"],
        "request": {
            "method": tc["method"].upper(),
            "header": [{"key": k, "value": str(v)} for k, v in (tc.get("headers") or {}).items()],
            "url": url,
        },
        "event": [_build_test_script(tc["expected_status_code"])],
    }
    if tc.get("input_payload") is not None:
        item["request"]["body"] = {
            "mode": "raw",
            "raw": json.dumps(tc["input_payload"]),
            "options": {"raw": {"language": "json"}},
        }
    return item


def _to_postman_path(path: str) -> str:
    """Convert {param} path syntax to Postman's {{param}} variable syntax."""
    return re.sub(r"\{(\w+)\}", r"{{\1}}", path)


def _build_test_script(expected_status: int) -> dict[str, Any]:
    """Attach a pm.test assertion checking the expected status code."""
    return {
        "listen": "test",
        "script": {
            "type": "text/javascript",
            "exec": [
                f"pm.test('status code is {expected_status}', function () {{",
                f"    pm.response.to.have.status({expected_status});",
                "});",
            ],
        },
    }