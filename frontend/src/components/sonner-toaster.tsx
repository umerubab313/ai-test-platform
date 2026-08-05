"use client";

import { Toaster } from "sonner";

export function SonnerToaster() {
  return (
    <Toaster
      theme="dark"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "bg-card border border-border text-foreground font-body",
          title: "font-heading",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
