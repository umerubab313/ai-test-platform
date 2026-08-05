import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage();

page.on("pageerror", (error) => {
  errors.push({
    type: "pageerror",
    message: error.message,
    stack: error.stack,
  });
});

page.on("console", (msg) => {
  if (msg.type() === "error") {
    errors.push({
      type: "console.error",
      message: msg.text(),
    });
  }
});

await page.goto(`${BASE}/projects/new`, { waitUntil: "networkidle" });

await page.fill("#name", "test-api");
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

await page.fill("#title", "Test ticket");
await page.fill("#description", "Test description");
await page.getByRole("button", { name: /Generate test cases/i }).click();
await page.waitForURL(/\/review$/, { timeout: 20000 });

await page.getByRole("button", { name: "Approve All" }).click();
await page.waitForTimeout(1000);
await page.getByRole("button", { name: "Run Tests" }).click();
await page.waitForURL(/\/execute$/, { timeout: 10000 });

await page.waitForTimeout(20000);

console.log(JSON.stringify(errors, null, 2));
await browser.close();
