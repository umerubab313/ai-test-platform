"use client";

import { useEffect, useState } from "react";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!USE_MOCKS);

  useEffect(() => {
    if (!USE_MOCKS) {
      return;
    }

    let active = true;

    async function enableMocks() {
      const { startMockWorker } = await import("@/mocks/browser");
      await startMockWorker();

      if (active) {
        setReady(true);
      }
    }

    void enableMocks();

    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-wider text-[#F5F5F5]/50">
          Starting mock API…
        </p>
      </div>
    );
  }

  return children;
}
