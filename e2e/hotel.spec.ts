import { expect, test, type Locator } from "@playwright/test";
import { DEMO_QUERY, outsideStage, overlaps, saveAndTick } from "./helpers";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

for (const size of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`no two labels overlap at ${size.width}×${size.height}, on step 4 and on step 5 with appCentral`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(`/start/needs?${DEMO_QUERY}`);
    await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
    expect(await overlaps(page)).toEqual([]);
    expect(await outsideStage(page)).toEqual([]);
    await saveAndTick(page, "appCentral");
    await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
    expect(await overlaps(page)).toEqual([]);
    expect(await outsideStage(page)).toEqual([]);
  });
}

test("labels stay inside the stage after a resize", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  expect(await outsideStage(page)).toEqual([]);
  expect(await overlaps(page)).toEqual([]);
});

test("each parts-list row is a button with aria-pressed and the same words as its label", async ({ page }) => {
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  const rows = page.getByRole("region", { name: "Parts of your app" }).getByRole("button");
  await expect(rows).toHaveCount(11);
  const words = (l: Locator) => l.evaluate(e => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim());
  for (const row of await rows.all()) {
    await expect(row).toHaveAttribute("aria-pressed", "false");
    const id = await row.getAttribute("data-part");
    expect(await words(row)).toBe(await words(page.locator(`[data-label="${id}"]`)));
  }
  await rows.first().click();
  await expect(rows.first()).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(rows.first()).toHaveAttribute("aria-pressed", "false");
});

test("pointing at a label shows its part, and leaving it shows the whole hotel", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-label="cctv"]').hover();
  await expect(page.locator('[data-part="cctv"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("A record of who did what, and when, so problems can be found and traced.")).toBeVisible();
  await page.mouse.move(5, 5); // into the header, off the stage
  await expect(page.locator('[data-part="cctv"]')).toHaveAttribute("aria-pressed", "false");
});

test("with WebGL off, steps 4 and 5 show the still image and the list", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expect(page.locator('[data-hotel="fallback"] img')).toBeVisible();
  await expect(page.getByRole("region", { name: "Parts of your app" })).toBeVisible();
  await saveAndTick(page, "appCentral");
  await expect(page.locator('[data-hotel="fallback"] img')).toBeVisible();
  await expect(page.getByText("18 are yours · 51 your tools do · 15 questions")).toBeVisible();
});
