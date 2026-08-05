"use client";

import { useMemo } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

export interface AssertionItem {
  name: string;
  passed: boolean;
  error?: string | null;
}

export interface ReportResult {
  title: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  response_time_ms: number | null;
  passed: boolean;
  assertions?: AssertionItem[];
}

export interface EndpointAccordionProps {
  results: ReportResult[];
  className?: string;
}

interface EndpointGroup {
  id: string;
  method: string;
  endpoint: string;
  tests: ReportResult[];
  passedCount: number;
  failedCount: number;
}

function formatResponseTime(ms: number | null): string {
  if (ms === null) {
    return "—";
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

function groupResultsByEndpoint(results: ReportResult[]): EndpointGroup[] {
  const groups = new Map<string, ReportResult[]>();

  for (const result of results) {
    const key = `${result.method}:${result.endpoint}`;
    const existing = groups.get(key);

    if (existing) {
      existing.push(result);
    } else {
      groups.set(key, [result]);
    }
  }

  return Array.from(groups.entries()).map(([id, tests]) => ({
    id,
    method: tests[0].method,
    endpoint: tests[0].endpoint,
    tests,
    passedCount: tests.filter((test) => test.passed).length,
    failedCount: tests.filter((test) => !test.passed).length,
  }));
}

export function EndpointAccordion({ results, className }: EndpointAccordionProps) {
  const endpointGroups = useMemo(
    () => groupResultsByEndpoint(results),
    [results]
  );

  if (endpointGroups.length === 0) {
    return null;
  }

  return (
    <Accordion
      type="single"
      collapsible
      className={cn("surface-inset px-4", className)}
    >
      {endpointGroups.map((group) => (
        <AccordionItem
          key={group.id}
          value={group.id}
          className="border-border"
        >
          <AccordionTrigger className="interactive-focus py-3 hover:no-underline">
            <div className="flex w-full flex-col gap-2 pr-2 text-left sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-all font-mono text-xs text-foreground sm:truncate sm:text-sm">
                <span className="text-indigo-electric">{group.method}</span>{" "}
                {group.endpoint}
              </p>
              <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                <span className="text-status-success">
                  {group.passedCount} passed
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-status-fail">
                  {group.failedCount} failed
                </span>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <ul className="space-y-3">
              {group.tests.map((test, index) => (
                <li
                  key={`${test.title}-${index}`}
                  className={cn(
                    "flex flex-col gap-2 rounded-md border border-border bg-card/80 p-3",
                    !test.passed && "border-status-fail/25 bg-status-fail/5"
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium text-foreground">
                        {test.title}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        Status{" "}
                        <span
                          className={
                            test.passed
                              ? "text-status-success"
                              : "text-status-fail"
                          }
                        >
                          {test.status_code ?? "—"}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge variant={test.passed ? "passed" : "failed"} />
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatResponseTime(test.response_time_ms)}
                      </span>
                    </div>
                  </div>

                  {test.assertions && test.assertions.length > 0 ? (
                    <div className="mt-2 space-y-1.5 border-t border-border pt-2 font-mono text-xs">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Assertions ({test.assertions.length})
                      </p>
                      {test.assertions.map((a, aIdx) => (
                        <div
                          key={`${a.name}-${aIdx}`}
                          className="flex items-start justify-between gap-2 rounded bg-muted/60 px-2 py-1"
                        >
                          <span
                            className={
                              a.passed
                                ? "text-status-success"
                                : "text-status-fail"
                            }
                          >
                            {a.passed ? "✓" : "✗"} {a.name}
                          </span>
                          {a.error ? (
                            <span className="max-w-xs truncate text-[11px] text-status-fail/80">
                              {a.error}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
