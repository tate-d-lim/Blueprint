import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("a saved project shows how far it has got, and the count moves when a task is done", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByRole("heading", { name: "9 of 17 tasks done" })).toBeVisible();
  await expect(page.getByText("2 in progress, 6 to do. All 9 questions answered.")).toBeVisible();

  // Show only what is left, then finish one of them.
  await page.getByRole("button", { name: "To do (6)" }).click();
  const tasks = page
    .locator("section", { has: page.getByRole("heading", { name: "What you need to do", exact: true }) })
    .locator(":scope > ul > li");
  await expect(tasks).toHaveCount(6);
  const status = tasks.first().locator("sgds-select");
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await status.getByRole("textbox").click();
  await status.getByRole("menuitem", { name: "Done" }).click();
  await saved;

  await expect(page.getByRole("heading", { name: "10 of 17 tasks done" })).toBeVisible();
  await expect(tasks).toHaveCount(5);
  await expect(page.getByRole("button", { name: /^To do \(5\)/ })).toBeVisible();
});

test("a plan that isn't saved yet has no progress to show", async ({ page }) => {
  await page.goto("/plan?c=restricted&s=sn&i=slight&d=min&k=&t=appcentral");
  await page.getByRole("heading", { name: "Your build plan" }).waitFor();
  await expect(page.getByRole("heading", { name: /tasks done/ })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Show tasks" })).toHaveCount(0);
});
