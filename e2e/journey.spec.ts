import { expect, test } from "@playwright/test";
import { DEMO_QUERY, LOW_QUERY, answerDemoFacts, answerLowRisk, expectStep, openTools, saveDemoPlan } from "./helpers";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("step 1 to step 2, and back keeps every answer", async ({ page }) => {
  await page.goto("/start");
  await answerLowRisk(page);
  await page.getByRole("button", { name: "Find your app type" }).click();
  await expect(page).toHaveURL(/\/start\/verdict\?/);
  await expect(page.getByRole("heading", { level: 1, name: "Low-Risk Cloud" })).toBeVisible();
  await expect(page.getByText("Blueprint can plan your app.")).toBeVisible();
  await expectStep(page, 2);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page.getByRole("radio", { name: "Restricted" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Slight" })).toBeChecked();
});

test("Critical impact without CII cannot be planned yet, with who to ask", async ({ page }) => {
  await page.goto("/start/verdict?c=restricted&s=sn&i=critical&d=min&k=");
  await expect(page.getByText("Blueprint cannot plan your app yet.")).toBeVisible();
  await expect(page.getByText("Your IT security officer (ACISO or MCISO)")).toBeVisible();
  await expect(page.getByRole("link", { name: "Next: about your app" })).toHaveCount(0);
});

test("a new plan asks one question at a time, and an answer can be changed on the way", async ({ page }) => {
  await page.goto("/start");
  await expectStep(page, 1);
  await expect(page.getByRole("radio")).toHaveCount(6);
  await expect(page.getByRole("button", { name: "Next question" })).toBeDisabled();
  await expect(page.locator("span").getByText("Question 1 of 4")).toBeVisible();
  await page.getByRole("radio", { name: "Restricted" }).check();
  await page.getByRole("button", { name: "Next question" }).click();
  await expect(page.getByRole("group", { name: "How sensitive is the data?" })).toBeVisible();
  await expect(page.locator("span").getByText("Question 2 of 4")).toBeVisible();
  const sofar = page.getByRole("definition").filter({ hasText: "Restricted" });
  await expect(sofar).toBeVisible();
  await page.getByRole("button", { name: "Previous question" }).click();
  await expect(page.getByRole("radio", { name: "Restricted" })).toBeChecked();
  await page.getByRole("radio", { name: "Official (Open)" }).check();
  await page.getByRole("button", { name: "Next question" }).click();
  for (const name of ["Sensitive Normal", "Slight"]) {
    await page.getByRole("radio", { name }).check();
    await page.getByRole("button", { name: "Next question" }).click();
  }
  await expect(page.locator("span").getByText("Question 4 of 4")).toBeVisible();
  await page.getByRole("radio", { name: "None or minimal" }).check();
  await expect(page.getByRole("button", { name: "Find your app type" })).toBeEnabled();
  await page.getByRole("button", { name: "Change highest data classification" }).click();
  await page.getByRole("radio", { name: "Restricted" }).check();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next question" }).click();
  await page.getByRole("button", { name: "Find your app type" }).click();
  await expect(page).toHaveURL(/\/start\/verdict\?c=restricted&s=sn&i=slight&d=min/);
});

test("help me choose works out the classification with the RML decision tree", async ({ page }) => {
  await page.goto("/start");
  await page.getByText("Help me choose").click();
  await expect(page.getByText("Would a leak cause some damage to the nation?")).toBeVisible();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByText("Would a leak cause some damage to CPFB?")).toBeVisible();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Restricted" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Next question" })).toBeEnabled();
  await page.getByRole("button", { name: "Start again" }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Official (Open)" })).toBeChecked();
});

test("show all questions puts every question on the page at once", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("button", { name: "Show all questions" }).click();
  await expect(page.getByRole("radio")).toHaveCount(6 + 3 + 5 + 2);
  await expect(page.getByRole("button", { name: "Find your app type" })).toBeDisabled();
});

