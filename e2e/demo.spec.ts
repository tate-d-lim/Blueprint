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

  // 2. About your app: the answers leave out what cannot apply
  await page.getByRole("link", { name: "Next: about your app" }).click();
  await page.getByText("Members of the public", { exact: true }).click();
  await page.getByRole("checkbox", { name: /People use it in a web browser/ }).check();
  await page.getByRole("checkbox", { name: /People sign in to it/ }).check();
  await page.getByRole("checkbox", { name: /It sends SMS text messages/ }).check();
  await page.getByRole("button", { name: "Next: how we read your app" }).click();
  await expect(page.getByRole("heading", { name: "How we read your app" })).toBeVisible();
  await expect(page.getByText("Left out because of your answers (2)")).toBeVisible();

  // 3. Pick your tools
  await page.getByRole("link", { name: "See your build plan" }).click();
  const countOf = (heading: string) =>
    page.locator("section", { has: page.getByRole("heading", { name: heading, exact: true }) }).locator("span").first();
  await page.getByRole("checkbox", { name: /appCentral/ }).check();
  await page.getByRole("checkbox", { name: /DBaaS/ }).check();
  await page.getByRole("checkbox", { name: /IGA/ }).check();
  await expect(countOf("What you need to do")).toHaveText("18");
  await expect(countOf("Questions to answer")).toHaveText("0");

  // The counts move when a tool is taken away, and say why.
  await page.getByRole("checkbox", { name: /DBaaS/ }).uncheck();
  await expect(page.getByText("appCentral expects DBaaS for 4 requirements")).toBeVisible();
  await expect(countOf("Questions to answer")).toHaveText("4");
  await page.getByRole("checkbox", { name: /DBaaS/ }).check();
  await expect(countOf("Questions to answer")).toHaveText("0");

  // 4. Hand it to your agent
  await page.getByRole("button", { name: "Export" }).click();
  const plan = page.waitForEvent("download");
  await page.getByRole("link", { name: "Build plan for your agent" }).click();
  const planDownload = await plan;
  expect(planDownload.suggestedFilename()).toBe("BUILD-PLAN.md");
  expect(readFileSync((await planDownload.path())!, "utf8")).toContain("## 1. What you need to do (18)");
  expect(readFileSync((await planDownload.path())!, "utf8")).toContain("## 4. Doesn't apply to this app (2)");

  // 5. The security review spreadsheet
  const sheet = page.waitForEvent("download");
  await page.getByRole("link", { name: "Security review spreadsheet" }).click();
  expect((await sheet).suggestedFilename()).toBe("low-risk-cloud-ssp.xlsx");
});
