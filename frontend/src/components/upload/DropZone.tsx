"use client";

import { useCallback } from "react";
import { FileArchive, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface DropZoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
  className?: string;
}

export function DropZone({
  file,
  onFileChange,
  error,
  className,
}: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const selected = acceptedFiles[0] ?? null;
      onFileChange(selected);
    },
    [onFileChange]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "application/zip": [".zip"],
        "application/x-zip-compressed": [".zip"],
      },
      maxFiles: 1,
      maxSize: MAX_FILE_BYTES,
      multiple: false,
    });

  const rejectionMessage = fileRejections[0]?.errors[0]?.message;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 transition-colors",
          isDragActive
            ? "border-lime-cyber bg-lime-cyber/5"
            : "border-indigo-electric/30 bg-graphite/40 hover:border-indigo-electric/50",
          error && "border-red-500/60"
        )}
      >
        <input {...getInputProps()} />

        <div
          className={cn(
            "mb-3 rounded-md border p-2.5",
            isDragActive
              ? "border-lime-cyber/40 bg-lime-cyber/10 text-lime-cyber"
              : "border-indigo-electric/20 bg-indigo-electric/10 text-indigo-electric"
          )}
        >
          {file ? (
            <FileArchive className="h-5 w-5" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </div>

        {file ? (
          <div className="text-center">
            <p className="font-mono text-sm text-[#F5F5F5]">{file.name}</p>
            <p className="mt-1 font-mono text-xs text-[#F5F5F5]/50">
              {formatFileSize(file.size)}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-body text-sm text-[#F5F5F5]/80">
              {isDragActive
                ? "Drop your ZIP here"
                : "Drag & drop a .zip file, or click to browse"}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#F5F5F5]/40">
              .zip only · max 50MB
            </p>
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {!error && rejectionMessage ? (
        <p className="text-sm text-red-500">{rejectionMessage}</p>
      ) : null}
    </div>
  );
}
