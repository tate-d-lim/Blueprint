import { expect, type Page } from "@playwright/test";

/** The demo app's risk answers only: Restricted, Sensitive Normal, Slight, None or minimal, no CII, no SII. */
export const LOW_QUERY = "c=restricted&s=sn&i=slight&d=min&k=";

/** The risk answers and the demo facts (public, web, sign-in, SMS; no domain, no short links). */
export const DEMO_QUERY = `${LOW_QUERY}&f=reach.public,web.yes,signin.yes,sms.yes,domain.no,shortlinks.no`;

/** Step 1: Restricted, Sensitive Normal, Slight, None or minimal. */
export async function answerLowRisk(page: Page) {
  await page.getByRole("radio", { name: "Restricted" }).check();
  await page.getByRole("radio", { name: "Sensitive Normal" }).check();
  await page.getByRole("radio", { name: "Slight" }).check();
  await page.getByRole("radio", { name: "None or minimal" }).check();
}

/** Step 3: public, web, sign-in and SMS ticked, GenAI no. */
export async function answerDemoFacts(page: Page) {
  await page.getByRole("radio", { name: "Members of the public" }).check();
  await page.getByRole("checkbox", { name: "People use it in a web browser" }).check();
  await page.getByRole("checkbox", { name: "People sign in to it" }).check();
  await page.getByRole("checkbox", { name: "It sends SMS text messages" }).check();
  await page.getByRole("group", { name: "Does your app use generative AI, for example a chatbot or a text summary?" }).getByRole("radio", { name: "No" }).check();
}

/** Opens step 4 and waits until the page has the line about the totals. */
export async function openNeeds(page: Page, query = DEMO_QUERY) {
  await page.goto(`/start/needs?${query}`);
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
}

/** Steps 1 to 4 through the screens with the demo answers. Saves the plan and returns the new project's id (step 5 is open). */
export async function saveDemoPlan(page: Page): Promise<string> {
  await page.goto("/start");
  await answerLowRisk(page);
  await page.getByRole("button", { name: "Work out my app type" }).click();
  await page.getByRole("link", { name: "Next: about your app" }).click();
  await answerDemoFacts(page);
  await page.getByRole("button", { name: "Next: what your app needs" }).click();
  await page.getByRole("button", { name: "Save this plan" }).click();
  await page.waitForURL(/\/projects\/[^/]+\/tools$/);
  return new URL(page.url()).pathname.split("/")[2];
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

/** On step 4 with the demo answers: save the plan, then tick a tool on step 5. */
export async function saveAndTick(page: Page, toolName: string) {
  await page.getByRole("button", { name: "Save this plan" }).click();
  await page.waitForURL(/\/projects\/[^/]+\/tools$/);
  await page.getByRole("checkbox", { name: toolName }).check();
}
