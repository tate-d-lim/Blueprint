import { expect, test, type Page } from "@playwright/test";
import { openTools } from "./helpers";

const asRole = async (page: Page, role: "Admin" | "Verifier") => {
  await page.getByRole("combobox", { name: "Viewing as" }).selectOption({ label: role });
  // Each role adds its own sheet to the title block once the switch has landed.
  await expect(page.getByRole("navigation", { name: "Sheets" }).getByRole("link", { name: role === "Admin" ? "Admin" : "Verify" })).toBeVisible();
};

test("the platform cut-away: an admin edits one row, a verifier approves it, builders see it verified again", async ({ page, request }) => {
  await request.post("/api/reset");
  const PLAN = "/projects/sample-two-weeks-in";

  // An admin changes one row of appCentral's coverage and saves it as a new version.
  await page.goto("/start");
  await asRole(page, "Admin");
  await page.goto("/admin");
  await page.getByRole("row", { name: /appCentral/ }).getByRole("link", { name: "Edit coverage" }).click();
  await page.getByText("Authentication Mechanism Rate-Limiting").click();
  await page.getByRole("textbox", { name: "Explanation" }).first().fill("appCentral rate-limits sign-ins at the gateway.");
  await page.getByRole("button", { name: "Save new version" }).click();
  await page.getByRole("textbox", { name: "Source for this version" }).fill("appCentral team, 2026-10-28");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved version 2. It is not yet verified")).toBeVisible();

  // Builders now see that tool as not yet verified.
  await page.goto(PLAN);
  await openTools(page);
  await expect(page.getByRole("checkbox", { name: /appCentral/ })).toBeChecked();
  await expect(page.getByText("Not yet verified", { exact: true }).first()).toBeVisible();

  // A verifier sees the one changed row and approves the version.
  await asRole(page, "Verifier");
  await page.goto("/verify");
  await page.getByRole("row").filter({ has: page.getByText("appCentral", { exact: true }) }).getByRole("link", { name: "Review" }).click();
  // Only the row that was edited shows up as changed.
  await expect(page.getByText(/Compared with approved version 1: 0 added, 1 changed, 0 removed/)).toBeVisible();
  await page.getByRole("button", { name: "Approve this version" }).click();
  // DBaaS and IGA are seeded as samples that still wait for approval; appCentral is no longer in the list.
  await expect(page.getByRole("heading", { name: "Waiting for approval" })).toBeVisible();
  await expect(page.getByRole("row").filter({ has: page.getByText("appCentral", { exact: true }) })).toHaveCount(0);

  // And the badge flips back.
  await page.goto(PLAN);
  await openTools(page);
  await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible();
});

test("an admin can add a tool from the form", async ({ page, request }) => {
  await request.post("/api/reset");
  await page.goto("/start");
  await asRole(page, "Admin");
  await page.goto("/admin");
  await page.getByRole("textbox", { name: "Name" }).fill("Probe Tool");
  await page.getByRole("textbox", { name: "What it is, in one line" }).fill("A tool made by the test");
  await page.getByRole("button", { name: "Create tool" }).click();
  // Saving takes the admin straight to the new tool's coverage editor.
  await expect(page.getByRole("heading", { name: "Probe Tool: what it covers" })).toBeVisible();
});
