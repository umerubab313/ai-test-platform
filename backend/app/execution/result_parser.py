"""Parses a raw Newman JSON report into our internal data shapes."""

from typing import Any


def parse_summary(report: dict[str, Any]) -> dict[str, Any]:
    """Extract pass/fail counts and average response time from a Newman report.

    Uses assertion-level stats, not request-level stats: a request can
    succeed at the transport level (a real response came back) while
    still failing our test (wrong status code) — that's an assertion
    failure, which is what actually matters for pass/fail here.
    """
    stats = report["run"]["stats"]
    timings = report["run"]["timings"]
    total = stats["assertions"]["total"]
    failed = stats["assertions"]["failed"]

    return {
        "total_tests": total,
        "passed": total - failed,
        "failed": failed,
        "skipped": stats["assertions"]["pending"],
        "avg_response_time_ms": _average_response_time(report),
        "avg_run_duration_ms": timings.get("completed", 0) - timings.get("started", 0),
    }


def parse_failures(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract one clean dict per failed request, ready for AI bug-report generation."""
    failures = []
    for execution in report["run"]["executions"]:
        response = execution.get("response")
        if response is None:
            continue
        assertions = execution.get("assertions") or []
        failed_assertions = [a for a in assertions if a.get("error")]
        if not failed_assertions:
            continue
        failures.append({
            "title": execution["item"]["name"],
            "endpoint": _reconstruct_url(execution["request"]["url"]),
            "method": execution["request"]["method"],
            "actual_status": response["code"],
            "actual_body": _safe_decode_body(execution),
            "response_time_ms": response.get("responseTime", 0),
        })
    return failures


def _average_response_time(report: dict[str, Any]) -> float:
    """Average response time across all executions that got a real response."""
    times = [
        e["response"]["responseTime"]
        for e in report["run"]["executions"]
        if e.get("response") is not None
    ]
    return round(sum(times) / len(times), 2) if times else 0.0


def _safe_decode_body(execution: dict[str, Any]) -> str:
    """Best-effort decode of a response body for use in bug report prompts."""
    stream = execution.get("response", {}).get("stream")
    if not stream or "data" not in stream:
        return ""
    try:
        return bytes(stream["data"]).decode("utf-8", errors="ignore")[:1000]
    except Exception:
        return ""
    
def _reconstruct_url(url: Any) -> str:
    """Build a readable URL string from Newman's parsed url object."""
    if isinstance(url, str):
        return url
    protocol = url.get("protocol", "http")
    host = ".".join(url.get("host", []))
    port = url.get("port")
    path = "/" + "/".join(url.get("path", []))
    port_part = f":{port}" if port else ""
    return f"{protocol}://{host}{port_part}{path}"


def parse_results(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Build a flat list of per-request results for the report endpoint."""
    results = []
    for execution in report.get("run", {}).get("executions", []):
        response = execution.get("response")
        assertions = execution.get("assertions") or []
        passed = bool(assertions) and all(not a.get("error") for a in assertions)
        results.append({
            "title": execution["item"]["name"],
            "endpoint": _reconstruct_url(execution["request"]["url"]),
            "method": execution["request"]["method"],
            "status_code": response["code"] if response else None,
            "response_time_ms": response.get("responseTime") if response else None,
            "passed": passed,
        })
    return results