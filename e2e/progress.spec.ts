import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

const tasksOf = (page: Page) =>
  page.locator("section", { has: page.getByRole("heading", { name: "What you need to do", exact: true }) }).locator(":scope > ul > li");

test("a saved project shows how far it has got, and the count moves when a task is done", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByRole("heading", { name: "9 of 17 tasks done" })).toBeVisible();
  await expect(page.getByText("2 in progress, 6 to do. All 3 questions answered.")).toBeVisible();

  // Show only what is left, then finish one of them.
  await page.getByRole("button", { name: "To do (6)" }).click();
  const tasks = tasksOf(page);
  await expect(tasks).toHaveCount(6);
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await tasks.first().getByRole("combobox", { name: "Status" }).selectOption({ label: "Done" });
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

test("choosing a room on the floor plan shows only that room, and Back shows every room again", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(tasksOf(page)).toHaveCount(17);

  const appSecurity = page.getByRole("button", { name: /^App security\./ });
  await appSecurity.click();
  await expect(page).toHaveURL(/[?&]room=as\b/);
  await expect(appSecurity).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: "Showing App security only." })).toBeVisible();
  await expect(tasksOf(page)).toHaveCount(5);
  for (const task of await tasksOf(page).all()) await expect(task).toContainText("in App security");

  await page.goBack();
  await expect(page).not.toHaveURL(/room=/);
  await expect(appSecurity).toHaveAttribute("aria-pressed", "false");
  await expect(tasksOf(page)).toHaveCount(17);
});
