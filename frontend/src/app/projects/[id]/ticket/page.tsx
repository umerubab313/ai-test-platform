"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { StepIndicator } from "@/components/layout/StepIndicator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTicket,
  generateTestCases,
  getProject,
  getTicket,
  listTestCases,
} from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { TestCase } from "@/types";

const GENERATION_MESSAGES = [
  "Reading endpoint map...",
  "Drafting happy path tests...",
  "Covering edge cases...",
  "Writing security scenarios...",
  "Validating negative paths...",
] as const;

const GENERATION_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 2_000;
const MESSAGE_INTERVAL_MS = 4_000;

interface FormErrors {
  title?: string;
  description?: string;
}

function mapTestCasesForStore(
  ticketId: string,
  testCases: TestCase[]
): TestCase[] {
  return testCases.map((testCase) => ({
    id: testCase.id,
    ticket_id: ticketId,
    type: testCase.type,
    title: testCase.title,
    endpoint: testCase.endpoint,
    method: testCase.method ?? "GET",
    input_payload: testCase.input_payload ?? null,
    headers: testCase.headers ?? null,
    expected_status_code: testCase.expected_status_code,
    expected_response_contains: testCase.expected_response_contains ?? null,
    assertion_notes: testCase.assertion_notes ?? null,
    approved: testCase.approved ?? false,
  }));
}

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const setProject = useAppStore((state) => state.setProject);
  const setTestCases = useAppStore((state) => state.setTestCases);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const [isGenerating, setIsGenerating] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [generationError, setGenerationError] = useState<string>();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const isGeneratingRef = useRef(false);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const project = useAppStore.getState().project;
    if (project?.id === projectId) {
      return;
    }

    getProject(projectId)
      .then(setProject)
      .catch(() => {
        toast.error("Failed to load project.");
      });
  }, [projectId, setProject]);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % GENERATION_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isGenerating]);

  useEffect(() => {
    if (!activeTicketId || !isGenerating) {
      return;
    }

    let cancelled = false;

    const finishGeneration = async (ticketId: string) => {
      const ticket = await getTicket(ticketId);
      const result = await listTestCases(ticketId);

      setTestCases(mapTestCasesForStore(ticketId, result.test_cases));
      useAppStore.setState({ ticket });
      setIsGenerating(false);
      router.push(`/projects/${projectId}/review`);
    };

    const poll = async () => {
      try {
        const result = await listTestCases(activeTicketId);

        if (cancelled) {
          return true;
        }

        if (result.status === "completed") {
          await finishGeneration(activeTicketId);
          return true;
        }

        return false;
      } catch {
        if (!cancelled) {
          setGenerationError("Failed to check generation status.");
          setIsGenerating(false);
        }
        return true;
      }
    };

    const pollIntervalId = window.setInterval(async () => {
      const done = await poll();
      if (done) {
        window.clearInterval(pollIntervalId);
      }
    }, POLL_INTERVAL_MS);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled && isGeneratingRef.current) {
        setGenerationError("Generation timed out after 30 seconds.");
        setIsGenerating(false);
        window.clearInterval(pollIntervalId);
      }
    }, GENERATION_TIMEOUT_MS);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(pollIntervalId);
      window.clearTimeout(timeoutId);
    };
  }, [activeTicketId, isGenerating, projectId, router, setTestCases]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!title.trim()) {
      nextErrors.title = "Title is required.";
    }
    if (!description.trim()) {
      nextErrors.description = "Description is required.";
    }

    setErrors(nextErrors);
    setGenerationError(undefined);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsGenerating(true);
    setMessageIndex(0);
    setActiveTicketId(null);

    try {
      const created = await createTicket(projectId, {
        title: title.trim(),
        description: description.trim(),
        acceptance_criteria: acceptanceCriteria.trim() || null,
      });

      await generateTestCases(created.ticket_id);
      setActiveTicketId(created.ticket_id);
    } catch {
      setIsGenerating(false);
      setActiveTicketId(null);
      toast.error(
        "Failed to create ticket or start generation. Ensure the codebase was uploaded."
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 py-4">
      <div className="hidden justify-center sm:flex">
        <StepIndicator currentStep={3} variant="full" />
      </div>

      <Card className="border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
            Step 3 — Create Ticket
          </p>
          <CardTitle className="font-heading text-xl text-[#F5F5F5]">
            Describe what to test
          </CardTitle>
          <CardDescription className="font-body text-[#F5F5F5]/60">
            Write a ticket in plain language. AI will generate API test cases
            from your endpoint map and acceptance criteria.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-lime-cyber" />
              <p className="font-mono text-sm text-[#F5F5F5]/80">
                {GENERATION_MESSAGES[messageIndex]}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="title" className="font-body text-[#F5F5F5]/80">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="User can reset password via email link"
                  className="border-indigo-electric/20 bg-graphite font-body text-sm"
                  aria-invalid={Boolean(errors.title)}
                />
                {errors.title ? (
                  <p className="text-sm text-red-500">{errors.title}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="font-body text-[#F5F5F5]/80"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="As a user, I want to request a password reset so that I can regain access to my account..."
                  className="min-h-[150px] resize-y border-indigo-electric/20 bg-graphite font-body text-sm"
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description ? (
                  <p className="text-sm text-red-500">{errors.description}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="acceptance_criteria"
                  className="font-body text-[#F5F5F5]/80"
                >
                  Acceptance criteria{" "}
                  <span className="text-[#F5F5F5]/40">(Optional)</span>
                </Label>
                <Textarea
                  id="acceptance_criteria"
                  value={acceptanceCriteria}
                  onChange={(event) =>
                    setAcceptanceCriteria(event.target.value)
                  }
                  placeholder="POST /auth/reset returns 202 for valid email; returns 422 for unknown format..."
                  className="min-h-[100px] resize-y border-indigo-electric/20 bg-graphite font-body text-sm"
                />
              </div>

              {generationError ? (
                <p className="text-sm text-red-500">{generationError}</p>
              ) : null}

              <Button
                type="submit"
                className="w-full bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90 hover:glow-lime"
              >
                Generate test cases
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