test("Back on each step goes one step back, and Back on step 1 goes to Projects", async ({ page }) => {
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expectStep(page, 4);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/start\/app\?/);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/start\/verdict\?/);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/start\?/);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  // A saved project is no step: it has tabs, not steps.
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByRole("navigation", { name: "Steps" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Project" }).locator('[aria-current="page"]')).toHaveText("Plan");
});

test("the header shows no step; the step is on the page", async ({ page }) => {
  await page.goto("/start");
  await expect(page.getByRole("banner").getByText(/Step \d of 4/)).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("navigation", { name: "Steps" })).toBeVisible();
});

test("Confidential data is not for the cloud", async ({ page }) => {
  await page.goto("/start/verdict?c=conf&s=sn&i=slight&d=min&k=");
  await expect(page.getByText("This data cannot go on the cloud, so Blueprint cannot plan your app with CPF's cloud tools.")).toBeVisible();
});

test("a verdict link with a broken answer opens step 1 with the rest filled in", async ({ page }) => {
  await page.goto("/start/verdict?c=bad&s=sn&i=slight&d=min&k=");
  await expect(page).toHaveURL(/\/start\?/);
  await expect(page.getByRole("radio", { name: "Sensitive Normal" })).toBeChecked();
});

test("step 3 asks about GenAI and keeps the answers on the way back", async ({ page }) => {
  await page.goto(`/start/app?${LOW_QUERY}`);
  await expectStep(page, 3);
  await expect(page.getByRole("group", { name: "Is generative AI part of your app, for example a chatbot or a text summary?" })).toBeVisible();
  await answerDemoFacts(page);
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await expect(page).toHaveURL(/\/start\/needs\?.*f=/);
  await page.goBack();
  await expect(page.getByRole("checkbox", { name: "SMS text messages" })).toBeChecked();
});

test("step 3 asks about the AI features, and the saved plan has no question left about them", async ({ page }) => {
  await page.goto(`/start/app?${LOW_QUERY}`);
  await expectStep(page, 3);
  const genai = page.getByRole("group", { name: "Is generative AI part of your app, for example a chatbot or a text summary?" });
  const service = page.getByRole("checkbox", { name: "It calls an AI service that another company runs" });
  const overseas = page.getByRole("checkbox", { name: "That AI service runs overseas" });
  const host = page.getByRole("checkbox", { name: "You host an AI model yourself" });
  const openWeights = page.getByRole("checkbox", { name: "That model is an open-weights model" });
  const uploads = page.getByRole("checkbox", { name: "Users can upload files to the AI feature" });

  // The AI questions come with a "Yes", and some hang on another answer.
  await expect(service).toHaveCount(0);
  await genai.getByRole("radio", { name: "Yes" }).check();
  await expect(service).toBeVisible();
  await expect(host).toBeVisible();
  await expect(uploads).toBeVisible();
  await expect(overseas).toHaveCount(0);
  await expect(openWeights).toHaveCount(0);
  await service.check();
  await expect(overseas).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "That AI service runs in Singapore" })).toBeVisible();
  await host.check();
  await expect(openWeights).toBeVisible();
  await genai.getByRole("radio", { name: "No" }).check();
  await expect(service).toHaveCount(0);
  await genai.getByRole("radio", { name: "Yes" }).check();

  await page.getByRole("radio", { name: "Members of the public" }).check();
  await page.getByRole("checkbox", { name: "A website or web app" }).check();
  await service.check();
  await overseas.check();
  await uploads.check();
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await page.getByRole("button", { name: "Save this plan" }).click();
  await page.waitForURL(/\/projects\/[^/]+$/);

  // Nothing is left to decide. What the answers rule out is listed, with the reason.
  await expect(page.getByRole("region", { name: "Decide first" })).toHaveCount(0);
  await expect(page.getByText("Protect file uploads in AI features")).toBeVisible();
  await page.locator("summary", { hasText: "Does not apply to your app" }).click();
  await expect(page.getByText("Limit data sent to Singapore-hosted AI services")).toBeVisible();
});

