import Link from "next/link";

import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex max-w-full items-center gap-2 rounded-sm font-heading tracking-tight interactive-focus",
        className
      )}
      aria-label="AI Test Platform"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia to-indigo-electric shadow-[0_0_12px_rgba(255,46,154,0.35)] sm:h-8 sm:w-8"
        aria-hidden="true"
      >
        <span className="font-mono text-[10px] font-bold leading-none text-white sm:text-xs">
          AI
        </span>
      </span>
      <span className="inline-flex min-w-0 flex-col leading-none">
        <span className="text-brand-gradient text-sm font-bold uppercase tracking-[0.04em] sm:text-base md:text-lg">
          AI Test Platform
        </span>
        <span className="mt-0.5 hidden font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
          API test automation
        </span>
      </span>
      <svg
        className="ml-0.5 hidden h-4 w-[3px] shrink-0 self-center opacity-90 sm:inline-block"
        viewBox="0 0 4 20"
        fill="none"
        aria-hidden="true"
      >
        <rect width="4" height="20" fill="hsl(var(--accent-fuchsia))">
          <animate
            attributeName="opacity"
            values="1;0;1"
            dur="1s"
            repeatCount="indefinite"
          />
        </rect>
      </svg>
    </Link>
  );
}
