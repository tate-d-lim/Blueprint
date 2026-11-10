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
