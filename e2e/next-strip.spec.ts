import { expect, test } from "@playwright/test";
import { openNeeds, saveDemoPlan } from "./helpers";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("the Projects page opens with a welcome band: what Blueprint does, three steps, one way to start", async ({ page }) => {
  await page.goto("/projects");
  const band = page.getByRole("region", { name: "Welcome" });
  await expect(band.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(band.getByRole("listitem")).toHaveText([/Answer questions about your app/, /See your security plan/, /Give the plan to your coding agent/]);
  await expect(band.getByRole("link", { name: "Start a new plan" })).toHaveAttribute("href", "/start");
  // Saved plans are below the band, with the shared-list fact and a Delete button.
  await expect(page.getByRole("row", { name: /Sample project \(two weeks in\)/ })).toBeVisible();
  await expect(page.getByText("Everyone here sees the same list")).toBeVisible();
});

test("the Next strip marks each step done as the builder goes, then goes away", async ({ page }) => {
  await saveDemoPlan(page);
  const strip = page.getByRole("region", { name: "Next" });
  const steps = strip.getByRole("listitem");
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toHaveAttribute("aria-current", "step");
  for (const i of [0, 1, 2]) await expect(steps.nth(i)).not.toContainText("(done)");

  // 1. Pick your tools.
  await strip.getByRole("button", { name: "Pick your tools" }).click();
  await page.getByRole("dialog", { name: "Your tools" }).getByRole("checkbox", { name: "appCentral" }).check();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(steps.nth(0)).toContainText("(done)");
  await expect(steps.nth(1)).toHaveAttribute("aria-current", "step");

  // 2. Give the plan to your agent: the prompt names the tool, and the download is recorded.
  await strip.getByRole("button", { name: "Give the plan to your agent" }).click();
  const dialog = page.getByRole("dialog", { name: "Give to your agent" });
  await expect(dialog.getByText(/- appCentral does \d+ controls?\./)).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "Download the security plan" }).click();
  await download;
  await page.keyboard.press("Escape");
  await expect(steps.nth(1)).toContainText("(done)");
  await page.reload();
  await expect(steps.nth(1)).toContainText("(done)");

  // 3. Tick a control: all three are done, so the strip goes.
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await page.getByRole("checkbox", { checked: false }).first().check();
  await saved;
  await expect(strip).toHaveCount(0);
});

test("a builder with no tools says so, and the prompt says so too", async ({ page }) => {
  await saveDemoPlan(page);
  const strip = page.getByRole("region", { name: "Next" });
  await strip.getByRole("button", { name: "Your app uses no tools" }).click();
  await expect(strip.getByRole("listitem").nth(0)).toContainText("(done)");
  await page.reload();
  await expect(page.getByRole("region", { name: "Next" }).getByRole("listitem").nth(0)).toContainText("(done)");

  await page.getByRole("button", { name: "Give to your agent" }).click();
  await expect(page.getByRole("dialog", { name: "Give to your agent" })).toContainText("This app uses no tools. All the controls are mine.");
});

test("Export for review shows no warning when no tools are picked", async ({ page }) => {
  await saveDemoPlan(page);
  await page.getByRole("button", { name: "Export for review" }).click();
  const dialog = page.getByRole("dialog", { name: "Export for review" });
  await expect(dialog.getByRole("link", { name: "Security review spreadsheet" })).toBeVisible();
  await expect(dialog).not.toContainText(/no tools/i);
});

test("Hide closes the Next strip, and it stays closed", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  const strip = page.getByRole("region", { name: "Next" });
  await expect(strip).toBeVisible();
  await strip.getByRole("button", { name: "Hide" }).click();
  await expect(strip).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Sample project (two weeks in)" })).toBeVisible();
  await expect(strip).toHaveCount(0);
});

test("the Plan tab says where the content comes from", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByText("Sources", { exact: true }).click();
  await expect(page.getByText(/^IM8 profile Low-Risk Cloud, version /)).toBeVisible();
  await expect(page.getByText(/^appCentral: coverage version \d+, /)).toBeVisible();
});

test("step 4 shows the IM8 profile and its version, and no tool", async ({ page }) => {
  await openNeeds(page);
  await expect(page.getByText(/^IM8 profile Low-Risk Cloud, version /)).toBeVisible();
});
