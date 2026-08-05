import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BugReport, Severity } from "@/types";

export interface BugReportCardProps {
  bug: BugReport;
  className?: string;
}

function isSeverity(value: string): value is Severity {
  return ["critical", "high", "medium", "low"].includes(value);
}

function resultsDiffer(expected: string, actual: string): boolean {
  return expected.trim() !== actual.trim();
}

export function BugReportCard({ bug, className }: BugReportCardProps) {
  const severityVariant = isSeverity(bug.severity) ? bug.severity : "medium";
  const actualDiffers = resultsDiffer(bug.expected_result, bug.actual_result);

  return (
    <Card
      className={cn(
        "w-full border border-status-fail/20",
        className
      )}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="break-words font-heading text-base">
            {bug.title}
          </CardTitle>
          <StatusBadge variant={severityVariant} />
        </div>
        {bug.summary ? (
          <p className="font-body text-sm text-muted-foreground">{bug.summary}</p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Steps to reproduce
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 font-body text-sm text-muted-foreground">
            {bug.steps_to_reproduce.map((step, index) => (
              <li key={`${index}-${step.slice(0, 24)}`}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-indigo-electric/20 bg-muted/40 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Expected
            </p>
            <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
              {bug.expected_result}
            </p>
          </div>

          <div
            className={cn(
              "rounded-md border bg-muted/40 p-3",
              actualDiffers
                ? "border-status-fail/30 bg-status-fail/5"
                : "border-indigo-electric/20"
            )}
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Actual
            </p>
            <p
              className={cn(
                "mt-2 whitespace-pre-wrap font-mono text-xs",
                actualDiffers ? "text-status-fail" : "text-muted-foreground"
              )}
            >
              {bug.actual_result}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
