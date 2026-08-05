"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TestCase } from "@/types";

export interface TestCaseCardProps {
  testCase: TestCase;
  onApprove: (id: string) => Promise<void>;
  onEdit?: (testCase: TestCase) => void;
}

function formatPayload(payload: Record<string, unknown> | null): string {
  if (!payload || Object.keys(payload).length === 0) {
    return "{}";
  }

  return JSON.stringify(payload, null, 2);
}

export function TestCaseCard({ testCase, onApprove, onEdit }: TestCaseCardProps) {
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleApproveChange = async (checked: boolean) => {
    if (!checked || testCase.approved || isApproving) {
      return;
    }

    setIsApproving(true);
    try {
      await onApprove(testCase.id);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onEdit?.(testCase)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit?.(testCase);
        }
      }}
      className={cn(
        "relative w-full cursor-pointer border border-indigo-electric/15 bg-[#1C1C1C]/80 shadow-none transition-colors hover:border-indigo-electric/30",
        "border-l-4",
        testCase.approved ? "border-l-lime-cyber" : "border-l-zinc-700"
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge variant={testCase.type} />
          <div
            className="flex items-center gap-2"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Label
              htmlFor={`approve-${testCase.id}`}
              className="font-mono text-[10px] uppercase tracking-wider text-[#F5F5F5]/50"
            >
              Approve
            </Label>
            <Switch
              id={`approve-${testCase.id}`}
              checked={testCase.approved}
              onCheckedChange={handleApproveChange}
              disabled={testCase.approved || isApproving}
              className="data-[state=checked]:bg-lime-cyber"
            />
          </div>
        </div>

        <CardTitle className="font-heading text-base font-semibold text-[#F5F5F5]">
          {testCase.title}
        </CardTitle>
        <p className="break-all font-mono text-sm text-indigo-electric">
          <span className="text-lime-cyber">{testCase.method}</span>{" "}
          {testCase.endpoint}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setPayloadOpen((open) => !open);
          }}
          className="flex w-full items-center justify-between rounded-md border border-indigo-electric/15 bg-graphite/60 px-3 py-2 text-left"
        >
          <span className="font-mono text-xs uppercase tracking-wider text-[#F5F5F5]/60">
            Payload preview
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[#F5F5F5]/50 transition-transform",
              payloadOpen && "rotate-180"
            )}
          />
        </button>

        {payloadOpen ? (
          <pre className="max-h-40 overflow-auto rounded-md border border-indigo-electric/15 bg-graphite p-3 font-mono text-xs text-[#F5F5F5]/80">
            {formatPayload(testCase.input_payload)}
          </pre>
        ) : null}

        <p className="font-mono text-xs text-[#F5F5F5]/70">
          Expected status:{" "}
          <span className="text-lime-cyber">{testCase.expected_status_code}</span>
        </p>
      </CardContent>
    </Card>
  );
}
