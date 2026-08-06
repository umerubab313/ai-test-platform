"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const BITBUCKET_REPO_URL_PATTERN =
  /^https:\/\/(www\.)?bitbucket\.org\/[\w.-]+\/[\w.-]+\/?$/;

export function isValidBitbucketRepoUrl(value: string): boolean {
  return BITBUCKET_REPO_URL_PATTERN.test(value.trim());
}

export interface BitbucketInputProps {
  url: string;
  onChangeUrl: (value: string) => void;
  branch: string;
  onChangeBranch: (value: string) => void;
  useAppPassword: boolean;
  onToggleAppPassword: (use: boolean) => void;
  username: string;
  onChangeUsername: (value: string) => void;
  appPassword: string;
  onChangeAppPassword: (value: string) => void;
  error?: string;
  className?: string;
}

export function BitbucketInput({
  url,
  onChangeUrl,
  branch,
  onChangeBranch,
  useAppPassword,
  onToggleAppPassword,
  username,
  onChangeUsername,
  appPassword,
  onChangeAppPassword,
  error,
  className,
}: BitbucketInputProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="bitbucket_url" className="font-body text-[#F5F5F5]/80">
          Bitbucket repository URL
        </Label>
        <Input
          id="bitbucket_url"
          type="url"
          value={url}
          onChange={(e) => onChangeUrl(e.target.value)}
          placeholder="https://bitbucket.org/owner/repo"
          className="border-indigo-electric/20 bg-graphite font-mono text-sm"
          aria-invalid={Boolean(error)}
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bitbucket_branch" className="font-body text-[#F5F5F5]/80">
          Branch
        </Label>
        <Input
          id="bitbucket_branch"
          type="text"
          value={branch}
          onChange={(e) => onChangeBranch(e.target.value)}
          placeholder="main"
          className="border-indigo-electric/20 bg-graphite font-mono text-sm"
        />
      </div>

      <div className="rounded-lg border border-indigo-electric/20 bg-graphite/50 p-3 space-y-3">
        <button
          type="button"
          onClick={() => onToggleAppPassword(!useAppPassword)}
          className="flex w-full items-center justify-between font-mono text-xs text-indigo-electric hover:underline"
        >
          <span>Use App Password (for private repos)</span>
          <span>{useAppPassword ? "▲ Hide" : "▼ Show"}</span>
        </button>

        {useAppPassword ? (
          <div className="space-y-3 pt-1 border-t border-indigo-electric/10">
            <div className="space-y-1.5">
              <Label htmlFor="bitbucket_username" className="font-body text-xs text-[#F5F5F5]/80">
                Bitbucket Username
              </Label>
              <Input
                id="bitbucket_username"
                type="text"
                value={username}
                onChange={(e) => onChangeUsername(e.target.value)}
                placeholder="username"
                className="border-indigo-electric/20 bg-graphite font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bitbucket_app_password" className="font-body text-xs text-[#F5F5F5]/80">
                App Password
              </Label>
              <Input
                id="bitbucket_app_password"
                type="password"
                value={appPassword}
                onChange={(e) => onChangeAppPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="border-indigo-electric/20 bg-graphite font-mono text-xs"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
