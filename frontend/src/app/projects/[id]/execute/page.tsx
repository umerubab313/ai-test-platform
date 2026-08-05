"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { LiveFeed } from "@/components/execution/LiveFeed";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

  // Determine current execution status
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
        <Card className="border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
          <CardContent className="py-12 text-center">
            <p className="font-body text-sm text-[#F5F5F5]/60">
              No active run found. Start a run from the review step.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/review`)}
              className="mt-4 border-indigo-electric/30"
            >
              Back to review
            </Button>
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

      <Card className="border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
                Step 5 — Execute Tests
              </p>
              <CardTitle className="font-heading text-xl text-[#F5F5F5]">
                Live execution
              </CardTitle>
            </div>

            {/* Execution State Badges */}
            {statusState === "PENDING" && (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-xs flex items-center gap-1.5 px-3 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> PENDING
              </Badge>
            )}
            {statusState === "RUNNING" && (
              <Badge className="border-lime-cyber/40 bg-lime-cyber/10 text-lime-cyber font-mono text-xs flex items-center gap-1.5 px-3 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-lime-cyber" /> RUNNING
              </Badge>
            )}
            {statusState === "COMPLETED" && (
              <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-xs flex items-center gap-1.5 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> COMPLETED
              </Badge>
            )}
            {statusState === "FAILED" && (
              <Badge className="border-red-500/40 bg-red-500/10 text-red-400 font-mono text-xs flex items-center gap-1.5 px-3 py-1">
                <XCircle className="h-3.5 w-3.5" /> FAILED
              </Badge>
            )}
          </div>
          <CardDescription className="font-body text-[#F5F5F5]/60">
            Newman results stream in over WebSocket as each approved test case
            completes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Banners */}
          {statusState === "COMPLETED" && (
            <div className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 font-mono text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Execution finished! All {totalCount} test cases executed successfully.</span>
            </div>
          )}

          {statusState === "FAILED" && (
            <div className="flex items-center gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-red-300 font-mono text-sm">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>
                {error ? `Execution error: ${error}` : `Execution complete with ${failedCount} failure(s). Check logs below.`}
              </span>
            </div>
          )}

          <div className="rounded-lg border border-indigo-electric/20 bg-graphite/60 p-4">
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#F5F5F5]/50">
                  Passed
                </p>
                <p className="font-heading text-2xl font-bold text-lime-cyber">
                  {passedCount}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#F5F5F5]/50">
                  Failed
                </p>
                <p className="font-heading text-2xl font-bold text-fuchsia">
                  {failedCount}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#F5F5F5]/50">
                  Total
                </p>
                <p className="font-heading text-2xl font-bold text-[#F5F5F5]">
                  {totalCount}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-1 font-mono text-xs text-[#F5F5F5]/60 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {completedCount}/{totalCount} completed
                </span>
                <span>
                  {isComplete ? (
                    "Run complete"
                  ) : isReconnecting ? (
                    <span className="inline-flex items-center gap-1.5 text-lime-cyber">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-cyber" />
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
                className="h-2 bg-indigo-electric/20 [&>div]:bg-lime-cyber"
              />
            </div>
          </div>

          {isReconnecting && !isComplete ? (
            <p className="flex items-center gap-2 font-mono text-xs text-lime-cyber/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-cyber" />
              Reconnecting to live feed…
            </p>
          ) : null}

          {error && !isReconnecting ? (
            <p className="text-sm text-red-500">{error}</p>
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

