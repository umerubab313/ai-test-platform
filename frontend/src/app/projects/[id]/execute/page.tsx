"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { LiveFeed } from "@/components/execution/LiveFeed";
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
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRunSocket } from "@/lib/websocket";
import { useAppStore } from "@/lib/store";

export default function ExecutePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const currentRun = useAppStore((state) => state.currentRun);
  const testCases = useAppStore((state) => state.testCases);
  const setRunResult = useAppStore((state) => state.setRunResult);

  const runId = currentRun?.id ?? "";
  const approvedTestCases = useMemo(
    () => testCases.filter((testCase) => testCase.approved),
    [testCases]
  );
  const { results, isComplete, summary, isConnected, isReconnecting, error } =
    useRunSocket(runId, approvedTestCases);

  const approvedTotal = approvedTestCases.length;

  const passedCount = useMemo(() => {
    if (summary) {
      return summary.passed;
    }

    return results.filter((result) => result.status.toLowerCase() === "passed")
      .length;
  }, [results, summary]);

  const failedCount = useMemo(() => {
    if (summary) {
      return summary.failed;
    }

    return results.filter((result) => result.status.toLowerCase() === "failed")
      .length;
  }, [results, summary]);

  const totalCount = summary?.total ?? (approvedTotal || results.length);
  const completedCount = summary?.total ?? results.length;
  const progressValue =
    totalCount > 0 ? Math.min(100, (completedCount / totalCount) * 100) : 0;

  const statusState = useMemo(() => {
    if (error && !isReconnecting && !isComplete) return "FAILED";
    if (isComplete) return failedCount > 0 ? "FAILED" : "COMPLETED";
    if (isConnected) return "RUNNING";
    return "PENDING";
  }, [error, isReconnecting, isComplete, failedCount, isConnected]);

  const runCompletionSyncedRef = useRef(false);

  useEffect(() => {
    runCompletionSyncedRef.current = false;
  }, [runId]);

  useEffect(() => {
    if (
      !isComplete ||
      !summary ||
      !currentRun ||
      currentRun.status === "completed" ||
      runCompletionSyncedRef.current
    ) {
      return;
    }

    runCompletionSyncedRef.current = true;
    setRunResult({
      ...currentRun,
      status: failedCount > 0 ? "failed" : "completed",
      total_tests: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped: Math.max(0, summary.total - summary.passed - summary.failed),
    });
  }, [isComplete, summary, currentRun, setRunResult, failedCount]);

  if (!currentRun) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-4">
        <div className="hidden justify-center sm:flex">
          <StepIndicator currentStep={5} variant="full" />
        </div>
        <Card>
          <CardContent className="py-4">
            <EmptyState
              message="No active run found. Start a run from the review step."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}/review`)}
                >
                  Back to review
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-4">
      <div className="hidden justify-center sm:flex">
        <StepIndicator currentStep={5} variant="full" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="page-eyebrow">Step 5 — Execute Tests</p>
              <CardTitle className="font-heading text-xl text-foreground">
                Live execution
              </CardTitle>
            </div>

            {statusState === "PENDING" && (
              <StatusBadge variant="pending" className="gap-1.5 px-3 py-1 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> PENDING
              </StatusBadge>
            )}
            {statusState === "RUNNING" && (
              <StatusBadge variant="running" className="gap-1.5 px-3 py-1 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> RUNNING
              </StatusBadge>
            )}
            {statusState === "COMPLETED" && (
              <StatusBadge variant="completed" className="gap-1.5 px-3 py-1 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" /> COMPLETED
              </StatusBadge>
            )}
            {statusState === "FAILED" && (
              <StatusBadge variant="failed" className="gap-1.5 px-3 py-1 text-xs">
                <XCircle className="h-3.5 w-3.5" /> FAILED
              </StatusBadge>
            )}
          </div>
          <CardDescription className="font-body text-muted-foreground">
            Newman results stream in over WebSocket as each approved test case
            completes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {statusState === "COMPLETED" && (
            <div className="flex items-center gap-3 rounded-md border border-status-completed/30 bg-status-completed/10 p-4 font-mono text-sm text-status-completed">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>
                Execution finished! All {totalCount} test cases executed
                successfully.
              </span>
            </div>
          )}

          {statusState === "FAILED" && (
            <div className="flex items-center gap-3 rounded-md border border-status-fail/30 bg-status-fail/10 p-4 font-mono text-sm text-status-fail">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>
                {error
                  ? `Execution error: ${error}`
                  : `Execution complete with ${failedCount} failure(s). Check logs below.`}
              </span>
            </div>
          )}

          <div className="surface-inset p-4">
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Passed
                </p>
                <p className="font-heading text-2xl font-bold text-status-success">
                  {passedCount}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Failed
                </p>
                <p className="font-heading text-2xl font-bold text-status-fail">
                  {failedCount}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total
                </p>
                <p className="font-heading text-2xl font-bold text-foreground">
                  {totalCount}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-1 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {completedCount}/{totalCount} completed
                </span>
                <span>
                  {isComplete ? (
                    "Run complete"
                  ) : isReconnecting ? (
                    <span className="inline-flex items-center gap-1.5 text-status-running">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-running" />
                      Reconnecting…
                    </span>
                  ) : isConnected ? (
                    "Connected"
                  ) : (
                    "Connecting…"
                  )}
                </span>
              </div>
              <Progress
                value={progressValue}
                className="h-2 bg-indigo-electric/20 [&>div]:bg-status-success"
              />
            </div>
          </div>

          {isReconnecting && !isComplete ? (
            <p className="flex items-center gap-2 font-mono text-xs text-status-running">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-running" />
              Reconnecting to live feed…
            </p>
          ) : null}

          {error && !isReconnecting ? (
            <p className="text-sm text-status-fail">{error}</p>
          ) : null}

          <LiveFeed results={results} isPaused={isComplete} />

          {isComplete ? (
            <Button
              asChild
              className="w-full bg-lime-cyber font-heading font-semibold text-black glow-lime hover:bg-lime-cyber/90"
            >
              <Link href={`/projects/${projectId}/report`}>View Report</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
