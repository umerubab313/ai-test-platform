"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Framework } from "@/types";

const FRAMEWORK_OPTIONS: { value: Framework; label: string }[] = [
  { value: "laravel", label: "Laravel" },
  { value: "fastapi", label: "FastAPI" },
  { value: "spring_boot", label: "Spring Boot" },
];

interface FormErrors {
  name?: string;
  framework?: string;
  base_url?: string;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateForm(
  name: string,
  framework: Framework | "",
  baseUrl: string
): FormErrors {
  const errors: FormErrors = {};

  if (!name.trim()) {
    errors.name = "Project name is required.";
  }

  if (!framework) {
    errors.framework = "Framework is required.";
  }

  if (!baseUrl.trim()) {
    errors.base_url = "Base URL is required.";
  } else if (!isValidUrl(baseUrl.trim())) {
    errors.base_url = "Enter a valid http or https URL.";
  }

  return errors;
}

export default function NewProjectPage() {
  const router = useRouter();
  const setProject = useAppStore((state) => state.setProject);

  const [name, setName] = useState("");
  const [framework, setFramework] = useState<Framework | "">("");
  const [baseUrl, setBaseUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateForm(name, framework, baseUrl);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const project = await createProject({
        name: name.trim(),
        framework: framework as Framework,
        base_url: baseUrl.trim(),
      });

      setProject(project);
      router.push(`/projects/${project.id}/upload`);
    } catch {
      toast.error("Failed to create project. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 py-4">
      <div className="hidden justify-center sm:flex">
        <StepIndicator currentStep={1} variant="full" />
      </div>

      <Card className="border-indigo-electric/20 bg-[#1C1C1C]/90 shadow-none">
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-electric">
            Step 1 — Create Project
          </p>
          <CardTitle className="font-heading text-xl text-[#F5F5F5]">
            New project
          </CardTitle>
          <CardDescription className="font-body text-[#F5F5F5]/60">
            Name your API under test, pick a framework parser, and set the base
            URL Newman will hit during execution.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name" className="font-body text-[#F5F5F5]/80">
                Project name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="payments-api"
                className="border-indigo-electric/20 bg-graphite font-mono text-sm"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? (
                <p className="text-sm text-red-500">{errors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="framework" className="font-body text-[#F5F5F5]/80">
                Framework
              </Label>
              <Select
                value={framework}
                onValueChange={(value) => setFramework(value as Framework)}
              >
                <SelectTrigger
                  id="framework"
                  className="border-indigo-electric/20 bg-graphite font-mono text-sm"
                  aria-invalid={Boolean(errors.framework)}
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
              {errors.framework ? (
                <p className="text-sm text-red-500">{errors.framework}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_url" className="font-body text-[#F5F5F5]/80">
                Base URL
              </Label>
              <Input
                id="base_url"
                type="url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://api.example.com"
                className="border-indigo-electric/20 bg-graphite font-mono text-sm"
                aria-invalid={Boolean(errors.base_url)}
              />
              {errors.base_url ? (
                <p className="text-sm text-red-500">{errors.base_url}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-lime-cyber font-heading font-semibold text-black hover:bg-lime-cyber/90 hover:glow-lime"
            >
              {isSubmitting ? "Creating…" : "Create project"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
