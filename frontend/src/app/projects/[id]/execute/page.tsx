"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { LiveFeed } from "@/components/execution/LiveFeed";
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
      status: "completed",
      total_tests: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped: Math.max(0, summary.total - summary.passed - summary.failed),
    });
  }, [isComplete, summary, currentRun, setRunResult]);

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
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
            Step 5 — Execute Tests
          </p>
          <CardTitle className="font-heading text-xl text-[#F5F5F5]">
            Live execution
          </CardTitle>
          <CardDescription className="font-body text-[#F5F5F5]/60">
            Newman results stream in over WebSocket as each approved test case
            completes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
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
