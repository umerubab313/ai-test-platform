import { http, HttpResponse } from "msw";

import { API_BASE_URL } from "@/types";
import type { Project, TestCase, Ticket } from "@/types";

import {
  createMockReport,
  createMockTestCases,
  mockCompletedRun,
  projectForId,
  ticketForId,
} from "./data";

const api = (path: string) => `${API_BASE_URL}${path}`;

const UPLOAD_COMPLETE_MS = 2_000;
const GENERATE_COMPLETE_MS = 3_000;

interface MockState {
  projects: Map<string, Project>;
  tickets: Map<string, Ticket>;
  testCases: Map<string, TestCase[]>;
  uploadStartedAt: Map<string, number>;
  generateStartedAt: Map<string, number>;
}

const state: MockState = {
  projects: new Map(),
  tickets: new Map(),
  testCases: new Map(),
  uploadStartedAt: new Map(),
  generateStartedAt: new Map(),
};

function getProject(id: string): Project {
  return state.projects.get(id) ?? projectForId(id);
}

function getTicket(id: string): Ticket {
  const existing = state.tickets.get(id);
  if (existing) {
    return existing;
  }

  return ticketForId(id, getProject(id).id);
}

function getTestCases(ticketId: string): TestCase[] {
  if (!state.testCases.has(ticketId)) {
    state.testCases.set(ticketId, createMockTestCases(ticketId));
  }

  return state.testCases.get(ticketId) ?? [];
}

function findTestCase(testCaseId: string): TestCase | undefined {
  for (const cases of Array.from(state.testCases.values())) {
    const match = cases.find((testCase: TestCase) => testCase.id === testCaseId);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export const handlers = [
  http.get(api("/health"), () => {
    return HttpResponse.json({ status: "ok" });
  }),

  http.get(api("/projects"), () => {
    const projects =
      state.projects.size > 0
        ? Array.from(state.projects.values())
        : [projectForId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")];

    return HttpResponse.json(projects);
  }),

  http.post(api("/projects"), async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      framework: Project["framework"];
      base_url: string;
    };

    const project: Project = {
      id: crypto.randomUUID(),
      name: body.name,
      framework: body.framework,
      base_url: body.base_url,
      created_at: new Date().toISOString(),
    };

    state.projects.set(project.id, project);

    return HttpResponse.json(project, { status: 201 });
  }),

  http.get(api("/projects/:projectId"), ({ params }) => {
    const projectId = String(params.projectId);
    return HttpResponse.json(getProject(projectId));
  }),

  http.post(api("/projects/:projectId/upload"), async ({ params }) => {
    const projectId = String(params.projectId);
    const taskId = crypto.randomUUID();

    state.projects.set(projectId, getProject(projectId));
    state.uploadStartedAt.set(taskId, Date.now());

    return HttpResponse.json(
      {
        upload_id: crypto.randomUUID(),
        task_id: taskId,
        status: "processing",
      },
      { status: 202 }
    );
  }),

  http.get(api("/uploads/:taskId/result"), ({ params }) => {
    const taskId = String(params.taskId);
    const startedAt = state.uploadStartedAt.get(taskId);

    if (!startedAt || Date.now() - startedAt < UPLOAD_COMPLETE_MS) {
      return HttpResponse.json({ status: "processing" });
    }

    return HttpResponse.json({
      status: "completed",
      framework: "fastapi",
      endpoint_count: 12,
    });
  }),

  http.post(api("/projects/:projectId/tickets"), async ({ params, request }) => {
    const projectId = String(params.projectId);
    const body = (await request.json()) as {
      title: string;
      description: string;
      acceptance_criteria?: string | null;
    };

    const ticketId = crypto.randomUUID();
    const ticket = ticketForId(ticketId, projectId, {
      title: body.title,
      description: body.description,
      acceptance_criteria: body.acceptance_criteria ?? null,
    });

    state.tickets.set(ticketId, ticket);

    return HttpResponse.json(
      {
        ticket_id: ticketId,
        title: ticket.title,
      },
      { status: 201 }
    );
  }),

  http.get(api("/tickets/:ticketId"), ({ params }) => {
    const ticketId = String(params.ticketId);
    return HttpResponse.json(getTicket(ticketId));
  }),

  http.post(api("/tickets/:ticketId/generate"), ({ params }) => {
    const ticketId = String(params.ticketId);
    state.generateStartedAt.set(ticketId, Date.now());

    return HttpResponse.json(
      {
        task_id: `mock-generate-${ticketId}`,
        status: "generating",
      },
      { status: 202 }
    );
  }),

  http.get(api("/tickets/:ticketId/test-cases"), ({ params }) => {
    const ticketId = String(params.ticketId);
    const startedAt = state.generateStartedAt.get(ticketId);

    if (!startedAt || Date.now() - startedAt < GENERATE_COMPLETE_MS) {
      return HttpResponse.json({
        status: "generating",
        test_cases: [],
      });
    }

    return HttpResponse.json({
      status: "completed",
      test_cases: getTestCases(ticketId),
    });
  }),

  http.patch(api("/test-cases/:testCaseId"), async ({ params, request }) => {
    const testCaseId = String(params.testCaseId);
    const updates = (await request.json()) as Partial<TestCase>;
    const testCase = findTestCase(testCaseId);

    if (!testCase) {
      return HttpResponse.json({ detail: "Test case not found" }, { status: 404 });
    }

    Object.assign(testCase, updates);

    return HttpResponse.json(testCase);
  }),

  http.post(api("/test-cases/:testCaseId/approve"), ({ params }) => {
    const testCaseId = String(params.testCaseId);
    const testCase = findTestCase(testCaseId);

    if (!testCase) {
      return HttpResponse.json({ detail: "Test case not found" }, { status: 404 });
    }

    testCase.approved = true;

    return HttpResponse.json({
      id: testCase.id,
      approved: true,
    });
  }),

  http.post(api("/tickets/:ticketId/run"), ({ params }) => {
    const ticketId = String(params.ticketId);
    const runId = crypto.randomUUID();

    return HttpResponse.json(
      {
        run_id: runId,
        status: "running",
      },
      { status: 202 }
    );
  }),

  http.get(api("/runs/:runId"), ({ params }) => {
    const runId = String(params.runId);

    return HttpResponse.json({
      ...mockCompletedRun,
      id: runId,
    });
  }),

  http.get(api("/runs/:runId/report"), ({ params }) => {
    const runId = String(params.runId);
    return HttpResponse.json(createMockReport(runId));
  }),

  http.get(api("/runs/:runId/report/pdf"), () => {
    const pdfBody = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";

    return new HttpResponse(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="mock-report.pdf"',
      },
    });
  }),
];
