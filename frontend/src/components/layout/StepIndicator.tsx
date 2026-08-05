"use client";

import { Check } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import {
  TOTAL_WORKFLOW_STEPS,
  WORKFLOW_STEPS,
  type WorkflowStep,
} from "@/lib/workflow-steps";
import { cn } from "@/lib/utils";

export type StepNumber = WorkflowStep;

export interface StepIndicatorProps {
  currentStep: StepNumber;
  variant?: "responsive" | "compact" | "full";
  className?: string;
}

interface CompactStepIndicatorProps {
  currentStep: StepNumber;
  className?: string;
}

function CompactStepIndicator({
  currentStep,
  className,
}: CompactStepIndicatorProps) {
  const progress = (currentStep / TOTAL_WORKFLOW_STEPS) * 100;

  return (
    <div
      className={cn("w-full space-y-1.5", className)}
      aria-label={`Step ${currentStep} of ${TOTAL_WORKFLOW_STEPS}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-lime-cyber">
        Step {currentStep} of {TOTAL_WORKFLOW_STEPS}
      </p>
      <Progress
        value={progress}
        className="h-1.5 bg-indigo-electric/20 [&>div]:bg-lime-cyber"
      />
    </div>
  );
}

import Link from "next/link";
import { usePathname } from "next/navigation";

interface FullStepIndicatorProps {
  currentStep: StepNumber;
  className?: string;
}

function FullStepIndicator({ currentStep, className }: FullStepIndicatorProps) {
  const pathname = usePathname();
  const match = pathname?.match(/^\/projects\/([^/]+)/);
  const projectId = match ? match[1] : null;

  const getStepHref = (id: number): string => {
    if (id === 1) return "/projects/new";
    if (!projectId || projectId === "new") return "#";
    const segmentMap: Record<number, string> = {
      2: "upload",
      3: "ticket",
      4: "review",
      5: "execute",
      6: "report",
      7: "runs",
    };
    return `/projects/${projectId}/${segmentMap[id] ?? ""}`;
  };

  return (
    <ol
      className={cn("flex items-center", className)}
      aria-label="Workflow progress"
    >
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isLast = index === WORKFLOW_STEPS.length - 1;
        const href = getStepHref(step.id);
        const isClickable = href !== "#";

        const content = (
          <div className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                isCompleted &&
                  "border-indigo-electric bg-indigo-electric text-white",
                isCurrent &&
                  "border-lime-cyber bg-lime-cyber/15 text-lime-cyber glow-lime",
                !isCompleted &&
                  !isCurrent &&
                  "border-zinc-600 bg-zinc-800/60 text-zinc-500"
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isCurrent ? "bg-lime-cyber" : "bg-zinc-500"
                  )}
                />
              )}
            </div>

            <span
              className={cn(
                "font-mono text-[9px] uppercase tracking-wide sm:text-[10px]",
                isCurrent && "font-medium text-lime-cyber",
                isCompleted && "text-indigo-electric",
                !isCompleted && !isCurrent && "text-zinc-500"
              )}
            >
              {step.label}
            </span>
          </div>
        );

        return (
          <li key={step.id} className="flex items-center">
            {isClickable ? (
              <Link href={href}>{content}</Link>
            ) : (
              content
            )}

            {!isLast ? (
              <div
                className={cn(
                  "mx-1.5 h-px w-4 sm:mx-2 sm:w-8",
                  step.id < currentStep ? "bg-indigo-electric" : "bg-zinc-700"
                )}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function StepIndicator({
  currentStep,
  variant = "responsive",
  className,
}: StepIndicatorProps) {
  if (variant === "compact") {
    return (
      <CompactStepIndicator currentStep={currentStep} className={className} />
    );
  }

  if (variant === "full") {
    return <FullStepIndicator currentStep={currentStep} className={className} />;
  }

  return (
    <div className={cn("w-full", className)}>
      <CompactStepIndicator
        currentStep={currentStep}
        className="mx-auto max-w-xs sm:hidden"
      />
      <FullStepIndicator
        currentStep={currentStep}
        className="hidden justify-center sm:flex"
      />
    </div>
  );
}
