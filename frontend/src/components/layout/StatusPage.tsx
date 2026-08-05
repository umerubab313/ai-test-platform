import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatusPageProps {
  eyebrow: string;
  title: string;
  description: string;
  action: ReactNode;
  className?: string;
}

export function StatusPage({
  eyebrow,
  title,
  description,
  action,
  className,
}: StatusPageProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col items-center py-16 sm:py-24",
        className
      )}
    >
      <Card className="w-full border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
        <CardHeader className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
            {eyebrow}
          </p>
          <CardTitle className="font-heading text-2xl text-[#F5F5F5]">
            {title}
          </CardTitle>
          <CardDescription className="font-body text-[#F5F5F5]/60">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">{action}</CardContent>
      </Card>
    </div>
  );
}
