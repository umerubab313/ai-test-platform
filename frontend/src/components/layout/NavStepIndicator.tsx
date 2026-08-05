"use client";

import { usePathname } from "next/navigation";

import { StepIndicator } from "@/components/layout/StepIndicator";
import { getStepFromPathname } from "@/lib/workflow-steps";

export function NavStepIndicator() {
  const pathname = usePathname();
  const currentStep = getStepFromPathname(pathname);

  if (!currentStep) {
    return null;
  }

  return (
    <>
      <StepIndicator
        currentStep={currentStep}
        variant="compact"
        className="max-w-[9.5rem] sm:hidden"
      />
      <StepIndicator
        currentStep={currentStep}
        variant="full"
        className="hidden sm:flex"
      />
    </>
  );
}
