import type { TestCase } from "@/types";

const EMIT_INTERVAL_MS = 800;
const RESPONSE_TIME_MIN_MS = 80;
const RESPONSE_TIME_MAX_MS = 400;
const CONNECT_DELAY_MS = 150;

export interface RunSocketLike {
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(code?: number, reason?: string): void;
}

function randomResponseTimeMs(): number {
  return (
    Math.floor(Math.random() * (RESPONSE_TIME_MAX_MS - RESPONSE_TIME_MIN_MS + 1)) +
    RESPONSE_TIME_MIN_MS
  );
}

type MockSocketMessage =
  | {
      type: "test_result";
      test: {
        title: string;
        expected_status_code: number;
        actual_status_code: number;
      };
      status: string;
      response_time: number;
    }
  | {
      type: "run_complete";
      passed: number;
      failed: number;
      total: number;
    };

function emitMessage(socket: MockRunSocket, message: MockSocketMessage): void {
  socket.onmessage?.(
    new MessageEvent("message", {
      data: JSON.stringify(message),
    })
  );
}

export class MockRunSocket implements RunSocketLike {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockRunSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private readonly testCases: TestCase[];
  private resultIndex = 0;
  private passedCount = 0;
  private failedCount = 0;
  private connectTimer: number | undefined;
  private emitTimer: number | undefined;
  private closed = false;
  private runCompleteEmitted = false;

  constructor(_runId: string, approvedTestCases: TestCase[]) {
    this.testCases = approvedTestCases;
    this.connectTimer = window.setTimeout(() => {
      if (this.closed) {
        return;
      }

      this.readyState = MockRunSocket.OPEN;
      this.onopen?.(new Event("open"));
      this.startEmitting();
    }, CONNECT_DELAY_MS);
  }

  close(code = 1000, reason = ""): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.readyState = MockRunSocket.CLOSED;

    if (this.connectTimer !== undefined) {
      window.clearTimeout(this.connectTimer);
    }

    this.stopEmitting();

    this.onclose?.(new CloseEvent("close", { code, reason }));
  }

  private stopEmitting(): void {
    if (this.emitTimer !== undefined) {
      window.clearInterval(this.emitTimer);
      this.emitTimer = undefined;
    }
  }

  private emitRunComplete(): void {
    if (this.runCompleteEmitted) {
      return;
    }

    this.runCompleteEmitted = true;
    emitMessage(this, {
      type: "run_complete",
      passed: this.passedCount,
      failed: this.failedCount,
      total: this.testCases.length,
    });
  }

  private startEmitting(): void {
    if (this.testCases.length === 0) {
      this.emitRunComplete();
      this.close(1000, "Run complete");
      return;
    }

    this.emitTimer = window.setInterval(() => {
      if (this.closed || this.runCompleteEmitted) {
        return;
      }

      const testCase = this.testCases[this.resultIndex];
      const passed = this.resultIndex % 2 === 0;
      const status = passed ? "passed" : "failed";

      if (passed) {
        this.passedCount += 1;
      } else {
        this.failedCount += 1;
      }

      emitMessage(this, {
        type: "test_result",
        test: {
          title: testCase.title,
          expected_status_code: testCase.expected_status_code,
          actual_status_code: passed
            ? testCase.expected_status_code
            : 500,
        },
        status,
        response_time: randomResponseTimeMs(),
      });

      this.resultIndex += 1;

      if (this.resultIndex >= this.testCases.length) {
        this.stopEmitting();
        this.emitRunComplete();
        this.close(1000, "Run complete");
      }
    }, EMIT_INTERVAL_MS);
  }
}

export function createMockRunSocket(
  runId: string,
  approvedTestCases: TestCase[] = []
): MockRunSocket {
  return new MockRunSocket(runId, approvedTestCases);
}
