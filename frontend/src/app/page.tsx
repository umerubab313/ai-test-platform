import Link from "next/link";
import { Activity, ScanSearch, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Smart Parsing",
    description:
      "Upload a ZIP or GitHub repo. Framework-aware parsers extract routes, methods, and auth requirements into a structured endpoint map.",
    icon: ScanSearch,
    iconClass: "text-indigo-electric",
    iconBg: "bg-indigo-electric/10",
    borderClass: "border-indigo-electric/20",
  },
  {
    title: "AI Test Generation",
    description:
      "Gemini and Claude generate happy-path, negative, validation, security, and edge-case tests from your ticket and live API surface.",
    icon: Sparkles,
    iconClass: "text-fuchsia",
    iconBg: "bg-fuchsia/10",
    borderClass: "border-fuchsia/20",
  },
  {
    title: "Live Execution",
    description:
      "Approved cases run via Newman with WebSocket streaming. Watch pass/fail roll in, then export PDF reports with bug write-ups.",
    icon: Activity,
    iconClass: "text-lime-cyber",
    iconBg: "bg-lime-cyber/10",
    borderClass: "border-lime-cyber/20",
  },
] as const;

export default function HomePage() {
  return (
    <div className="-my-6 flex min-w-0 flex-col overflow-x-hidden">
      <section className="flex min-h-[calc(100vh-3rem)] flex-col justify-center border-b border-indigo-electric/10 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-indigo-electric">
            AI-Powered API Test Automation
          </p>

          <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight text-[#F5F5F5] sm:text-5xl lg:text-6xl">
            Ship API tests in minutes, not hours
          </h1>

          <p className="mt-6 max-w-2xl font-body text-base leading-relaxed text-[#F5F5F5]/70 sm:text-lg">
            Point at your Laravel, FastAPI, or Spring Boot codebase. Describe a
            ticket. Get generated Postman-ready test cases, execute them against
            your base URL, and ship coverage reports — without hand-writing
            boilerplate assertions.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-lime-cyber font-heading font-semibold text-black transition-shadow hover:bg-lime-cyber/90 hover:glow-lime"
            >
              <Link href="/projects/new">New Project</Link>
            </Button>

            <span className="hidden font-mono text-xs text-[#F5F5F5]/40 sm:inline">
              POST /projects → parse → generate → run
            </span>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-[#F5F5F5]/80">
            Pipeline
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#F5F5F5]/30">
            3 stages · zero manual scaffolding
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`rounded-lg border bg-[#1C1C1C]/80 p-5 ${feature.borderClass}`}
            >
              <div
                className={`mb-4 inline-flex rounded-md border p-2.5 ${feature.iconBg} ${feature.borderClass}`}
              >
                <feature.icon className={`h-5 w-5 ${feature.iconClass}`} />
              </div>

              <h3 className="font-heading text-base font-semibold text-[#F5F5F5]">
                {feature.title}
              </h3>

              <p className="mt-2 font-body text-sm leading-relaxed text-[#F5F5F5]/60">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
