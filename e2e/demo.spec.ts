import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("the demo path: answer, pick tools, watch the counts move, download both files", async ({ page, request }) => {
  await request.post("/api/reset");

  // 1. Tell us about your app
  await page.goto("/start");
  await page.getByText("Restricted", { exact: true }).click();
  await page.getByText("Sensitive Normal", { exact: true }).click();
  await page.getByText("Slight", { exact: true }).click();
  await page.getByText("None or minimal", { exact: true }).click();
  await page.getByRole("button", { name: "Work out my app type" }).click();
  await expect(page.getByRole("heading", { name: "Low-risk app on the cloud" })).toBeVisible();

  // SGDS draws a link styled as a button with role "button", so these navigations are found as buttons.

  // 2. Pick your tools
  await page.getByRole("button", { name: "See your build plan" }).click();
  const countOf = (heading: string) =>
    page.locator("section", { has: page.getByRole("heading", { name: heading, exact: true }) }).locator("span").first();
  await page.getByRole("checkbox", { name: /appCentral/ }).check();
  await page.getByRole("checkbox", { name: /DBaaS/ }).check();
  await page.getByRole("checkbox", { name: /IGA/ }).check();
  await expect(countOf("What you need to do")).toHaveText("11");
  await expect(countOf("Questions to answer")).toHaveText("9");

  // The counts move when a tool is taken away, and say why.
  await page.getByRole("checkbox", { name: /DBaaS/ }).uncheck();
  await expect(page.getByText("appCentral expects DBaaS for 4 requirements")).toBeVisible();
  await expect(countOf("Questions to answer")).toHaveText("13");
  await page.getByRole("checkbox", { name: /DBaaS/ }).check();
  await expect(countOf("Questions to answer")).toHaveText("9");

  // 3. Hand it to your agent
  const plan = page.waitForEvent("download");
  await page.getByRole("button", { name: "Build plan for your agent" }).click();
  const planDownload = await plan;
  expect(planDownload.suggestedFilename()).toBe("BUILD-PLAN.md");
  expect(readFileSync((await planDownload.path())!, "utf8")).toContain("## 1. What you need to do (11)");

  // 4. The security review spreadsheet
  const sheet = page.waitForEvent("download");
  await page.getByRole("button", { name: "Security review spreadsheet" }).click();
  expect((await sheet).suggestedFilename()).toBe("low-risk-cloud-ssp.xlsx");
});
