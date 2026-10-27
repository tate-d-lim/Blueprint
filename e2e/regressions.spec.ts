import { expect, test } from "@playwright/test";

const DEMO = "c=restricted&s=sn&i=slight&d=min&k=";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("a saved project keeps its changes after you leave the page and press Back", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await page.getByLabel("Status for cs-3").selectOption("done");
  await saved;
  await page.getByRole("navigation").getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goBack();
  await expect(page.getByLabel("Status for cs-3")).toHaveValue("done");
});

test("your tool picks survive leaving the plan page and pressing Back", async ({ page }) => {
  await page.goto(`/plan?${DEMO}&t=appcentral`);
  await page.getByRole("checkbox", { name: /DBaaS/ }).check();
  await page.getByRole("navigation").getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goBack();
  await expect(page.getByRole("checkbox", { name: /DBaaS/ })).toBeChecked();
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
