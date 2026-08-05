"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const GITHUB_REPO_URL_PATTERN =
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

export function isValidGithubRepoUrl(value: string): boolean {
  return GITHUB_REPO_URL_PATTERN.test(value.trim());
}

export interface GithubInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export function GithubInput({
  value,
  onChange,
  error,
  className,
}: GithubInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="github_url" className="font-body text-[#F5F5F5]/80">
        GitHub repository URL
      </Label>
      <Input
        id="github_url"
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://github.com/owner/repo"
        className="border-indigo-electric/20 bg-graphite font-mono text-sm"
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
