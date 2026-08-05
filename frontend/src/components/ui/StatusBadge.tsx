import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
  {
    variants: {
      variant: {
        happy_path: "bg-lime-cyber text-black",
        negative: "bg-fuchsia text-white",
        validation: "bg-indigo-electric text-white",
        security: "bg-fuchsia text-white glow-fuchsia",
        edge_case:
          "border border-dashed border-indigo-electric bg-indigo-electric/10 text-indigo-electric",
        passed: "bg-lime-cyber text-black",
        failed: "bg-fuchsia text-white",
        pending: "bg-zinc-600/40 text-zinc-300",
        critical: "bg-red-600/90 text-white",
        high: "bg-orange-500/90 text-black",
        medium: "bg-yellow-400/90 text-black",
        low: "bg-zinc-600/60 text-zinc-300",
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
