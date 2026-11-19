import { expect, test } from "@playwright/test";
import { DEMO_QUERY, outsideStage, overlaps, saveAndTick, skipTour } from "./helpers";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

for (const size of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`no two labels overlap at ${size.width}×${size.height}, on step 4 and on step 5 with appCentral`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(`/start/needs?${DEMO_QUERY}`);
    await skipTour(page);
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
  await skipTour(page);
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  expect(await outsideStage(page)).toEqual([]);
  expect(await overlaps(page)).toEqual([]);
});

test("on step 4 each label is a button, and no label is under the intro card", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await skipTour(page);
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
  const labels = page.locator("button[data-label]");
  await expect(labels).toHaveCount(11);
  const card = (await page.locator("[data-card]").boundingBox())!;
  for (const label of await labels.all()) {
    const box = (await label.boundingBox())!;
    expect(box.x, `${await label.getAttribute("data-label")} is right of the card`).toBeGreaterThanOrEqual(card.x + card.width);
  }
});

test("pointing at a label fades the other parts, and leaving it shows the whole hotel", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await skipTour(page);
  const hotel = page.locator('[data-hotel="ready"]');
  await expect(hotel).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-label="cctv"]').hover();
  await expect(hotel).toHaveAttribute("data-selected", "cctv");
  await page.mouse.move(5, 5); // into the header, off the stage
  await expect(hotel).toHaveAttribute("data-selected", "");
});

test("a click moves in on the part and hides the labels; Whole plan moves back out", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await skipTour(page);
  const hotel = page.locator('[data-hotel="ready"]');
  await expect(hotel).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-label="safe"]').click();
  await expect(hotel).toHaveAttribute("data-focus", "safe");
  await expect(page.getByRole("heading", { level: 2, name: "Data" })).toBeVisible();
  await expect(page.locator("[data-label]").first()).toBeHidden();
  await page.getByRole("button", { name: "Whole plan" }).click();
  await expect(hotel).toHaveAttribute("data-focus", "");
  await expect(page.locator('[data-label="safe"]')).toBeVisible();
  await expect(page.locator('[data-label="safe"]')).toBeFocused();
  expect(await overlaps(page)).toEqual([]);
});

test("on a saved project, the hotel sits beside the checklist and pointing at a label shows its card; the Hotel tab has the page width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/projects/sample-two-weeks-in");
  const hotel = page.locator('[data-hotel="ready"]');
  await expect(hotel).toBeVisible({ timeout: 20_000 });
  const box = await hotel.boundingBox();
  expect(box!.width).toBeGreaterThan(700);
  expect(await overlaps(page)).toEqual([]);
  expect(await outsideStage(page)).toEqual([]);
  const summary = page.getByText("A record of who did what, and when, so problems can be found and traced.");
  await expect(summary).toHaveCount(0);
  await page.locator('[data-label="cctv"]').hover();
  await expect(summary).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(summary).toHaveCount(0);

  // The Hotel tab gives the hotel the whole width.
  await page.getByRole("navigation", { name: "Project" }).getByRole("link", { name: "Hotel" }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in\/hotel$/);
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
  const wide = await page.locator('[data-hotel="ready"]').boundingBox();
  expect(wide!.width).toBeGreaterThan(1000);
  expect(await overlaps(page)).toEqual([]);
  expect(await outsideStage(page)).toEqual([]);
});

test("with WebGL off, step 4 and a saved project show the still image and the list", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await skipTour(page);
  await expect(page.locator('[data-hotel="fallback"] img')).toBeVisible();
  await expect(page.locator("button[data-label]")).toHaveCount(11);
  await page.getByRole("button", { name: /Logging · CCTV/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Logging" })).toBeVisible();
  await saveAndTick(page, "appCentral");
  await expect(page.locator('[data-hotel="fallback"] img')).toBeVisible();
  await expect(page.getByText("51 of 84 done")).toBeVisible();
});
