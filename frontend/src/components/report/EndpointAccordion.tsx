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
      className={cn(
        "rounded-lg border border-indigo-electric/20 bg-graphite/40 px-4",
        className
      )}
    >
      {endpointGroups.map((group) => (
        <AccordionItem
          key={group.id}
          value={group.id}
          className="border-indigo-electric/10"
        >
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex w-full flex-col gap-2 pr-2 text-left sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-all font-mono text-xs text-[#F5F5F5] sm:truncate sm:text-sm">
                <span className="text-indigo-electric">{group.method}</span>{" "}
                {group.endpoint}
              </p>
              <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                <span className="text-lime-cyber">{group.passedCount} passed</span>
                <span className="text-[#F5F5F5]/30">·</span>
                <span className="text-fuchsia">{group.failedCount} failed</span>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <ul className="space-y-3">
              {group.tests.map((test, index) => (
                <li
                  key={`${test.title}-${index}`}
                  className={cn(
                    "flex flex-col gap-2 rounded-md border border-indigo-electric/10 bg-[#1C1C1C]/80 p-3",
                    !test.passed && "border-fuchsia/20 bg-fuchsia/5"
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium text-[#F5F5F5]">
                        {test.title}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-[#F5F5F5]/50">
                        Status{" "}
                        <span
                          className={
                            test.passed ? "text-lime-cyber" : "text-fuchsia"
                          }
                        >
                          {test.status_code ?? "—"}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge variant={test.passed ? "passed" : "failed"} />
                      <span className="font-mono text-xs text-[#F5F5F5]/60">
                        {formatResponseTime(test.response_time_ms)}
                      </span>
                    </div>
                  </div>

                  {/* Assertion Level Details */}
                  {test.assertions && test.assertions.length > 0 ? (
                    <div className="mt-2 space-y-1.5 border-t border-indigo-electric/10 pt-2 font-mono text-xs">
                      <p className="text-[10px] uppercase tracking-wider text-[#F5F5F5]/40">
                        Assertions ({test.assertions.length})
                      </p>
                      {test.assertions.map((a, aIdx) => (
                        <div
                          key={`${a.name}-${aIdx}`}
                          className="flex items-start justify-between gap-2 rounded bg-graphite/60 px-2 py-1"
                        >
                          <span className={a.passed ? "text-lime-cyber" : "text-fuchsia"}>
                            {a.passed ? "✓" : "✗"} {a.name}
                          </span>
                          {a.error ? (
                            <span className="text-fuchsia/80 text-[11px] truncate max-w-xs">
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

