import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { answerDemoFacts, answerLowRisk } from "./helpers";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("demo: start → verdict → app → needs → save → tools → plan → build plan", async ({ page }) => {
  await page.goto("/start");
  await answerLowRisk(page);
  await page.getByRole("button", { name: "Work out my app type" }).click();
  await page.getByRole("link", { name: "Next: about your app" }).click();
  await answerDemoFacts(page);
  await page.getByRole("button", { name: "Next: what your app needs" }).click();

  // Step 4: everything the app needs, one part at a time.
  await page.getByRole("button", { name: /CCTV · Logging/ }).click();
  await page.getByText("Show all 10 requirements").click();
  await page.getByRole("button", { name: "Save this plan" }).click();

  // Step 5: ticking a tool builds part of the hotel and moves the numbers.
  await page.getByRole("checkbox", { name: "appCentral" }).check();
  await expect(page.getByText("18 are yours · 51 your tools do · 15 questions")).toBeVisible();
  await page.getByRole("button", { name: "Continue to your plan" }).click();

  // Step 6: the go, and the one build plan.
  await expect(page.getByRole("heading", { name: "Your plan is ready. 18 are yours, and your tools do 51." })).toBeVisible();
  await expect(page.locator("[data-hotel]")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Give your agent the build plan" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("BUILD-PLAN.md");
  const text = readFileSync((await file.path())!, "utf8");
  expect(text).toContain("## 1. What you need to do (18)");
  expect(text).toContain("## 4. Doesn't apply to this app (2)");
  expect(text).toContain("### Hotel rules (Security programme)");
});

test("the security review spreadsheet is in the Export dialog, named for the profile and the project", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("button", { name: "Export" }).click();
  const sheet = page.waitForEvent("download");
  await page.getByRole("link", { name: "Security review spreadsheet" }).click();
  expect((await sheet).suggestedFilename()).toBe("low-risk-cloud-ssp-sample-project-two-weeks-in.xlsx");
});

test("steps 1 to 5 never offer the build plan; the plan page does", async ({ page }) => {
  await page.goto("/start");
  await expect(page.getByRole("link", { name: /build plan/i })).toHaveCount(0);
  await page.goto("/projects/sample-two-weeks-in/tools");
  await expect(page.getByRole("link", { name: /build plan/i })).toHaveCount(0);
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByRole("link", { name: "Give your agent the build plan" })).toBeVisible();
});
