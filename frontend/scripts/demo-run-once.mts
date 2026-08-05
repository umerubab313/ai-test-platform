/**
 * One-shot localhost demo: full project flow with MSW mocks.
 * Saves screenshots under frontend/recordings/demo-shots/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shotsDir = path.join(__dirname, "..", "recordings", "demo-shots");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function shot(page: Page, name: string) {
  const file = path.join(shotsDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  screenshot: ${name}.png`);
}

async function waitReady(page: Page) {
  // MSW boot banner / app shell
  await page.waitForLoadState("domcontentloaded");
  await page
    .getByText(/Initializing mocks/i)
    .waitFor({ state: "hidden", timeout: 20000 })
    .catch(() => undefined);
  await sleep(800);
}

async function main() {
  await mkdir(shotsDir, { recursive: true });

  const health = await fetch(BASE).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `Dev server not reachable at ${BASE}. Start it with: npm run dev`
    );
  }

  console.log(`Demo against ${BASE}`);

  let browser;
  try {
    browser = await chromium.launch({
      channel: "chrome",
      headless: true,
      args: ["--disable-dev-shm-usage"],
    });
  } catch {
    console.log("Chrome channel unavailable — falling back to bundled Chromium");
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const log: string[] = [];

  try {
    // Landing
    await page.goto(BASE, { waitUntil: "networkidle" });
    await waitReady(page);
    await shot(page, "01-landing");
    log.push("landing ok");

    // New project
    await page.getByRole("link", { name: /New Project/i }).click();
    await page.waitForURL(/\/projects\/new$/);
    await waitReady(page);

    const projectName = `demo-shop-${Date.now().toString(36)}`;
    await page.fill("#name", projectName);
    await page.click("#framework");
    await page.getByRole("option", { name: "FastAPI" }).click();
    await page.fill("#base_url", "https://api.random-demo-shop.example.com");
    await shot(page, "02-new-project");
    await page.getByRole("button", { name: /Create project/i }).click();
    await page.waitForURL(/\/upload$/, { timeout: 20000 });
    log.push(`project created: ${projectName}`);

    // Upload via GitHub (random-ish public URL; MSW mocks the parse)
    await waitReady(page);
    await page.getByRole("tab", { name: /GitHub/i }).click();
    await page.fill("#github_url", "https://github.com/tiangolo/fastapi");
    await shot(page, "03-upload-github");
    await page.getByRole("button", { name: /Upload & Parse/i }).click();
    await page.getByText(/endpoints found/i).waitFor({ timeout: 20000 });
    await shot(page, "04-upload-success");
    await page.getByRole("button", { name: /^Continue$/i }).click();
    await page.waitForURL(/\/ticket$/, { timeout: 15000 });
    log.push("upload+parse ok");

    // Ticket
    await waitReady(page);
    await page.fill("#title", "Checkout — apply promo codes on cart total");
    await page.fill(
      "#description",
      "As a shopper I want to apply a promo code so my cart total updates before payment."
    );
    await shot(page, "05-ticket");
    await page.getByRole("button", { name: /Generate test cases/i }).click();
    await page.waitForURL(/\/review$/, { timeout: 25000 });
    log.push("ticket → review ok");

    // Review — approve all / first few
    await waitReady(page);
    const approveAll = page.getByRole("button", { name: /Approve All/i });
    if (await approveAll.isVisible().catch(() => false)) {
      await approveAll.click();
    } else {
      const switches = page.getByRole("switch");
      const count = Math.min(4, await switches.count());
      for (let i = 0; i < count; i += 1) {
        await switches.nth(i).click();
      }
    }
    await sleep(800);
    await shot(page, "06-review-approved");
    await page.getByRole("button", { name: /Run Tests/i }).click();
    await page.waitForURL(/\/execute$/, { timeout: 15000 });
    log.push("execute started");

    // Execute — wait for complete
    await waitReady(page);
    await shot(page, "07-execute-running");
    await page
      .getByRole("link", { name: /View Report/i })
      .waitFor({ timeout: 45000 });
    await shot(page, "08-execute-complete");
    await page.getByRole("link", { name: /View Report/i }).click();
    await page.waitForURL(/\/report$/, { timeout: 15000 });
    await sleep(1500);
    await shot(page, "09-report");
    log.push("report ok");

    // Runs history if linked
    const runsLink = page.getByRole("link", { name: /runs|history/i }).first();
    if (await runsLink.isVisible().catch(() => false)) {
      await runsLink.click();
      await sleep(1200);
      await shot(page, "10-runs");
      log.push("runs page visited");
    }

    const summary = {
      ok: true,
      base: BASE,
      projectName,
      githubUrl: "https://github.com/tiangolo/fastapi",
      baseUrl: "https://api.random-demo-shop.example.com",
      steps: log,
      shotsDir,
    };
    await writeFile(
      path.join(shotsDir, "demo-result.json"),
      JSON.stringify(summary, null, 2)
    );
    console.log("\nDemo complete ✓");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error("\nDemo failed:", err);
  process.exit(1);
});
