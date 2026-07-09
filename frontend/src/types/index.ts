export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Framework = "laravel" | "fastapi" | "spring_boot";

export type TestCaseType =
  | "happy_path"
  | "negative"
  | "validation"
  | "security"
  | "edge_case";

export type TestRunStatus = "pending" | "running" | "completed" | "failed";

export type Severity = "critical" | "high" | "medium" | "low";

export interface Project {
  id: string;
  name: string;
  framework: Framework;
  base_url: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  project_id: string;
  title: string;
  description: string;
  acceptance_criteria: string | null;
}

export interface TestCase {
  id: string;
  ticket_id: string;
  type: TestCaseType;
  title: string;
  endpoint: string;
  method: string;
  input_payload: Record<string, unknown> | null;
  headers: Record<string, unknown> | null;
  expected_status_code: number;
  expected_response_contains: string | string[] | null;
  assertion_notes: string | null;
  approved: boolean;
}

export interface TestRun {
  id: string;
  ticket_id: string;
  status: TestRunStatus;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  avg_response_time_ms: number;
}

export interface BugReport {
  title: string;
  summary: string;
  steps_to_reproduce: string[];
  expected_result: string;
  actual_result: string;
  severity: Severity;
}

export interface ReportSummary {
  passed: number;
  failed: number;
  total: number;
  avg_ms: number;
}

export interface ReportCoverage {
  endpoints_tested: number;
  total_endpoints: number;
  pct: number;
}

export interface Report {
  run_id: string;
  summary: ReportSummary;
  coverage: ReportCoverage;
  results: unknown[];
  bug_reports: BugReport[];
}
