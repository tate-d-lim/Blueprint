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

test("the plan page opens with the go", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByRole("heading", { name: /^Your plan is ready\. \d+ are yours, and your tools do \d+\.$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Change tools" })).toHaveAttribute("href", "/projects/sample-two-weeks-in/tools");
  await expect(page.getByRole("link", { name: "Change answers" })).toHaveAttribute("href", /\/start\/needs\?.*project=sample-two-weeks-in/);
  await expect(page.getByRole("link", { name: "Give your agent the build plan" })).toBeVisible();
  await expect(page.getByText("9 of 17 tasks done")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "appCentral" })).toHaveCount(0);
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
});

test("tasks name their area the way the build plan does", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(tasksOf(page).first()).toContainText(/ in [A-Z][^()]+ \([A-Za-z ]+\)/);
});
