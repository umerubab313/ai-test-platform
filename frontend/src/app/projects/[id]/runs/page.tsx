"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { listRuns } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { TestRun } from "@/types";

const ITEMS_PER_PAGE = 8;

function RunsSkeleton() {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-lg bg-indigo-electric/10" />
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

      <Card className="border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
                Step 7 — Test Runs History
              </p>
              <CardTitle className="font-heading text-xl text-[#F5F5F5]">
                Project Execution History
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/execute`)}
              className="border-indigo-electric/30 font-mono text-xs text-lime-cyber hover:bg-lime-cyber/10"
            >
              + New Run
            </Button>
          </div>
          <CardDescription className="font-body text-[#F5F5F5]/60">
            List of all test execution runs for this project, ordered newest first.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <RunsSkeleton />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-500">{error}</div>
          ) : runs.length === 0 ? (
            <div className="rounded-lg border border-indigo-electric/15 bg-graphite/40 p-8 text-center">
              <p className="font-body text-sm text-[#F5F5F5]/60">
                No test runs recorded for this project yet.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-4 border-indigo-electric/30 font-heading text-xs"
              >
                <Link href={`/projects/${projectId}/execute`}>Go to Execution Step</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedRuns.map((run) => {
                  const shortHash = run.id ? run.id.slice(0, 8) : "run";
                  const status = (run.status || "pending").toLowerCase();

                  return (
                    <div
                      key={run.id}
                      onClick={() => handleSelectRun(run)}
                      className="flex flex-col gap-3 rounded-lg border border-indigo-electric/15 bg-[#1C1C1C] p-4 cursor-pointer transition-colors hover:border-indigo-electric/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs font-semibold text-lime-cyber">
                            #{shortHash}
                          </span>

                          {/* Status Pills */}
                          {status === "pending" && (
                            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[11px] px-2.5 py-0.5">
                              <Clock className="mr-1 h-3 w-3" /> PENDING
                            </Badge>
                          )}
                          {status === "running" && (
                            <Badge className="border-lime-cyber/40 bg-lime-cyber/10 text-lime-cyber font-mono text-[11px] px-2.5 py-0.5">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin text-lime-cyber" /> RUNNING
                            </Badge>
                          )}
                          {status === "completed" && (
                            <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] px-2.5 py-0.5">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> COMPLETED
                            </Badge>
                          )}
                          {status === "failed" && (
                            <Badge className="border-red-500/40 bg-red-500/10 text-red-400 font-mono text-[11px] px-2.5 py-0.5">
                              <XCircle className="mr-1 h-3 w-3" /> FAILED
                            </Badge>
                          )}
                        </div>

                        <p className="font-mono text-xs text-[#F5F5F5]/60 flex items-center gap-1.5 mt-1">
                          <Clock className="h-3.5 w-3.5 text-[#F5F5F5]/40" />
                          {formatTriggerTime(run.executed_at)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="font-mono text-xs text-right space-x-3">
                          <span className="text-lime-cyber">{run.passed} passed</span>
                          <span className="text-fuchsia">{run.failed} failed</span>
                          <span className="text-[#F5F5F5]/50">({run.total_tests} total)</span>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRun(run);
                          }}
                          className="border-indigo-electric/30 font-mono text-xs text-[#F5F5F5] hover:bg-indigo-electric/10"
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-indigo-electric/15">
                  <p className="font-mono text-xs text-[#F5F5F5]/50">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="border-indigo-electric/30 font-mono text-xs"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="border-indigo-electric/30 font-mono text-xs"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
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
