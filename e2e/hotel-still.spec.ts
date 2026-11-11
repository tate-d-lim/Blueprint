import { expect, test } from "@playwright/test";
import { DEMO_QUERY, skipTour } from "./helpers";

// Makes public/models/hotel/still.png: the picture shown while the models load, and when WebGL is missing.
// Run it on purpose: HOTEL_STILL=1 npx playwright test e2e/hotel-still.spec.ts
test.skip(!process.env.HOTEL_STILL, "set HOTEL_STILL=1 to remake the still image");
test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });

test("the still image of the hotel", async ({ page, request }) => {
  await request.post("/api/reset");
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await skipTour(page);
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: "[data-label], [data-hotel] svg { visibility: hidden !important; }" });
  await page.locator("[data-hotel] canvas").screenshot({ path: "public/models/hotel/still.png" });
});
