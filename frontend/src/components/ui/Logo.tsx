import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-heading text-base font-bold tracking-tight sm:text-lg",
        className
      )}
      role="img"
      aria-label="AI Test"
    >
      <span className="text-lime-cyber">AI</span>
      <span className="text-indigo-electric">TEST</span>
      <svg
        className="ml-1 inline-block h-[1em] w-[0.35em] shrink-0 self-center"
        viewBox="0 0 4 20"
        fill="none"
        aria-hidden="true"
      >
        <rect width="4" height="20" fill="#FF2E9A">
          <animate
            attributeName="opacity"
            values="1;0;1"
            dur="1s"
            repeatCount="indefinite"
          />
        </rect>
      </svg>
    </span>
  );
}
