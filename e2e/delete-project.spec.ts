import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("the Projects list deletes a project after a confirm step, and Cancel keeps it", async ({ page }) => {
  await page.goto("/projects");
  const row = page.getByRole("row", { name: /Sample project \(two weeks in\)/ });
  await expect(row).toBeVisible();

  await page.getByRole("button", { name: "Delete Sample project (two weeks in)" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this project?" });
  await expect(dialog).toContainText("Sample project (two weeks in)");
  await expect(dialog).toContainText("You cannot undo this");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();

  await page.getByRole("button", { name: "Delete Sample project (two weeks in)" }).click();
  await dialog.getByRole("button", { name: "Delete project" }).click();
  await expect(page.getByText("No saved plans yet")).toBeVisible();
  await expect(row).toHaveCount(0);

  // It stays gone after a reload, and its page and downloads are gone.
  await page.reload();
  await expect(page.getByText("No saved plans yet")).toBeVisible();
  expect((await page.request.get("/projects/sample-two-weeks-in")).status()).toBe(404);
  expect((await page.request.get("/api/export/oscal?kind=ssp&project=sample-two-weeks-in")).ok()).toBe(false);
});

test("a project page deletes its own project and returns to the Projects list", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("button", { name: "Delete project" }).click();
  await page.getByRole("dialog", { name: "Delete this project?" }).getByRole("button", { name: "Delete project" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await expect(page.getByText("No saved plans yet")).toBeVisible();
});
