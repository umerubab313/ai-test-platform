import type {
  BugReport,
  Project,
  Report,
  TestCase,
  TestCaseType,
  Ticket,
  TestRun,
} from "@/types";

export const MOCK_PROJECT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
export const MOCK_TICKET_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
export const MOCK_RUN_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012";
export const MOCK_UPLOAD_TASK_ID = "mock-upload-task-001";
export const MOCK_GENERATE_TASK_ID = "mock-generate-task-001";

const API_ENDPOINTS = [
  { method: "GET", path: "/api/v1/health" },
  { method: "GET", path: "/api/v1/users" },
  { method: "POST", path: "/api/v1/users" },
  { method: "GET", path: "/api/v1/users/{id}" },
  { method: "PATCH", path: "/api/v1/users/{id}" },
  { method: "DELETE", path: "/api/v1/users/{id}" },
  { method: "POST", path: "/api/v1/auth/login" },
  { method: "POST", path: "/api/v1/auth/logout" },
  { method: "GET", path: "/api/v1/orders" },
  { method: "POST", path: "/api/v1/orders" },
  { method: "GET", path: "/api/v1/orders/{id}" },
  { method: "GET", path: "/api/v1/products" },
] as const;

const CASES_PER_TYPE: Record<TestCaseType, number> = {
  happy_path: 4,
  negative: 3,
  validation: 4,
  security: 3,
  edge_case: 4,
};

export const mockProject: Project = {
  id: MOCK_PROJECT_ID,
  name: "payments-api",
  framework: "fastapi",
  base_url: "https://api.example.com",
  created_at: "2026-07-09T10:00:00.000Z",
};

export const mockTicket: Ticket = {
  id: MOCK_TICKET_ID,
  project_id: MOCK_PROJECT_ID,
  title: "User registration happy path",
  description:
    "As an API consumer, I can register a new user with valid email and password.",
  acceptance_criteria:
    "POST /api/v1/users returns 201 with user id; duplicate email returns 409.",
};

export const mockCompletedRun: TestRun = {
  id: MOCK_RUN_ID,
  ticket_id: MOCK_TICKET_ID,
  status: "completed",
  total_tests: 18,
  passed: 16,
  failed: 2,
  skipped: 0,
  avg_response_time_ms: 142.5,
};

export function createMockTestCases(ticketId: string): TestCase[] {
  const testCases: TestCase[] = [];
  let endpointIndex = 0;

  (Object.keys(CASES_PER_TYPE) as TestCaseType[]).forEach((type) => {
    const count = CASES_PER_TYPE[type];

    for (let index = 0; index < count; index += 1) {
      const endpoint = API_ENDPOINTS[endpointIndex % API_ENDPOINTS.length];
      endpointIndex += 1;

      testCases.push({
        id: `tc-${type}-${index + 1}-${ticketId.slice(0, 8)}`,
        ticket_id: ticketId,
        type,
        title: `${formatTypeLabel(type)} — ${endpoint.method} ${endpoint.path}`,
        endpoint: endpoint.path,
        method: endpoint.method,
        input_payload:
          endpoint.method === "GET" || endpoint.method === "DELETE"
            ? null
            : {
                email: "qa@example.com",
                password: "Str0ngPass!",
                name: "QA User",
              },
        headers:
          type === "security"
            ? { Authorization: "Bearer invalid-token" }
            : { "Content-Type": "application/json" },
        expected_status_code: type === "negative" ? 400 : 201,
        expected_response_contains:
          type === "happy_path" ? ["id", "email"] : "error",
        assertion_notes:
          type === "edge_case"
            ? "Boundary payload with max-length fields."
            : null,
        approved: false,
      });
    }
  });

  return testCases;
}

export const mockBugReports: BugReport[] = [
  {
    title: "Duplicate email returns 500 instead of 409",
    summary:
      "POST /api/v1/users with an existing email triggers an unhandled exception.",
    steps_to_reproduce: [
      "POST /api/v1/users with a new valid payload — expect 201.",
      "Repeat the same request with the same email.",
      "Observe the response status and body.",
    ],
    expected_result: "HTTP 409 Conflict with a structured error message.",
    actual_result: "HTTP 500 Internal Server Error with stack trace leaked.",
    severity: "critical",
  },
  {
    title: "Missing auth header not rejected on orders list",
    summary: "GET /api/v1/orders succeeds without Authorization header.",
    steps_to_reproduce: [
      "Send GET /api/v1/orders without any Authorization header.",
      "Inspect status code and response payload.",
    ],
    expected_result: "HTTP 401 Unauthorized.",
    actual_result: "HTTP 200 OK with order data returned.",
    severity: "medium",
  },
];

export function createMockReport(runId: string): Report {
  const testCases = createMockTestCases(MOCK_TICKET_ID);

  return {
    run_id: runId,
    summary: {
      passed: mockCompletedRun.passed,
      failed: mockCompletedRun.failed,
      total: mockCompletedRun.total_tests,
      avg_ms: mockCompletedRun.avg_response_time_ms,
    },
    coverage: {
      endpoints_tested: 10,
      total_endpoints: 12,
      pct: 83.33,
    },
    results: testCases.map((testCase, index) => ({
      title: testCase.title,
      endpoint: `https://api.example.com${testCase.endpoint}`,
      method: testCase.method,
      status_code: index < 16 ? testCase.expected_status_code : 500,
      response_time_ms: 80 + index * 12,
      passed: index < 16,
    })),
    bug_reports: mockBugReports,
  };
}

function formatTypeLabel(type: TestCaseType): string {
  return type.replace(/_/g, " ");
}

export function projectForId(id: string, overrides?: Partial<Project>): Project {
  return {
    ...mockProject,
    id,
    ...overrides,
  };
}

export function ticketForId(
  id: string,
  projectId: string,
  overrides?: Partial<Ticket>
): Ticket {
  return {
    ...mockTicket,
    id,
    project_id: projectId,
    ...overrides,
  };
}
