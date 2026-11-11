import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { answerDemoFacts, answerLowRisk } from "./helpers";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("demo: start → verdict → app → needs → save → tools → prompt your agent", async ({ page }) => {
  await page.goto("/start");
  await answerLowRisk(page);
  await page.getByRole("button", { name: "Find your app type" }).click();
  await page.getByRole("link", { name: "Next: about your app" }).click();
  await answerDemoFacts(page);
  await page.getByRole("button", { name: "Next: what your app needs" }).click();

  // Step 4: the tour in tooltips, then one part at a time.
  for (let n = 0; n < 3; n++) await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Explore the hotel" }).click();
  await page.getByRole("button", { name: /CCTV · Logging/ }).click();
  await page.getByText("Show all 10 controls").click();
  await page.getByRole("button", { name: "Save this plan" }).click();

  // The saved plan opens on the Plan tab, with no tools yet. "Add tools" opens the drawer: a tool does controls for you,
  // so they show as done at once and the hotel fills in.
  await expect(page.getByRole("heading", { level: 1, name: "Low-Risk Cloud app" })).toBeVisible();
  await expect(page.getByText("0 of 84 done")).toBeVisible();
  await page.getByRole("button", { name: "Add tools" }).click();
  await page.getByRole("checkbox", { name: "appCentral" }).check();
  await expect(page.getByText("51 of 84 done")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-hotel]")).toBeVisible();

  // The security plan is the plan: the agent gets its file and a short prompt.
  await page.getByRole("button", { name: "Prompt your agent" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download the security plan" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("low-risk-cloud-app-ssp.json");
  const ssp = JSON.parse(readFileSync((await file.path())!, "utf8"));
  const requirements = ssp["system-security-plan"]["control-implementation"]["implemented-requirements"];
  const planned = requirements.filter((r: { "by-components"?: { "implementation-status": { state: string } }[] }) =>
    r["by-components"]?.some(b => b["implementation-status"].state === "planned"),
  );
  expect(planned.length).toBeGreaterThan(0);
  expect(planned[0].remarks).toContain("What to do:"); // a planned control says what to do and why
});

test("the security review spreadsheet is in the Export dialog, named for the profile and the project", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("button", { name: "Export" }).click();
  const sheet = page.waitForEvent("download");
  await page.getByRole("link", { name: "Security review spreadsheet" }).click();
  expect((await sheet).suggestedFilename()).toBe("low-risk-cloud-ssp-sample-project-two-weeks-in.xlsx");
});

test("no step offers a build plan; a saved project offers the prompt for the agent", async ({ page }) => {
  await page.goto("/start");
  await expect(page.getByRole("link", { name: /build plan/i })).toHaveCount(0);
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByRole("link", { name: /build plan/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Prompt your agent" })).toBeVisible();
});
