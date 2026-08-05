"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { LiveTestResult } from "@/lib/websocket";

export interface LiveFeedProps {
  results: LiveTestResult[];
  isPaused?: boolean;
}

function getTestName(test: unknown): string {
  if (typeof test === "object" && test !== null) {
    const record = test as Record<string, unknown>;

    if (typeof record.title === "string" && record.title.trim()) {
      return record.title;
    }

    if (typeof record.name === "string" && record.name.trim()) {
      return record.name;
    }
  }

  return "Unnamed test";
}

function getStatusCodes(test: unknown): {
  actual?: number | string;
  expected?: number | string;
} {
  if (typeof test !== "object" || test === null) {
    return {};
  }

  const record = test as Record<string, unknown>;

  return {
    actual: record.actual_status_code as number | string | undefined,
    expected: record.expected_status_code as number | string | undefined,
  };
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

function isPassed(status: string): boolean {
  return status.toLowerCase() === "passed";
}

export function LiveFeed({ results, isPaused = false }: LiveFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results.length, isPaused]);

  if (results.length === 0) {
    return <EmptyState message="Waiting for test results…" className="py-12" />;
  }

  return (
    <div
      className={cn(
        "surface-inset max-h-[28rem] space-y-2 overflow-y-auto p-2",
        isPaused && "opacity-90"
      )}
    >
      {results.map((result, index) => {
        const passed = isPassed(result.status);
        const failed = !passed;
        const expanded = expandedIndex === index;
        const testName = getTestName(result.test);
        const { actual, expected } = getStatusCodes(result.test);

        return (
          <div
            key={`${testName}-${index}`}
            className={cn(
              "rounded-md border border-border bg-card/80 transition-colors",
              failed && "border-status-fail/25 bg-status-fail/10",
              failed && "cursor-pointer hover:bg-status-fail/15"
            )}
          >
            <button
              type="button"
              onClick={() => {
                if (!failed) {
                  return;
                }
                setExpandedIndex(expanded ? null : index);
              }}
              className={cn(
                "interactive-focus flex w-full flex-col gap-2 rounded-md px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between",
                !failed && "cursor-default sm:cursor-default"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm text-foreground">
                  {testName}
                </p>
              </div>

              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                <StatusBadge variant={passed ? "passed" : "failed"} />
                <span className="font-mono text-xs text-muted-foreground">
                  {formatResponseTime(result.response_time)}
                </span>
                {failed ? (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-status-fail transition-transform",
                      expanded && "rotate-180"
                    )}
                  />
                ) : null}
              </div>
            </button>

            {failed && expanded ? (
              <div className="border-t border-status-fail/20 px-4 py-3 font-mono text-xs text-foreground/90">
                <p>
                  Expected status:{" "}
                  <span className="text-status-success">
                    {expected ?? "—"}
                  </span>
                </p>
                <p className="mt-1">
                  Actual status:{" "}
                  <span className="text-status-fail">{actual ?? "—"}</span>
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
