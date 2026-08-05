import { cn } from "@/lib/utils";
import type { ReportCoverage, ReportSummary } from "@/types";

export interface SummaryBarProps {
  summary: ReportSummary;
  coverage: ReportCoverage;
  className?: string;
}

interface StatTileProps {
  label: string;
  value: string;
  accentClass: string;
  valueClass: string;
}

function StatTile({ label, value, accentClass, valueClass }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/60 p-4",
        accentClass
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 font-heading text-2xl font-bold", valueClass)}>
        {value}
      </p>
    </div>
  );
}

function formatAvgResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

export function SummaryBar({ summary, coverage, className }: SummaryBarProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-4",
        className
      )}
    >
      <StatTile
        label="Passed"
        value={String(summary.passed)}
        accentClass="border-status-success/30"
        valueClass="text-status-success"
      />
      <StatTile
        label="Failed"
        value={String(summary.failed)}
        accentClass="border-status-fail/30"
        valueClass="text-status-fail"
      />
      <StatTile
        label="Coverage"
        value={`${coverage.pct.toFixed(1)}%`}
        accentClass="border-indigo-electric/30"
        valueClass="text-indigo-electric"
      />
      <StatTile
        label="Avg response"
        value={formatAvgResponseTime(summary.avg_ms)}
        accentClass="border-border"
        valueClass="font-mono text-foreground"
      />
    </div>
  );
}
