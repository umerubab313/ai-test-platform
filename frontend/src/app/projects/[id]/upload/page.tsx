"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { StepIndicator } from "@/components/layout/StepIndicator";
import { DropZone } from "@/components/upload/DropZone";
import { GithubInput, isValidGithubRepoUrl } from "@/components/upload/GithubInput";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProject, getUploadResult, uploadCodebase } from "@/lib/api";
import type { UploadResult } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Framework } from "@/types";

type UploadTab = "zip" | "github";

type UploadPhase =
  | "form"
  | "uploading"
  | "parsing"
  | "success"
  | "framework_error"
  | "failed";

const FRAMEWORK_OPTIONS: { value: Framework; label: string }[] = [
  { value: "laravel", label: "Laravel" },
  { value: "fastapi", label: "FastAPI" },
  { value: "spring_boot", label: "Spring Boot" },
];

function formatFramework(framework: Framework): string {
  return (
    FRAMEWORK_OPTIONS.find((option) => option.value === framework)?.label ??
    framework
  );
}

function isFrameworkNotDetected(result: UploadResult): boolean {
  return (
    result.error === "FRAMEWORK_NOT_DETECTED" ||
    result.code === "FRAMEWORK_NOT_DETECTED"
  );
}

function isParseFailure(result: UploadResult): boolean {
  return result.status === "failed" && !isFrameworkNotDetected(result);
}

