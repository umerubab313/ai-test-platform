import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL_PATH = path.join(__dirname, "..", ".env.local");

function assertMocksEnabled(): void {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
    return;
  }

  if (!existsSync(ENV_LOCAL_PATH)) {
    throw new Error(
      "Demo requires NEXT_PUBLIC_USE_MOCKS=true. Create frontend/.env.local with that value before recording."
    );
  }

  const envContents = readFileSync(ENV_LOCAL_PATH, "utf8");
  const match = envContents.match(/^NEXT_PUBLIC_USE_MOCKS=(.*)$/m);
  const value = match?.[1]?.trim().replace(/^["']|["']$/g, "");

  if (value !== "true") {
    throw new Error(
      "Demo requires NEXT_PUBLIC_USE_MOCKS=true in frontend/.env.local so MSW mocks run instead of the real backend. Restart `npm run dev` after changing it."
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  assertMocksEnabled();

  // Step 1 — launch Chrome (headed, maximized, slowMo for visible actions)
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    slowMo: 400,
    args: ["--start-maximized"],
  });

  // Step 2 — full-window viewport (no fixed size)
  const context = await browser.newContext({
    viewport: null,
  });

  const page = await context.newPage();

  // Step 3 — landing page
  await page.goto(BASE);
  await sleep(2000);

  // Step 4 — new project form
  await page.getByRole("link", { name: "New Project" }).click();
  await page.waitForURL(/\/projects\/new$/);

  await page.fill("#name", "payments-api");
  await page.click("#framework");
  await page.getByRole("option", { name: "FastAPI" }).click();
  await page.fill("#base_url", "https://staging.payments-api.dev");
  await sleep(1000);
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/upload$/);

  // Step 5 — upload via GitHub
  await page.getByRole("tab", { name: "GitHub URL" }).click();
  await page.fill("#github_url", "https://github.com/tiangolo/fastapi");
  await sleep(1000);
  await page.getByRole("button", { name: "Upload & Parse" }).click();
  await page.getByText("FastAPI", { exact: true }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/ticket$/);

  // Step 6 — ticket + generate test cases
  await page.fill(
    "#title",
    "Refund endpoint — allow support agents to issue partial refunds"
  );
  await page.fill(
    "#description",
    "As a support agent, I want to issue a partial or full refund for a completed payment so that customers can be reimbursed without engineering involvement."
  );
  await sleep(1000);
  await page.getByRole("button", { name: /Generate test cases/i }).click();
  await page.waitForURL(/\/review$/, { timeout: 20000 });

  // Step 7 — approve first 4 test cases, then run
  const approveSwitches = page.getByRole("switch");
  for (let index = 0; index < 4; index += 1) {
    await approveSwitches.nth(index).click();
    await sleep(600);
  }

  await sleep(1000);
  await page.getByRole("button", { name: "Run Tests" }).click();
  await page.waitForURL(/\/execute$/, { timeout: 10000 });

  // Step 8 — wait for run_complete (View Report appears)
  await page
    .getByRole("link", { name: "View Report" })
    .waitFor({ timeout: 30000 });

  // Step 9 — open report and hold on final screen
  await page.getByRole("link", { name: "View Report" }).click();
  await page.waitForURL(/\/report$/, { timeout: 10000 });
  await sleep(3000);

  // Step 10 — leave browser open for manual recording stop
  console.log("Demo complete — browser left open for recording.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
