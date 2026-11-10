import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

/** Restricted, Sensitive Normal, Slight, None or minimal. */
async function answerLowRisk(page: Page) {
  await page.getByRole("radio", { name: "Restricted" }).check();
  await page.getByRole("radio", { name: "Sensitive Normal" }).check();
  await page.getByRole("radio", { name: "Slight" }).check();
  await page.getByRole("radio", { name: "None or minimal" }).check();
}

test("step 1 to step 2, and back keeps every answer", async ({ page }) => {
  await page.goto("/start");
  await answerLowRisk(page);
  await page.getByRole("button", { name: "Work out my app type" }).click();
  await expect(page).toHaveURL(/\/start\/verdict\?/);
  await expect(page.getByRole("heading", { level: 1, name: "Low-Risk Cloud" })).toBeVisible();
  await expect(page.getByText("You can plan this app with Blueprint.")).toBeVisible();
  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await page.getByRole("link", { name: "Change answers" }).click();
  await expect(page.getByRole("radio", { name: "Restricted" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Slight" })).toBeChecked();
});

test("Critical impact without CII cannot be planned yet, with who to ask", async ({ page }) => {
  await page.goto("/start/verdict?c=restricted&s=sn&i=critical&d=min&k=");
  await expect(page.getByText("Blueprint can't plan this app yet.")).toBeVisible();
  await expect(page.getByText("Your IT security officer (ACISO or MCISO)")).toBeVisible();
  await expect(page.getByRole("link", { name: "Next: about your app" })).toHaveCount(0);
});

test("Confidential data is not for the cloud", async ({ page }) => {
  await page.goto("/start/verdict?c=conf&s=sn&i=slight&d=min&k=");
  await expect(page.getByText("This data can't be hosted on the cloud, so Blueprint can't plan it with CPF's cloud tools.")).toBeVisible();
});

test("a verdict link with a broken answer opens step 1 with the rest filled in", async ({ page }) => {
  await page.goto("/start/verdict?c=bad&s=sn&i=slight&d=min&k=");
  await expect(page).toHaveURL(/\/start\?/);
  await expect(page.getByRole("radio", { name: "Sensitive Normal" })).toBeChecked();
});