export default function UploadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const project = useAppStore((state) => state.project);
  const setProject = useAppStore((state) => state.setProject);

  const [activeTab, setActiveTab] = useState<UploadTab>("zip");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [zipError, setZipError] = useState<string>();
  const [githubError, setGithubError] = useState<string>();

  const [phase, setPhase] = useState<UploadPhase>("form");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [endpointCount, setEndpointCount] = useState<number>(0);
  const [pollError, setPollError] = useState<string>();
  const [confirmedFramework, setConfirmedFramework] = useState<Framework | "">(
    ""
  );

  useEffect(() => {
    if (!projectId) {
      return;
    }

    if (project?.id === projectId) {
      return;
    }

    getProject(projectId)
      .then(setProject)
      .catch(() => {
        toast.error("Failed to load project.");
      });
  }, [projectId, project?.id, setProject]);

  useEffect(() => {
    if (!taskId || phase !== "parsing") {
      return;
    }

    let cancelled = false;

    const handleResult = (result: UploadResult) => {
      if (cancelled) {
        return true;
      }

      if (result.status === "processing") {
        return false;
      }

      if (result.status === "completed") {
        const count =
          typeof result.endpoint_count === "number" ? result.endpoint_count : 0;
        setEndpointCount(count);
        setPhase("success");
        return true;
      }

      if (isFrameworkNotDetected(result)) {
        setConfirmedFramework(project?.framework ?? "");
        setPhase("framework_error");
        return true;
      }

      if (isParseFailure(result)) {
        setPollError(
          typeof result.error === "string"
            ? result.error
            : "Parsing failed. Try another upload."
        );
        setPhase("failed");
        return true;
      }

      setPollError("Unexpected parse result.");
      setPhase("failed");
      return true;
    };

    const poll = async () => {
      try {
        const result = await getUploadResult(taskId);
        return handleResult(result);
      } catch {
        if (!cancelled) {
          setPollError("Failed to check parse status.");
          setPhase("failed");
        }
        return true;
      }
    };

    const intervalId = window.setInterval(async () => {
      const done = await poll();
      if (done) {
        window.clearInterval(intervalId);
      }
    }, 2000);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [taskId, phase, project?.framework]);

  const handleUpload = async () => {
    setZipError(undefined);
    setGithubError(undefined);
    setPollError(undefined);

    if (activeTab === "zip") {
      if (!zipFile) {
        setZipError("Select a .zip file to upload.");
        return;
      }
    } else if (!githubUrl.trim()) {
      setGithubError("GitHub URL is required.");
      return;
    } else if (!isValidGithubRepoUrl(githubUrl)) {
      setGithubError("Enter a valid https://github.com/owner/repo URL.");
      return;
    }

    setPhase("uploading");

    try {
      const payload =
        activeTab === "zip"
          ? (() => {
              const formData = new FormData();
              formData.append("file", zipFile as File);
              return formData;
            })()
          : githubUrl.trim();

      const upload = await uploadCodebase(projectId, payload);

      useAppStore.setState({ upload });
      setTaskId(upload.task_id);
      setPhase("parsing");
    } catch {
      toast.error("Upload failed. Check your file or URL and try again.");
      setPhase("form");
    }
  };

  const handleContinue = () => {
    if (phase === "framework_error") {
      if (!confirmedFramework) {
        return;
      }

      if (project) {
        setProject({ ...project, framework: confirmedFramework });
      }
    }

    router.push(`/projects/${projectId}/ticket`);
  };

  const displayFramework = project?.framework ?? confirmedFramework;
  const showForm = phase === "form" || phase === "failed";
  const isBusy = phase === "uploading" || phase === "parsing";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 py-4">
      <div className="hidden justify-center sm:flex">
        <StepIndicator currentStep={2} variant="full" />
      </div>

      <Card className="border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
            Step 2 — Upload Codebase
          </p>
          <CardTitle className="font-heading text-xl text-[#F5F5F5]">
            Upload & parse
          </CardTitle>
          <CardDescription className="font-body text-[#F5F5F5]/60">
            Provide a ZIP archive or public GitHub repo. We extract routes and
            build an endpoint map for AI test generation.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {phase === "parsing" ? (
            <div className="space-y-3 py-4">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-indigo-electric/20">
                <div className="progress-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-lime-cyber" />
              </div>
              <p className="text-center font-mono text-sm text-[#F5F5F5]/70">
                Parsing codebase...
              </p>
            </div>
          ) : null}

          {phase === "success" && displayFramework ? (
            <div className="space-y-4 py-2 text-center">
              <StatusBadge variant="passed">
                {formatFramework(displayFramework as Framework)}
              </StatusBadge>
              <p className="font-mono text-sm text-[#F5F5F5]/80">
                {endpointCount} endpoints found
              </p>
              <Button
                type="button"
                onClick={handleContinue}
                className="w-full bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90 hover:glow-lime"
              >
                Continue
              </Button>
            </div>
          ) : null}

          {phase === "framework_error" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3">
                <p className="font-body text-sm text-orange-200">
                  Framework could not be detected automatically. Confirm the
                  correct parser before continuing.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmed_framework"
                  className="font-body text-[#F5F5F5]/80"
                >
                  Framework
                </Label>
                <Select
                  value={confirmedFramework}
                  onValueChange={(value) =>
                    setConfirmedFramework(value as Framework)
                  }
                >
                  <SelectTrigger
                    id="confirmed_framework"
                    className="border-indigo-electric/20 bg-graphite font-mono text-sm"
                  >
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent className="border-indigo-electric/20 bg-graphite">
                    {FRAMEWORK_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="font-mono text-sm"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                onClick={handleContinue}
                disabled={!confirmedFramework}
                className="w-full bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90 hover:glow-lime disabled:opacity-50"
              >
                Continue
              </Button>
            </div>
          ) : null}

          {phase === "failed" ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="font-body text-sm text-red-300">
                {pollError ?? "Upload or parsing failed."}
              </p>
            </div>
          ) : null}

          {showForm ? (
            <>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as UploadTab)}
              >
                <TabsList className="grid w-full grid-cols-2 border border-indigo-electric/20 bg-graphite">
                  <TabsTrigger
                    value="zip"
                    className="font-mono text-xs data-[state=active]:bg-indigo-electric/20 data-[state=active]:text-[#F5F5F5]"
                  >
                    ZIP Upload
                  </TabsTrigger>
                  <TabsTrigger
                    value="github"
                    className="font-mono text-xs data-[state=active]:bg-indigo-electric/20 data-[state=active]:text-[#F5F5F5]"
                  >
                    GitHub URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="zip" className="mt-4">
                  <DropZone
                    file={zipFile}
                    onFileChange={setZipFile}
                    error={zipError}
                  />
                </TabsContent>

                <TabsContent value="github" className="mt-4">
                  <GithubInput
                    value={githubUrl}
                    onChange={setGithubUrl}
                    error={githubError}
                  />
                </TabsContent>
              </Tabs>

              <Button
                type="button"
                onClick={handleUpload}
                disabled={isBusy}
                className="w-full bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90 hover:glow-lime"
              >
                {phase === "failed" ? "Try again" : "Upload & Parse"}
              </Button>
            </>
          ) : null}

          {phase === "uploading" ? (
            <p className="text-center font-mono text-sm text-[#F5F5F5]/60">
              Uploading…
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
