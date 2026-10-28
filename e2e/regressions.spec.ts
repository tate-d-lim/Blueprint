import { expect, test, type Page } from "@playwright/test";

const DEMO = "c=restricted&s=sn&i=slight&d=min&k=";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

const mainNav = (page: Page) => page.locator("sgds-mainnav");

test("opening a saved project does not save anything", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", r => r.method() === "POST" && writes.push(r.url()));
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("heading", { name: "Your build plan" }).waitFor();
  // The form components announce their starting values once they load; none of that is an edit.
  await page.waitForTimeout(1500);
  expect(writes).toEqual([]);
});

test("a saved project keeps its changes after you leave the page and press Back", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  const status = page.locator('sgds-select[name="status-cs-3"]');
  await expect(status.getByRole("textbox")).toHaveValue("To do");
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await status.getByRole("textbox").click();
  await status.getByRole("menuitem", { name: "Done" }).click();
  await saved;
  await mainNav(page).getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goBack();
  await expect(page.locator('sgds-select[name="status-cs-3"]').getByRole("textbox")).toHaveValue("Done");
});

test("your tool picks survive leaving the plan page and pressing Back", async ({ page }) => {
  await page.goto(`/plan?${DEMO}&t=appcentral`);
  await page.getByRole("checkbox", { name: /DBaaS/ }).check();
  await mainNav(page).getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goBack();
  await expect(page.getByRole("checkbox", { name: /DBaaS/ })).toBeChecked();
});

test("builder screens never show GovTech's wording about the agency, controls or an SSP", async ({ page }) => {
  await page.goto(`/plan?${DEMO}&t=websg,isomer`);
  await page.getByRole("heading", { name: "Your build plan" }).waitFor();
  const text = await page.evaluate(async () => {
    document.querySelectorAll("details").forEach(d => (d.open = true));
    document.querySelectorAll("sgds-accordion-item").forEach(item => ((item as HTMLElement & { open: boolean }).open = true));
    await new Promise(resolve => setTimeout(resolve, 800)); // the accordions animate open
    return (document.querySelector("main") as HTMLElement).innerText;
  });
  expect([...text.matchAll(/\b(IM8|SSP|OSCAL|controls?|agency|agencies)\b/gi)].map(m => m[0])).toEqual([]);
});
