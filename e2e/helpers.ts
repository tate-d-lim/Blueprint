import { expect, type Page } from "@playwright/test";

/** The demo app's risk answers only: Restricted, Sensitive Normal, Slight, None or minimal, no CII, no SII. */
export const LOW_QUERY = "c=restricted&s=sn&i=slight&d=min&k=";

/** The risk answers and the demo facts (public, web, sign-in, SMS; no domain, no short links). */
export const DEMO_QUERY = `${LOW_QUERY}&f=reach.public,web.yes,signin.yes,sms.yes,domain.no,shortlinks.no`;

/** Step 1: Restricted, Sensitive Normal, Slight, None or minimal. */
export async function answerLowRisk(page: Page) {
  // A new plan asks one question at a time.
  for (const name of ["Restricted", "Sensitive Normal", "Slight", "None or minimal"]) {
    await page.getByRole("radio", { name }).check();
    await page.getByRole("button", { name: "Next question" }).click();
  }
}

/** The step bar at the top of a step page marks step n as the current one. */
export async function expectStep(page: Page, n: 1 | 2 | 3 | 4) {
  await expect(page.getByRole("navigation", { name: "Steps" }).locator('[aria-current="step"]')).toContainText(`(step ${n} of 4)`);
}

/** Step 4 on a new plan opens with a tour in tooltips. This closes it, so the labels show. */
export async function skipTour(page: Page) {
  await page.getByRole("button", { name: "Skip the tour" }).click();
  await expect(page.locator("[data-tour-step]")).toHaveCount(0);
}

/** Step 3: public, web, sign-in and SMS ticked, GenAI no. */
export async function answerDemoFacts(page: Page) {
  await page.getByRole("radio", { name: "Members of the public" }).check();
  await page.getByRole("checkbox", { name: "A website or web app" }).check();
  await page.getByRole("checkbox", { name: "Sign-in" }).check();
  await page.getByRole("checkbox", { name: "SMS text messages" }).check();
  await page.getByRole("group", { name: "Is generative AI part of your app, for example a chatbot or a text summary?" }).getByRole("radio", { name: "No" }).check();
}

/** Opens step 4 and waits until the page has the line about the totals. */
export async function openNeeds(page: Page, query = DEMO_QUERY) {
  await page.goto(`/start/needs?${query}`);
  await expectStep(page, 4);
}

/** Steps 1 to 4 through the screens with the demo answers. Saves the plan and returns the new project's id (the plan page is open). */
export async function saveDemoPlan(page: Page): Promise<string> {
  await page.goto("/start");
  await answerLowRisk(page);
  await page.getByRole("button", { name: "Find your app type" }).click();
  await page.getByRole("link", { name: "Next: about your app" }).click();
  await answerDemoFacts(page);
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await page.getByRole("button", { name: "Save this plan" }).click();
  await page.waitForURL(/\/projects\/[^/]+$/);
  return new URL(page.url()).pathname.split("/")[2];
}

/** On a saved project's Plan tab: open the tools drawer from the "Your tools" row. */
export async function openTools(page: Page) {
  await page.getByRole("button", { name: /^(Add|Change) tools$/ }).click();
  await expect(page.getByRole("dialog", { name: "Your tools" })).toBeVisible();
}

/** Close the tools drawer, so the plan behind it can be read. */
export async function closeTools(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Your tools" })).toHaveCount(0);
}

type Box = { id: string; x: number; y: number; w: number; h: number };

/** The bounding boxes of every hotel label, by part. */
async function labelBoxes(page: Page): Promise<Box[]> {
  return page.locator("[data-label]").evaluateAll(els =>
    els.map(e => {
      const r = e.getBoundingClientRect();
      return { id: (e as HTMLElement).dataset.label!, x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
}

/** Pairs of hotel labels whose boxes intersect. Empty means the labels do not overlap. */
export async function overlaps(page: Page): Promise<string[]> {
  const boxes = await labelBoxes(page);
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.push(`${a.id} / ${b.id}`);
    }
  return out;
}

/** Labels whose box leaves the hotel stage. */
export async function outsideStage(page: Page): Promise<string[]> {
  const stage = await page.locator("[data-hotel]").boundingBox();
  if (!stage) throw new Error("No hotel stage on the page");
  return (await labelBoxes(page))
    .filter(b => b.x < stage.x - 0.5 || b.y < stage.y - 0.5 || b.x + b.w > stage.x + stage.width + 0.5 || b.y + b.h > stage.y + stage.height + 0.5)
    .map(b => b.id);
}

/** On step 4 with the demo answers: save the plan, open its tools page, then tick a tool. */
export async function saveAndTick(page: Page, toolName: string) {
  await page.getByRole("button", { name: "Save this plan" }).click();
  await page.waitForURL(/\/projects\/[^/]+$/);
  await openTools(page);
  await page.getByRole("checkbox", { name: toolName }).check();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await closeTools(page);
}
