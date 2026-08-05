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
            "bg-graphite border border-indigo-electric/20 text-[#F5F5F5] font-body",
          title: "font-heading",
          description: "text-[#F5F5F5]/80",
        },
      }}
    />
  );
}
