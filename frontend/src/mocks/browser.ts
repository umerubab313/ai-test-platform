import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

let startPromise: Promise<void> | null = null;

export async function startMockWorker(): Promise<void> {
  if (typeof window !== "undefined" && window.__MSW_MOCKING__) {
    return;
  }

  if (!startPromise) {
    startPromise = worker
      .start({
        onUnhandledRequest: "bypass",
        quiet: false,
      })
      .then(() => {
        if (typeof window !== "undefined") {
          window.__MSW_MOCKING__ = true;
        }
      });
  }

  return startPromise;
}
