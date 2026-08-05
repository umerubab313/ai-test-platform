import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
  {
    variants: {
      variant: {
        happy_path: "bg-status-success text-status-success-foreground",
        negative: "bg-status-fail text-status-fail-foreground",
        validation: "bg-indigo-electric text-white",
        security: "bg-fuchsia text-white glow-fuchsia",
        edge_case:
          "border border-dashed border-indigo-electric bg-indigo-electric/10 text-indigo-electric",
        passed: "bg-status-success text-status-success-foreground",
        failed: "bg-status-fail text-status-fail-foreground",
        pending:
          "border border-status-pending/40 bg-status-pending/15 text-status-pending",
        running:
          "border border-status-running/40 bg-status-running/15 text-status-running",
        completed:
          "border border-status-completed/40 bg-status-completed/15 text-status-completed",
        critical: "bg-status-fail text-status-fail-foreground",
        high: "bg-orange-500/90 text-black",
        medium: "bg-yellow-400/90 text-black",
        low: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "pending",
    },
  }
);

export type StatusBadgeVariant = NonNullable<
  VariantProps<typeof statusBadgeVariants>["variant"]
>;

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  label?: string;
}

function formatVariantLabel(variant: StatusBadgeVariant): string {
  return variant.replace(/_/g, " ");
}

function StatusBadge({
  className,
  variant = "pending",
  label,
  children,
  ...props
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? "pending";

  return (
    <span
      className={cn(statusBadgeVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {children ?? label ?? formatVariantLabel(resolvedVariant)}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
