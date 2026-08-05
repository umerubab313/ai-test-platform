"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/EmptyState";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listRuns } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { TestRun } from "@/types";

const ITEMS_PER_PAGE = 8;

function RunsSkeleton() {
  return (
    <div className="space-y-3 py-4" role="status" aria-label="Loading runs">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function formatTriggerTime(executedAt?: string): string {
  if (!executedAt) {
    return "Recently";
  }
  try {
    return new Date(executedAt).toLocaleString();
  } catch {
    return executedAt;
  }
}

function RunStatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <StatusBadge variant="pending" className="gap-1 px-2.5 py-0.5 text-[11px]">
        <Clock className="h-3 w-3" /> PENDING
      </StatusBadge>
    );
  }
  if (status === "running") {
    return (
      <StatusBadge variant="running" className="gap-1 px-2.5 py-0.5 text-[11px]">
        <Loader2 className="h-3 w-3 animate-spin" /> RUNNING
      </StatusBadge>
    );
  }
  if (status === "completed") {
    return (
      <StatusBadge variant="completed" className="gap-1 px-2.5 py-0.5 text-[11px]">
        <CheckCircle2 className="h-3 w-3" /> COMPLETED
      </StatusBadge>
    );
  }
  if (status === "failed") {
    return (
      <StatusBadge variant="failed" className="gap-1 px-2.5 py-0.5 text-[11px]">
        <XCircle className="h-3 w-3" /> FAILED
      </StatusBadge>
    );
  }
  return <StatusBadge variant="pending" label={status} />;
}

export default function RunsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const setRunResult = useAppStore((state) => state.setRunResult);

  const [runs, setRuns] = useState<TestRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchRuns = async () => {
    try {
      const data = await listRuns(projectId);
      setRuns(data);
      setError(null);
    } catch {
      setError("Failed to load test runs.");
      toast.error("Failed to load test runs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    void fetchRuns();

    const intervalId = window.setInterval(() => {
      void fetchRuns();
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [projectId]);

  const handleSelectRun = (run: TestRun) => {
    setRunResult(run);
    router.push(`/projects/${projectId}/report`);
  };

  const totalPages = Math.max(1, Math.ceil(runs.length / ITEMS_PER_PAGE));
  const paginatedRuns = runs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-4">
      <div className="hidden justify-center sm:flex">
        <StepIndicator currentStep={7} variant="full" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="page-eyebrow">Step 7 — Test Runs History</p>
              <CardTitle className="font-heading text-xl text-foreground">
                Project Execution History
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/execute`)}
              className="font-mono text-xs text-status-success hover:bg-status-success/10"
            >
              + New Run
            </Button>
          </div>
          <CardDescription className="font-body text-muted-foreground">
            List of all test execution runs for this project, ordered newest first.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <RunsSkeleton />
          ) : error ? (
            <div className="py-8 text-center text-sm text-status-fail">{error}</div>
          ) : runs.length === 0 ? (
            <EmptyState
              message="No test runs recorded for this project yet."
              action={
                <Button asChild variant="outline" className="font-heading text-xs">
                  <Link href={`/projects/${projectId}/execute`}>
                    Go to Execution Step
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="space-y-3">
                {paginatedRuns.map((run) => {
                  const shortHash = run.id ? run.id.slice(0, 8) : "run";
                  const status = (run.status || "pending").toLowerCase();

                  return (
                    <div
                      key={run.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectRun(run)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectRun(run);
                        }
                      }}
                      className="interactive-focus flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-indigo-electric/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs font-semibold text-status-success">
                            #{shortHash}
                          </span>
                          <RunStatusBadge status={status} />
                        </div>

                        <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTriggerTime(run.executed_at)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="space-x-3 text-right font-mono text-xs">
                          <span className="text-status-success">
                            {run.passed} passed
                          </span>
                          <span className="text-status-fail">
                            {run.failed} failed
                          </span>
                          <span className="text-muted-foreground">
                            ({run.total_tests} total)
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRun(run);
                          }}
                          className="font-mono text-xs"
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <p className="font-mono text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="font-mono text-xs"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="font-mono text-xs"
                    >
                      Next <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
