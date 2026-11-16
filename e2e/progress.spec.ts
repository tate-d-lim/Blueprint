import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("a saved project shows how far it has got, and the count moves when a control is ticked", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByText("75 of 83 done")).toBeVisible();
  await expect(page.getByText("66 by your tools · 8 left")).toBeVisible();
  const bar = page.getByRole("progressbar", { name: "Controls done" });
  await expect(bar).toHaveAttribute("aria-valuenow", "75");

  // Tick the first control that is not done.
  const control = page.getByRole("checkbox", { checked: false }).first();
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await control.check();
  await saved;
  await expect(page.getByText("76 of 83 done")).toBeVisible();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(bar).toHaveAttribute("aria-valuenow", "76");

  // A tick is kept, and it can be undone.
  await page.reload();
  await expect(page.getByText("76 of 83 done")).toBeVisible();
  await page.getByRole("checkbox", { checked: true }).first().uncheck();
  await expect(page.getByText(/^\d+ of 83 done/)).toBeVisible();
});

test("the plan tab has the hotel beside the checklist, and the two actions", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByRole("heading", { level: 1, name: "Sample project (two weeks in)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Give to your agent" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export for review" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Change answers" })).toHaveAttribute("href", /\/start\/app\?.*project=sample-two-weeks-in/);
  await expect(page.getByRole("link", { name: /build plan/i })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Your tools" }).getByText("appCentral")).toBeVisible();
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
});

test("a tool does controls for you, so they are done and listed as done by the tool", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  const group = page.locator("summary", { hasText: "Done by your tools" });
  await expect(group).toContainText("66");
  await group.click();
  await expect(page.getByRole("button", { name: /^Details: / }).first()).toBeVisible();
  await expect(page.getByText("Provided by appCentral").or(page.getByText(/appCentral/)).first()).toBeVisible();
});

test("a control names its area, and its note goes into the details", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("button", { name: /^Details: / }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(/ in [A-Z][^()]+ \([A-Za-z ]+\)/);
  await dialog.getByRole("textbox", { name: "Your note" }).fill("Reviewed in the sprint 12 retro");
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await dialog.getByRole("textbox", { name: "Your note" }).blur();
  await saved;
});

test("Give to your agent gives the prompt and the security plan", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("button", { name: "Give to your agent" }).click();
  const dialog = page.getByRole("dialog", { name: "Give to your agent" });
  await expect(dialog.getByText(/Do the controls in state "planned"/)).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "Download the security plan" }).click();
  expect((await download).suggestedFilename()).toBe("sample-project-two-weeks-in-ssp.json");
});
