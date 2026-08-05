"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateTestCase as updateTestCaseApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { TestCase } from "@/types";

export interface TestCaseEditModalProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function stringifyJson(value: Record<string, unknown> | null): string {
  if (!value || Object.keys(value).length === 0) {
    return "";
  }

  return JSON.stringify(value, null, 2);
}

function parseJsonField(
  value: string,
  fieldName: string
): { ok: true; data: Record<string, unknown> | null } | { ok: false; error: string } {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: true, data: null };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      return {
        ok: false,
        error: `${fieldName} must be a JSON object.`,
      };
    }

    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      error: `${fieldName} contains invalid JSON.`,
    };
  }
}

export function TestCaseEditModal({
  testCase,
  open,
  onOpenChange,
}: TestCaseEditModalProps) {
  const updateTestCase = useAppStore((state) => state.updateTestCase);

  const [title, setTitle] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [method, setMethod] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [expectedStatusCode, setExpectedStatusCode] = useState("");
  const [assertionNotes, setAssertionNotes] = useState("");
  const [headersError, setHeadersError] = useState<string>();
  const [payloadError, setPayloadError] = useState<string>();
  const [statusError, setStatusError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!testCase || !open) {
      return;
    }

    setTitle(testCase.title);
    setEndpoint(testCase.endpoint);
    setMethod(testCase.method);
    setHeadersText(stringifyJson(testCase.headers));
    setPayloadText(stringifyJson(testCase.input_payload));
    setExpectedStatusCode(String(testCase.expected_status_code));
    setAssertionNotes(testCase.assertion_notes ?? "");
    setHeadersError(undefined);
    setPayloadError(undefined);
    setStatusError(undefined);
  }, [testCase, open]);

  const headersPreview = useMemo(() => parseJsonField(headersText, "Headers"), [headersText]);
  const payloadPreview = useMemo(
    () => parseJsonField(payloadText, "Input payload"),
    [payloadText]
  );

  const handleHeadersChange = (value: string) => {
    setHeadersText(value);
    const result = parseJsonField(value, "Headers");
    setHeadersError(result.ok ? undefined : result.error);
  };

  const handlePayloadChange = (value: string) => {
    setPayloadText(value);
    const result = parseJsonField(value, "Input payload");
    setPayloadError(result.ok ? undefined : result.error);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!testCase) {
      return;
    }

    const headersResult = parseJsonField(headersText, "Headers");
    const payloadResult = parseJsonField(payloadText, "Input payload");

    setHeadersError(headersResult.ok ? undefined : headersResult.error);
    setPayloadError(payloadResult.ok ? undefined : payloadResult.error);

    const statusCode = Number(expectedStatusCode);
    if (!expectedStatusCode.trim() || Number.isNaN(statusCode)) {
      setStatusError("Expected status code is required.");
      return;
    }

    setStatusError(undefined);

    if (!headersResult.ok || !payloadResult.ok) {
      return;
    }

    setIsSaving(true);

    try {
      const updates = {
        title: title.trim(),
        endpoint: endpoint.trim(),
        method: method.trim().toUpperCase(),
        headers: headersResult.data,
        input_payload: payloadResult.data,
        expected_status_code: statusCode,
        assertion_notes: assertionNotes.trim() || null,
      };

      await updateTestCaseApi(testCase.id, updates);
      updateTestCase(testCase.id, updates);
      onOpenChange(false);
      toast.success("Test case updated.");
    } catch {
      toast.error("Failed to save test case.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-indigo-electric/20 bg-graphite text-[#F5F5F5]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[#F5F5F5]">
            Edit test case
          </DialogTitle>
          <DialogDescription className="font-body text-[#F5F5F5]/60">
            Update request details and assertions. JSON fields are validated
            before save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="border-indigo-electric/20 bg-[#1C1C1C] font-body"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="edit-method">Method</Label>
              <Input
                id="edit-method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="border-indigo-electric/20 bg-[#1C1C1C] font-mono uppercase"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endpoint">Endpoint</Label>
              <Input
                id="edit-endpoint"
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                className="border-indigo-electric/20 bg-[#1C1C1C] font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-headers">Headers (JSON)</Label>
            <Textarea
              id="edit-headers"
              value={headersText}
              onChange={(event) => handleHeadersChange(event.target.value)}
              placeholder='{"Authorization": "Bearer token"}'
              className="min-h-[100px] border-indigo-electric/20 bg-[#1C1C1C] font-mono text-sm"
              aria-invalid={Boolean(headersError)}
            />
            {headersError ? (
              <p className="text-sm text-red-500">{headersError}</p>
            ) : null}
            {headersPreview.ok && headersText.trim() ? (
              <pre className="max-h-32 overflow-auto rounded-md border border-indigo-electric/15 bg-[#1C1C1C] p-3 font-mono text-xs text-lime-cyber/90">
                {JSON.stringify(headersPreview.data, null, 2)}
              </pre>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-payload">Input payload (JSON)</Label>
            <Textarea
              id="edit-payload"
              value={payloadText}
              onChange={(event) => handlePayloadChange(event.target.value)}
              placeholder='{"email": "user@example.com"}'
              className="min-h-[120px] border-indigo-electric/20 bg-[#1C1C1C] font-mono text-sm"
              aria-invalid={Boolean(payloadError)}
            />
            {payloadError ? (
              <p className="text-sm text-red-500">{payloadError}</p>
            ) : null}
            {payloadPreview.ok && payloadText.trim() ? (
              <pre className="max-h-40 overflow-auto rounded-md border border-indigo-electric/15 bg-[#1C1C1C] p-3 font-mono text-xs text-lime-cyber/90">
                {JSON.stringify(payloadPreview.data, null, 2)}
              </pre>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Expected status code</Label>
            <Input
              id="edit-status"
              type="number"
              value={expectedStatusCode}
              onChange={(event) => setExpectedStatusCode(event.target.value)}
              className="border-indigo-electric/20 bg-[#1C1C1C] font-mono"
              required
            />
            {statusError ? (
              <p className="text-sm text-red-500">{statusError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Assertion notes</Label>
            <Textarea
              id="edit-notes"
              value={assertionNotes}
              onChange={(event) => setAssertionNotes(event.target.value)}
              className="min-h-[80px] border-indigo-electric/20 bg-[#1C1C1C] font-body text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-indigo-electric/20 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
