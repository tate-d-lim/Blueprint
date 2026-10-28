import { expect, test, type Page } from "@playwright/test";

const DEMO = "c=restricted&s=sn&i=slight&d=min&k=";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

const sheets = (page: Page) => page.getByRole("navigation", { name: "Sheets" });

test("opening a saved project does not save anything", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", r => r.method() === "POST" && writes.push(r.url()));
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("heading", { name: "Your build plan" }).waitFor();
  // Give any stray save on load time to fire; none should.
  await page.waitForTimeout(1500);
  expect(writes).toEqual([]);
});

test("a saved project keeps its changes after you leave the page and press Back", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  const status = page.locator('select[name="status-cs-3"]');
  await expect(status).toHaveValue("todo");
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await status.selectOption({ label: "Done" });
  await saved;
  await sheets(page).getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goBack();
  await expect(page.locator('select[name="status-cs-3"]')).toHaveValue("done");
});

test("your tool picks survive leaving the plan page and pressing Back", async ({ page }) => {
  await page.goto(`/plan?${DEMO}&t=appcentral`);
  await page.getByRole("checkbox", { name: /DBaaS/ }).check();
  await sheets(page).getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goBack();
  await expect(page.getByRole("checkbox", { name: /DBaaS/ })).toBeChecked();
});

test("a saved project's name and owner sit in the title block, and leave it on other sheets", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  const titleBlock = page.getByRole("banner");
  await expect(titleBlock.getByText("Sample project (two weeks in)")).toBeVisible();
  await expect(titleBlock.getByText("Sample builder")).toBeVisible();
  // A client-side move must clear them too, not only a full page load.
  await sheets(page).getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(titleBlock.getByText("Sample builder")).toHaveCount(0);
});

test("builder screens never show GovTech's wording about the agency, controls or an SSP", async ({ page }) => {
  await page.goto(`/plan?${DEMO}&t=websg,isomer`);
  await page.getByRole("heading", { name: "Your build plan" }).waitFor();
  const text = await page.evaluate(() => {
    document.querySelectorAll("details").forEach(d => (d.open = true));
    return (document.querySelector("main") as HTMLElement).innerText;
  });
  expect([...text.matchAll(/\b(IM8|SSP|OSCAL|controls?|agency|agencies)\b/gi)].map(m => m[0])).toEqual([]);
});
