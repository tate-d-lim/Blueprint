import { expect, test, type Page } from "@playwright/test";
import { DEMO_QUERY as DEMO_FACTS_QUERY, saveDemoPlan } from "./helpers";

const DEMO = "c=restricted&s=sn&i=slight&d=min&k=";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

const sheets = (page: Page) => page.getByRole("navigation", { name: "Sheets" });

test("opening a saved project does not save anything", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", r => r.method() === "POST" && writes.push(r.url()));
  await page.goto("/projects/sample-two-weeks-in");
  await page.getByRole("heading", { name: /^Your plan is ready\./ }).waitFor();
  // Give any stray save on load time to fire; none should.
  await page.waitForTimeout(1500);
  expect(writes).toEqual([]);
});

test("a saved project keeps its changes after you leave the page and press Back", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  const status = page.locator('select[name="status-cs-3"]');
  await expect(status).toHaveValue("todo");
  const saved = page.waitForResponse(r => r.request().method() === "POST");
  await status.selectOption({ label: "Done" });
  await saved;
  await sheets(page).getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goBack();
  await expect(page.locator('select[name="status-cs-3"]')).toHaveValue("done");
});

test("your tool picks survive leaving the tools step and pressing Back", async ({ page }) => {
  await saveDemoPlan(page);
  await page.getByRole("checkbox", { name: "DBaaS" }).check();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await sheets(page).getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goBack();
  await expect(page.getByRole("checkbox", { name: "DBaaS" })).toBeChecked();
});

test("a saved project's name and owner show on its own page, not in the header", async ({ page }) => {
  await page.goto("/projects/sample-two-weeks-in");
  await expect(page.getByRole("main").getByText("Sample project (two weeks in)").first()).toBeVisible();
  await expect(page.getByRole("main").getByText("Sample builder")).toBeVisible();
  await expect(page.getByRole("banner").getByText("Sample builder")).toHaveCount(0);
  // A client-side move leaves them behind.
  await sheets(page).getByRole("link", { name: "Saved projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("banner").getByText("Sample builder")).toHaveCount(0);
});

/** The text of the page without the official-wording blocks, which are GovTech's own words. */
const builderText = (page: Page) =>
  page.evaluate(() => {
    document.querySelectorAll("details").forEach(d => (d.open = true));
    const main = (document.querySelector("main") as HTMLElement).cloneNode(true) as HTMLElement;
    main.querySelectorAll("[data-official]").forEach(e => e.remove());
    return main.textContent ?? "";
  });

const BANNED = /\b(IM8|SSP|OSCAL|controls?|agency|agencies)\b/gi;
/** Steps 1–5 read the same for an app that is new, part built or built. */
const STAGE_BOUND = /\b(will use|before you build|to build)\b/gi;
const words = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map(m => m[0]);

test("steps 1 to 5 use builder language and stay neutral about the stage of the app", async ({ page }) => {
  const check = async (label: string) => {
    const text = await builderText(page);
    // A check of an empty page would pass for the wrong reason.
    expect(text.length, `${label} has text`).toBeGreaterThan(120);
    expect({ label, banned: words(text, BANNED), stageBound: words(text, STAGE_BOUND) }).toEqual({ label, banned: [], stageBound: [] });
  };

  await page.goto("/start");
  await check("step 1");
  await page.goto(`/start/verdict?${DEMO}`);
  await check("step 2");
  await page.goto(`/start/verdict?c=restricted&s=sn&i=critical&d=min&k=`);
  await check("step 2, cannot plan yet");
  await page.goto(`/start/app?${DEMO}`);
  await check("step 3");
  await page.goto(`/start/needs?${DEMO_FACTS_QUERY}`);
  await page.getByRole("button", { name: /CCTV · Logging/ }).click();
  await page.getByText("Show all 10 requirements").click();
  await check("step 4, CCTV");
  const id = await saveFromNeeds(page);
  await page.getByRole("checkbox", { name: "appCentral" }).check();
  await check("step 5");
  expect(id).toBeTruthy();
});

test("the plan page never shows GovTech's wording about the agency, controls or an SSP", async ({ page }) => {
  await saveDemoPlan(page);
  await page.getByRole("checkbox", { name: "WebSG" }).check();
  await page.getByRole("checkbox", { name: "Isomer" }).check();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue to your plan" }).click();
  await page.getByRole("heading", { name: /^Your plan is ready\./ }).waitFor();
  expect(words(await builderText(page), BANNED)).toEqual([]);
});

/** On step 4: save the plan and return the new project's id. */
async function saveFromNeeds(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Save this plan" }).click();
  await page.waitForURL(/\/projects\/[^/]+\/tools$/);
  return new URL(page.url()).pathname.split("/")[2];
}
