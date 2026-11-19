import { expect, test, type BrowserContext } from "@playwright/test";

const asAdmin = (context: BrowserContext, baseURL: string) => context.addCookies([{ name: "role", value: "admin", url: baseURL }]);

test("an admin reads the catalog, discards an older release, and saves a plain text", async ({ page, request, context, baseURL }) => {
  await request.post("/api/reset");
  await asAdmin(context, baseURL!);

  // The sheet lists the controls of a profile, with a count for each profile.
  await page.goto("/admin/catalog");
  await expect(page.getByRole("heading", { name: "IM8 catalog", level: 1 })).toBeVisible();
  await expect(page.getByRole("group", { name: "Profile" }).getByRole("button", { name: /Low-Risk Cloud · 118 controls/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /^as-1 Input Validation/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Release history" }).getByRole("row")).toHaveCount(2);

  // Search narrows the list, and the empty state says what to do.
  await page.getByRole("searchbox", { name: "Find a control" }).fill("as-5");
  await expect(page.getByRole("row", { name: /^as-5 / })).toBeVisible();
  await page.getByRole("searchbox", { name: "Find a control" }).fill("zzzz");
  await expect(page.getByText('No control matches "zzzz".')).toBeVisible();
  await page.getByRole("button", { name: "Show all controls" }).click();

  // Upload the public OSCAL file: it has no as-15 and no is-15, so the review warns about the removal.
  await page.getByRole("link", { name: "Upload a release" }).click();
  await page.locator('input[type="file"]').setInputFiles("data/source/im8-reform.json");
  await page.getByRole("button", { name: "Check the file" }).click();
  await page.waitForURL(/\/admin\/catalog\/review\//);
  await expect(page.getByText(/^This release removes \d+ controls\.$/)).toBeVisible();
  await expect(page.getByRole("row", { name: /Removed as-15/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply this release" })).toBeVisible();

  // Discard leaves the catalog as it was.
  await page.getByRole("button", { name: "Discard" }).click();
  await page.waitForURL("**/admin/catalog");
  await expect(page.getByRole("region", { name: "Release history" }).getByRole("row")).toHaveCount(2);

  // A plain text is edited in the side panel and saved.
  await page.getByRole("button", { name: "Input Validation" }).click();
  const panel = page.getByRole("dialog", { name: /as-1: Input Validation/ });
  await expect(panel.getByRole("heading", { name: "Official wording" })).toBeVisible();
  await panel.getByRole("textbox", { name: "Title" }).fill("Check every input");
  await panel.getByRole("button", { name: "Save plain text" }).click();
  await expect(panel.getByText("Saved.")).toBeVisible();
  await panel.getByRole("button", { name: "Close", exact: true }).first().click();
  await expect(page.getByRole("row", { name: /^as-1 Input Validation/ })).toContainText("Check every input");
});

test("a builder reads the catalog but cannot change it", async ({ page, request }) => {
  await request.post("/api/reset");
  await page.goto("/admin/catalog");
  await expect(page.getByRole("heading", { name: "IM8 catalog", level: 1 })).toBeVisible();
  await expect(page.getByRole("row", { name: /^as-1 Input Validation/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Upload a release" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset all data" })).toHaveCount(0);
  await page.getByRole("button", { name: "Input Validation" }).click();
  const panel = page.getByRole("dialog", { name: /as-1: Input Validation/ });
  await expect(panel.getByRole("heading", { name: "Official wording" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Save plain text" })).toHaveCount(0);
  await expect(panel.getByRole("textbox")).toHaveCount(0);
});
