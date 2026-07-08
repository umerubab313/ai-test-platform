"""Runs a Postman collection through the real Newman CLI as a subprocess."""

import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any

NEWMAN_TIMEOUT_SECONDS = 120  # SDD section 9: max 120 seconds


class NewmanTimeoutError(Exception):
    """Raised when Newman exceeds the execution timeout."""


class NewmanConnectError(Exception):
    """Raised when Newman cannot reach the target base_url at all."""


def run_collection(collection: dict[str, Any]) -> dict[str, Any]:
    """Run a Postman collection via Newman, returning its parsed JSON report."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        collection_path = Path(tmp_dir) / "collection.json"
        report_path = Path(tmp_dir) / "report.json"
        collection_path.write_text(json.dumps(collection), encoding="utf-8")

        try:
            subprocess.run(
                [
                    "newman", "run", str(collection_path),
                    "--reporters", "json",
                    "--reporter-json-export", str(report_path),
                ],
                capture_output=True,
                timeout=NEWMAN_TIMEOUT_SECONDS,
                shell=True,  # required on Windows to locate newman.cmd on PATH
            )
        except subprocess.TimeoutExpired as exc:
            raise NewmanTimeoutError(f"Newman exceeded {NEWMAN_TIMEOUT_SECONDS}s") from exc

        if not report_path.exists():
            raise NewmanConnectError("Newman produced no report — target may be unreachable")

        return json.loads(report_path.read_text(encoding="utf-8"))