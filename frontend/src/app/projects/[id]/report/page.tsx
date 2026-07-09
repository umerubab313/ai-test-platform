"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { BugReportCard } from "@/components/report/BugReportCard";
import {
  EndpointAccordion,
  type ReportResult,
} from "@/components/report/EndpointAccordion";
import { SummaryBar } from "@/components/report/SummaryBar";
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
import { getReport, getReportPdfUrl } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Report } from "@/types";

function isReportResult(value: unknown): value is ReportResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.title === "string" &&
    typeof record.endpoint === "string" &&
    typeof record.method === "string" &&
    typeof record.passed === "boolean"
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg bg-indigo-electric/10" />
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-5 w-40 bg-indigo-electric/10" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-14 w-full rounded-md bg-indigo-electric/10"
          />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-32 bg-indigo-electric/10" />
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-44 w-full rounded-lg bg-indigo-electric/10"
          />
        ))}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const currentRun = useAppStore((state) => state.currentRun);
  const runId = currentRun?.id ?? "";

  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadReport = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getReport(runId);
        if (!cancelled) {
          setReport(data);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load report.");
          toast.error("Failed to load report.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [runId]);

  const results = (report?.results ?? []).filter(isReportResult);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-4">
      <div className="hidden justify-center sm:flex">
        <StepIndicator currentStep={6} variant="full" />
      </div>

      <Card className="border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
            Step 6 — Report
          </p>
          <CardTitle className="font-heading text-xl text-[#F5F5F5]">
            Test run report
          </CardTitle>
          <CardDescription className="font-body text-[#F5F5F5]/60">
            Summary, per-request results, and AI-generated bug write-ups for
            failures.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {!runId ? (
            <div className="py-8 text-center">
              <p className="font-body text-sm text-[#F5F5F5]/60">
                No completed run found. Execute tests first to view a report.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-4 border-indigo-electric/30"
              >
                <Link href={`/projects/${projectId}/execute`}>
                  Back to execute
                </Link>
              </Button>
            </div>
          ) : isLoading ? (
            <ReportSkeleton />
          ) : error || !report ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-500">
                {error ?? "Report unavailable."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SummaryBar
                  summary={report.summary}
                  coverage={report.coverage}
                  className="flex-1"
                />

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-indigo-electric/30 font-heading text-[#F5F5F5] hover:bg-indigo-electric/10 sm:w-auto"
                  >
                    <a
                      href={getReportPdfUrl(report.run_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download PDF
                    </a>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-indigo-electric/30 font-heading text-[#F5F5F5] hover:bg-indigo-electric/10 sm:w-auto"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(window.location.href)
                        .then(() => {
                          toast.success("Link copied");
                        })
                        .catch(() => {
                          toast.error("Failed to copy link.");
                        });
                    }}
                  >
                    Copy Share Link
                  </Button>
                </div>
              </div>

              <section className="space-y-3">
                <h2 className="font-heading text-sm font-semibold text-[#F5F5F5]">
                  Request results
                </h2>

                {results.length === 0 ? (
                  <p className="font-body text-sm text-[#F5F5F5]/50">
                    No request results recorded for this run.
                  </p>
                ) : (
                  <EndpointAccordion results={results} />
                )}
              </section>

              <section className="space-y-4">
                <h2 className="font-heading text-sm font-semibold text-[#F5F5F5]">
                  Bug reports
                </h2>

                {report.bug_reports.length === 0 ? (
                  <p className="font-body text-sm text-[#F5F5F5]/50">
                    No failures — no bug reports generated.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {report.bug_reports.map((bug, index) => (
                      <BugReportCard key={`${bug.title}-${index}`} bug={bug} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