test("step 4: the tour, a part close up, and the save opens the plan page", async ({ page }) => {
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expectStep(page, 4);
  await expect(page.getByRole("heading", { level: 1, name: "Here is your application’s security plan" })).toBeVisible();
  await expect(page.getByText("Click on each part of the hotel to learn more about that set of controls.")).toBeVisible();
  await expect(page.getByText("Your app needs 84 controls, in 11 parts. After you save, pick the tools that do some of them for you.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Change/ })).toHaveCount(0);

  // The tour: one tooltip at a time. The labels wait for step 2, and step 3 moves in on the entrance.
  const tip = page.getByRole("dialog");
  await expect(tip).toContainText("Step 1 of 4");
  await expect(tip).toContainText("Based on your answers previously, here is your System Security Plan (SSP).");
  await expect(page.locator('[data-label="cctv"]')).toBeHidden();
  const next = tip.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await expect(tip).toContainText("the foundation is your infrastructure, and the room keycards are access.");
  await expect(page.locator('[data-label="cctv"]')).toBeVisible();
  await next.click();
  await expect(tip).toContainText("Your app has 8 of them.");
  await expect(page.locator("[data-hotel]")).toHaveAttribute("data-focus", "entrance");
  await tip.getByRole("button", { name: "Back" }).click();
  await expect(tip).toContainText("Step 2 of 4");
  await next.click();
  await next.click();
  await expect(tip).toContainText("When you are ready, save this plan.");
  await expect(page.locator("[data-hotel]")).toHaveAttribute("data-focus", "");
  await tip.getByRole("button", { name: "Explore the hotel" }).click();
  await expect(tip).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(page.getByRole("button", { name: "Show the tour again" })).toBeVisible();

  await page.getByRole("button", { name: /Logging · CCTV/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Logging" })).toBeFocused();
  await expect(page.getByText("Part 2 of 11")).toBeVisible();
  await expect(page.getByText("A record of who did what, and when, so problems can be found and traced.")).toBeVisible();
  await expect(page.getByText("Your app has 10 controls in this part.")).toBeVisible();
  await page.getByText("Show all 10 controls").click();
  await expect(page.getByText("Official wording")).toHaveCount(10);
  await page.getByRole("button", { name: "Next: Containers · Hotel rooms" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Containers" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 1, name: "Here is your application’s security plan" })).toBeVisible();

  await expect(page.getByLabel("Plan name")).toHaveValue("Low-Risk Cloud app");
  await expect(page.getByRole("link", { name: /build plan/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Save this plan" }).dblclick();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  await page.goto("/projects");
  await expect(page.getByRole("link", { name: "Low-Risk Cloud app" })).toHaveCount(1);
});

test("Back from the saved plan lands on step 3", async ({ page }) => {
  await page.goto(`/start/app?${LOW_QUERY}`);
  await answerDemoFacts(page);
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await page.getByRole("button", { name: "Save this plan" }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
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
  await expect(page).toHaveURL(/\/start\/app\?.*project=sample-two-weeks-in/);
  await page.getByRole("radio", { name: "Government staff only" }).check();
  await page.getByRole("group", { name: "Is generative AI part of your app, for example a chatbot or a text summary?" }).getByRole("radio", { name: "No" }).check();
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await page.getByRole("button", { name: "Save changes to Sample project (two weeks in)" }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sample project (two weeks in)" })).toBeVisible();
  await expect(page.getByText(/\d+ of \d+ done/).first()).toBeVisible(); // statuses are kept; the new facts may leave some controls out
  await page.goto("/projects");
  await expect(page.getByRole("link", { name: /Sample project/ })).toHaveCount(1);
});

test("opening a saved project from Projects shows the hotel beside the checklist, with no steps", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("link", { name: /Sample project/ }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sample project (two weeks in)" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Steps" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0); // no tour for a saved project
  await expect(page.locator("[data-hotel]")).toBeVisible();
  await expect(page.getByRole("region", { name: "Your controls" })).toBeVisible();
});

test("a click on a part of the hotel opens the Hotel tab close up, and Escape goes back to the whole hotel", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Walls, windows and doors/ }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in\/hotel\?part=walls$/);
  await expect(page.getByRole("heading", { level: 2, name: "App security" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Project" }).locator('[aria-current="page"]')).toHaveText("Hotel");
  await expect(page.getByText(/^\d+ of \d+ done/).first()).toBeVisible(); // the header stays
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 2, name: "Explore your hotel" })).toBeVisible();
  await expect(page).not.toHaveURL(/part=/);
});

test("the Hotel tab opens on the part named in its link", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in/hotel?part=cctv");
  await expect(page.getByRole("heading", { level: 2, name: "Logging" })).toBeVisible();
  await page.goto("/projects/sample-two-weeks-in/hotel?part=nope");
  await expect(page.getByRole("heading", { level: 2, name: "Explore your hotel" })).toBeVisible();
});

test("a profile change is announced and the save opens the plan page", async ({ page }) => {
  await page.goto(`/start/needs?c=restricted&s=sh&i=slight&d=min&k=&project=sample-two-weeks-in`);
  await expect(page.getByText(/^Your app type changes from Low-Risk Cloud to Medium-Risk Cloud\. \d+ controls are added\. Controls you marked done stay done\.$/)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0); // the tour is for a new plan only
  await page.getByRole("button", { name: /^Save changes to / }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in$/);
});

test("leaving with unsaved changes asks first", async ({ page }) => {
  await page.goto(`/start/needs?c=restricted&s=sn&i=none&d=min&k=&f=reach.public&project=sample-two-weeks-in`);
  await page.getByRole("button", { name: /Logging · CCTV/ }).click(); // the browser asks only after a user action on the page
  const dialog = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  expect((await dialog).type()).toBe("beforeunload");
});

test("tools: a pick marks its controls done at once, saves, and keeps the order of the list", async ({ page }) => {
  const id = await saveDemoPlan(page);
  await expect(page.getByRole("heading", { level: 1, name: "Low-Risk Cloud app" })).toBeVisible(); // a new plan opens on the plan page
  await expect(page.getByText("No tools yet.")).toBeVisible();
  await expect(page.getByText("0 of 84 done")).toBeVisible();
  await openTools(page);
  const order = () => page.locator("[data-tool-id]").evaluateAll(els => els.map(e => (e as HTMLElement).dataset.toolId));
  const before = await order();
  await page.getByRole("checkbox", { name: "appCentral" }).check();
  await expect(page.getByText("51 of 84 done")).toBeVisible();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  expect(await order()).toEqual(before);
  await page.getByRole("checkbox", { name: "DBaaS" }).check();
  await page.getByRole("checkbox", { name: "IGA" }).check();
  await expect(page.getByText("66 of 84 done")).toBeVisible();
  await page.reload();
  await expect(page.getByText("appCentral, DBaaS, IGA")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
});

test("a tool row states both sides", async ({ page }) => {
  await saveDemoPlan(page);
  await openTools(page);
  await expect(page.getByText("Does 51 controls")).toBeVisible();
  await expect(page.getByText("No Low-Risk Cloud coverage yet")).toBeVisible();
});

test("an unknown project has no plan and no hotel", async ({ page }) => {
  expect((await page.goto("/projects/nope"))?.status()).toBe(404);
  expect((await page.goto("/projects/nope/hotel"))?.status()).toBe(404);
});

test("Medium: you can plan it, and no tool covers it yet", async ({ page }) => {
  await page.goto("/start/verdict?c=restricted&s=sh&i=slight&d=min&k=");
  await expect(page.getByRole("heading", { level: 1, name: "Medium-Risk Cloud" })).toBeVisible();
  await expect(page.getByText("No tool covers Medium-Risk Cloud yet, so more of the work is yours.")).toBeVisible();
  await page.goto("/start/needs?c=restricted&s=sh&i=slight&d=min&k=&f=uses-genai.no");
  await expect(page.getByText("No tool covers Medium-Risk Cloud yet, so every part is yours.")).toBeVisible();
});
