"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { StepIndicator } from "@/components/layout/StepIndicator";
import { TestCaseCard } from "@/components/test-cases/TestCaseCard";
import { TestCaseEditModal } from "@/components/test-cases/TestCaseEditModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  approveTestCase as approveTestCaseApi,
  triggerRun,
} from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { TestCase, TestCaseType } from "@/types";

const TEST_CASE_TABS: { value: TestCaseType; label: string }[] = [
  { value: "happy_path", label: "Happy Path" },
  { value: "negative", label: "Negative" },
  { value: "validation", label: "Validation" },
  { value: "security", label: "Security" },
  { value: "edge_case", label: "Edge Case" },
];

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const testCases = useAppStore((state) => state.testCases);
  const ticket = useAppStore((state) => state.ticket);
  const approveTestCase = useAppStore((state) => state.approveTestCase);
  const setRunResult = useAppStore((state) => state.setRunResult);

  const [activeTab, setActiveTab] = useState<TestCaseType>("happy_path");
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const groupedTestCases = useMemo(() => {
    return TEST_CASE_TABS.reduce(
      (groups, tab) => {
        groups[tab.value] = testCases.filter(
          (testCase) => testCase.type === tab.value
        );
        return groups;
      },
      {} as Record<TestCaseType, typeof testCases>
    );
  }, [testCases]);

  const handleApprove = async (testCaseId: string) => {
    try {
      await approveTestCaseApi(testCaseId);
      approveTestCase(testCaseId);
    } catch {
      toast.error("Failed to approve test case.");
      throw new Error("approve failed");
    }
  };

  const handleApproveAll = async () => {
    const unapproved = testCases.filter((testCase) => !testCase.approved);

    if (unapproved.length === 0) {
      return;
    }

    setIsApprovingAll(true);

    try {
      await Promise.all(
        unapproved.map(async (testCase) => {
          await approveTestCaseApi(testCase.id);
          approveTestCase(testCase.id);
        })
      );
      toast.success(`Approved ${unapproved.length} test cases.`);
    } catch {
      toast.error("Failed to approve all test cases.");
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleRunTests = async () => {
    if (!ticket || approvedCount === 0) {
      return;
    }

    setIsRunning(true);

    try {
      const result = await triggerRun(ticket.id);
      setRunResult({
        id: result.run_id,
        ticket_id: ticket.id,
        status: "running",
        total_tests: approvedCount,
        passed: 0,
        failed: 0,
        skipped: 0,
        avg_response_time_ms: 0,
      });
      router.push(`/projects/${projectId}/execute`);
    } catch {
      toast.error("Failed to start test run. Approve at least one test case.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleEdit = (testCase: TestCase) => {
    setEditingTestCase(testCase);
    setEditModalOpen(true);
  };

  const approvedCount = testCases.filter((testCase) => testCase.approved).length;
  const totalCount = testCases.length;
  const canRunTests = approvedCount > 0;
  const hasUnapproved = testCases.some((testCase) => !testCase.approved);

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-28 py-4">
        <div className="hidden justify-center sm:flex">
          <StepIndicator currentStep={4} variant="full" />
        </div>

        <Card className="border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
                  Step 4 — Review Test Cases
                </p>
                <CardTitle className="font-heading text-xl text-[#F5F5F5]">
                  Review & approve
                </CardTitle>
                <CardDescription className="font-body text-[#F5F5F5]/60">
                  Inspect generated cases by scenario type. Approve the ones you
                  want included in the Newman run.
                </CardDescription>
              </div>

              {testCases.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApproveAll}
                  disabled={!hasUnapproved || isApprovingAll}
                  className="border-indigo-electric/30 bg-transparent font-mono text-xs uppercase tracking-wider hover:bg-indigo-electric/10"
                >
                  {isApprovingAll ? "Approving…" : "Approve All"}
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            {testCases.length === 0 ? (
              <p className="py-8 text-center font-body text-sm text-[#F5F5F5]/60">
                No test cases in store. Generate tests from the ticket step first.
              </p>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as TestCaseType)}
              >
                <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 border border-indigo-electric/20 bg-graphite p-1">
                  {TEST_CASE_TABS.map((tab) => {
                    const count = groupedTestCases[tab.value].length;

                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="font-mono text-xs data-[state=active]:bg-indigo-electric/20 data-[state=active]:text-[#F5F5F5]"
                      >
                        {tab.label} ({count})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {TEST_CASE_TABS.map((tab) => (
                  <TabsContent
                    key={tab.value}
                    value={tab.value}
                    className="space-y-4"
                  >
                    {groupedTestCases[tab.value].length === 0 ? (
                      <p className="py-8 text-center font-mono text-sm text-[#F5F5F5]/40">
                        No {tab.label.toLowerCase()} cases generated.
                      </p>
                    ) : (
                      <div className="flex w-full flex-col gap-4">
                        {groupedTestCases[tab.value].map((testCase) => (
                          <TestCaseCard
                            key={testCase.id}
                            testCase={testCase}
                            onApprove={handleApprove}
                            onEdit={handleEdit}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        <TestCaseEditModal
          testCase={editingTestCase}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) {
              setEditingTestCase(null);
            }
          }}
        />

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-indigo-electric/20 bg-graphite/95 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="font-mono text-sm text-[#F5F5F5]/80">
              {approvedCount}/{totalCount} approved
            </p>

            {canRunTests ? (
              <Button
                type="button"
                onClick={handleRunTests}
                disabled={isRunning}
                className="w-full bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90 hover:glow-lime sm:w-auto"
              >
                {isRunning ? "Starting…" : "Run Tests"}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex w-full sm:w-auto">
                    <Button
                      type="button"
                      disabled
                      className="w-full bg-lime-cyber/40 font-heading font-semibold text-black/50 sm:w-auto"
                    >
                      Run Tests
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="border border-indigo-electric/20 bg-[#1C1C1C] text-[#F5F5F5]">
                  Approve at least one test case
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
