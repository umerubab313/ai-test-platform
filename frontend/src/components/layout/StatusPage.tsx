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
      <Card className="w-full">
        <CardHeader className="text-center">
          <p className="page-eyebrow">{eyebrow}</p>
          <CardTitle className="font-heading text-2xl text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="font-body text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">{action}</CardContent>
      </Card>
    </div>
  );
}
