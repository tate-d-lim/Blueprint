import { expect, test } from "@playwright/test";
import { DEMO_QUERY, LOW_QUERY, answerDemoFacts, answerLowRisk, saveDemoPlan } from "./helpers";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

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

test("step 3 asks about GenAI and keeps the answers on the way back", async ({ page }) => {
  await page.goto(`/start/app?${LOW_QUERY}`);
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await expect(page.getByRole("group", { name: "Does your app use generative AI, for example a chatbot or a text summary?" })).toBeVisible();
  await answerDemoFacts(page);
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await expect(page).toHaveURL(/\/start\/needs\?.*f=/);
  await page.goBack();
  await expect(page.getByRole("checkbox", { name: "It sends SMS text messages" })).toBeChecked();
});

test("step 4: the line, CCTV details, and the save opens step 5", async ({ page }) => {
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
  await expect(page.getByText("This is everything your app needs: 84 requirements in 11 parts. Next, you choose the tools that meet part of it.")).toBeVisible();
  await expect(page.getByText("Point at a part, or pick it in the list, to see what it asks for.")).toBeVisible();
  const cctv = page.getByRole("button", { name: /CCTV · Logging/ });
  await cctv.click();
  await expect(cctv).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("A record of who did what, and when, so problems can be found and traced.")).toBeVisible();
  await page.getByText("Show all 10 requirements").click();
  await expect(page.getByText("Official wording")).toHaveCount(10);
  await page.keyboard.press("Escape");
  await expect(cctv).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByLabel("Plan name")).toHaveValue("Low-Risk Cloud app");
  await expect(page.getByRole("link", { name: /build plan/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Save this plan" }).dblclick();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/tools$/);
  await page.goto("/projects");
  await expect(page.getByRole("link", { name: "Low-Risk Cloud app" })).toHaveCount(1);
});

test("Back from step 5 lands on step 3", async ({ page }) => {
  await page.goto(`/start/app?${LOW_QUERY}`);
  await answerDemoFacts(page);
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await page.getByRole("button", { name: "Save this plan" }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/start\/app\?/);
});

test("old links go to step 4 with their answers", async ({ page }) => {
  await page.goto(`/plan?${DEMO_QUERY}&t=appcentral`);
  await expect(page).toHaveURL(/\/start\/needs\?.*c=restricted/);
  await page.goto(`/start/review?${DEMO_QUERY}`);
  await expect(page).toHaveURL(/\/start\/needs\?/);
});

test("a step 4 link with an unknown project is not found", async ({ page }) => {
  const res = await page.goto(`/start/needs?${DEMO_QUERY}&project=nope`);
  expect(res?.status()).toBe(404);
});

test("editing a saved project writes to the same project and keeps statuses", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("link", { name: "Change answers" }).click();
  await expect(page).toHaveURL(/\/start\/needs\?.*project=sample-two-weeks-in/);
  await page.getByRole("link", { name: "Change app details" }).click();
  await page.getByRole("radio", { name: "Government staff only" }).check();
  await page.getByRole("group", { name: "Does your app use generative AI, for example a chatbot or a text summary?" }).getByRole("radio", { name: "No" }).check();
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await page.getByRole("button", { name: "Save changes to Sample project (two weeks in)" }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in$/);
  await expect(page.getByRole("heading", { name: /^Your plan is ready\./ })).toBeVisible();
  await expect(page.getByText(/\d+ of \d+ tasks done/)).toBeVisible(); // statuses are kept; the new facts may leave some tasks out
  await page.goto("/projects");
  await expect(page.getByRole("link", { name: /Sample project/ })).toHaveCount(1);
});

test("a profile change is announced and the save opens step 5", async ({ page }) => {
  await page.goto(`/start/needs?c=restricted&s=sh&i=slight&d=min&k=&project=sample-two-weeks-in`);
  await expect(page.getByText(/^Your app type changes from Low-Risk Cloud to Medium-Risk Cloud\. \d+ tasks are added\. Tasks you marked done stay done\.$/)).toBeVisible();
  await page.getByRole("button", { name: /^Save changes to / }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in\/tools$/);
});

test("leaving with unsaved changes asks first", async ({ page }) => {
  await page.goto(`/start/needs?c=restricted&s=sn&i=none&d=min&k=&f=reach.public&project=sample-two-weeks-in`);
  await page.getByRole("button", { name: /CCTV · Logging/ }).click(); // the browser asks only after a user action on the page
  const dialog = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  expect((await dialog).type()).toBe("beforeunload");
});

test("step 5: ticks build the plan, save at once, and keep their order", async ({ page }) => {
  const id = await saveDemoPlan(page);
  await expect(page.getByText("Step 5 of 5")).toBeVisible();
  await expect(page.getByText("Tick the tools that are part of your app.")).toBeVisible();
  await expect(page.getByText("84 are yours · 0 your tools do · 0 questions")).toBeVisible();
  const order = () => page.locator("[data-tool-id]").evaluateAll(els => els.map(e => (e as HTMLElement).dataset.toolId));
  const before = await order();
  await page.getByRole("checkbox", { name: "appCentral" }).check();
  await expect(page.getByText("18 are yours · 51 your tools do · 15 questions")).toBeVisible();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  expect(await order()).toEqual(before);
  await page.getByRole("checkbox", { name: "DBaaS" }).check();
  await page.getByRole("checkbox", { name: "IGA" }).check();
  await expect(page.getByText("18 are yours · 66 your tools do (15 not yet verified) · 0 questions")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "IGA" })).toBeChecked();
  await page.goto(`/projects/${id}`);
  await expect(page).toHaveURL(new RegExp(`/projects/${id}/tools$`));
  await page.getByRole("button", { name: "Continue to your plan" }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
  await page.goto(`/projects/${id}`);
  await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
});

test("a tool row states both sides", async ({ page }) => {
  await saveDemoPlan(page);
  await expect(page.getByText("Removes 51 tasks · adds 15 questions")).toBeVisible();
  await expect(page.getByText("No Low-Risk Cloud coverage yet")).toBeVisible();
});

test("an unknown project has no tools page", async ({ page }) => {
  expect((await page.goto("/projects/nope/tools"))?.status()).toBe(404);
});

test("Medium: you can plan it, and no tool covers it yet", async ({ page }) => {
  await page.goto("/start/verdict?c=restricted&s=sh&i=slight&d=min&k=");
  await expect(page.getByRole("heading", { level: 1, name: "Medium-Risk Cloud" })).toBeVisible();
  await expect(page.getByText("No tool covers Medium-Risk Cloud yet, so more of the work is yours.")).toBeVisible();
  await page.goto("/start/needs?c=restricted&s=sh&i=slight&d=min&k=&f=uses-genai.no");
  await expect(page.getByText("No tool covers Medium-Risk Cloud yet, so every part is yours.")).toBeVisible();
});
