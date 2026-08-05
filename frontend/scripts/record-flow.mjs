import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recordingsDir = path.join(__dirname, "..", "recordings");

await mkdir(recordingsDir, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  channel: "chrome",
  slowMo: 150,
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: {
    dir: recordingsDir,
    size: { width: 1280, height: 720 },
  },
});

const page = await context.newPage();

console.log("Recording started in Chrome...");

await page.goto(`${BASE}/projects/new`, { waitUntil: "networkidle" });

await page.fill("#name", "demo-api");
await page.click("#framework");
await page.getByRole("option", { name: "FastAPI" }).click();
await page.fill("#base_url", "https://api.example.com");
await page.getByRole("button", { name: "Create project" }).click();
await page.waitForURL(/\/upload$/);

await page.getByRole("tab", { name: /GitHub/i }).click();
await page.fill("#github_url", "https://github.com/example/repo");
await page.getByRole("button", { name: /Upload & Parse/i }).click();
await page.waitForSelector("text=12 endpoints found", { timeout: 15000 });
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL(/\/ticket$/);

await page.fill("#title", "Smoke test ticket");
await page.fill("#description", "End-to-end demo recording");
await page.getByRole("button", { name: /Generate test cases/i }).click();
await page.waitForURL(/\/review$/, { timeout: 20000 });

await page.getByRole("button", { name: "Approve All" }).click();
await page.waitForTimeout(1000);
await page.getByRole("button", { name: "Run Tests" }).click();
await page.waitForURL(/\/execute$/, { timeout: 10000 });

await page.waitForSelector("text=Run complete", { timeout: 30000 }).catch(() => {
  console.log("Run complete banner not found; waiting for results to finish...");
});
await page.waitForTimeout(3000);

const video = page.video();
await context.close();
await browser.close();

if (video) {
  const videoPath = await video.path();
  console.log(`Recording saved to: ${videoPath}`);
} else {
  console.log("No video file was created.");
}
