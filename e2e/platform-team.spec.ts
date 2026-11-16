import { expect, test, type Page } from "@playwright/test";
import { openTools } from "./helpers";

const asRole = async (page: Page, role: "Tool Owner" | "Admin") => {
  await page.getByRole("combobox", { name: "Viewing as" }).selectOption({ label: role });
  // Each role adds its own sheet to the title block once the switch has landed.
  await expect(page.getByRole("navigation", { name: "Sheets" }).getByRole("link", { name: role === "Tool Owner" ? "Tools" : "Approvals" })).toBeVisible();
};

const waiting = (page: Page) => page.getByRole("region", { name: "Waiting for approval" });
const reviewAppCentral = (page: Page) =>
  waiting(page).getByRole("row").filter({ has: page.getByText("appCentral", { exact: true }) }).getByRole("link", { name: "Review" });

/** On appCentral's tool page: open the groups and the rate-limiting row, change its words, and save a version from the save bar. */
async function saveAppCentralVersion(page: Page, explanation: string, source: string) {
  // The groups start closed.
  await page.getByRole("button", { name: "Open all" }).click();
  await page.getByText("Authentication Mechanism Rate-Limiting").click();
  await page.getByRole("textbox", { name: "Explanation" }).first().fill(explanation);
  await expect(page.getByText("Changed", { exact: true })).toBeVisible();
  await expect(page.getByText("1 row changed").first()).toBeVisible();
  await page.getByRole("textbox", { name: "Source for this version" }).fill(source);
  await page.getByRole("button", { name: "Save new version" }).click();
}

test("the platform cut-away: a tool owner edits one row, an Admin sends it back, the tool owner corrects it, the Admin approves, builders see it verified again", async ({
  page,
  request,
}) => {
  await request.post("/api/reset");
  const PLAN = "/projects/sample-two-weeks-in";

  // A tool owner changes one row of appCentral's coverage. The save bar is off until a row changes.
  await page.goto("/start");
  await asRole(page, "Tool Owner");
  await page.goto("/tool-owner");
  await page.getByRole("row", { name: /appCentral/ }).getByRole("link", { name: "Edit coverage" }).click();
  await expect(page.getByRole("button", { name: "Save new version" })).toBeDisabled();
  await expect(page.getByText("Change at least one row first.")).toBeVisible();
  await saveAppCentralVersion(page, "appCentral rate-limits sign-ins at the gateway.", "appCentral team, 2026-10-28");
  await expect(page.getByText("Saved version 2.")).toBeVisible();
  await expect(page.getByText("It waits for an admin.")).toBeVisible();

  // Builders now see that tool as not yet verified.
  await page.goto(PLAN);
  await openTools(page);
  await expect(page.getByRole("checkbox", { name: /appCentral/ })).toBeChecked();
  const appCentralTool = page.getByRole("dialog", { name: "Your tools" }).getByRole("listitem").filter({ has: page.getByRole("checkbox", { name: /appCentral/ }) });
  await expect(appCentralTool.getByText("Not yet verified", { exact: true })).toBeVisible();
  await expect(appCentralTool).toContainText("1 not yet verified");

  // An Admin sees the one changed row, with the size of the change in the queue, and sends the version back with a note.
  await asRole(page, "Admin");
  await page.goto("/admin");
  await expect(waiting(page).getByRole("row").filter({ has: page.getByText("appCentral", { exact: true }) })).toContainText("0 added, 1 changed, 0 removed");
  await reviewAppCentral(page).click();
  await expect(page.getByText(/Compared with approved version 1: 0 added, 1 changed, 0 removed/)).toBeVisible();
  await page.getByRole("button", { name: "Send back" }).click();
  await page.getByRole("textbox", { name: "What should the tool owner correct?" }).fill("Say which limit the gateway applies.");
  await page.getByRole("button", { name: "Send this version back" }).click();
  await expect(page.getByText("appCentral, version 2, is sent back.")).toBeVisible();
  await expect(waiting(page).getByRole("row").filter({ has: page.getByText("appCentral", { exact: true }) })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Decided" }).getByRole("row").filter({ has: page.getByText("appCentral", { exact: true }) }).first()).toContainText("Sent back"); // the newest decision is first

  // Builders never see a version that was sent back: the older approved version still stands.
  await page.goto(PLAN);
  await openTools(page);
  await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible();

  // The tool owner sees the note and the "Sent back" status, and saves a corrected version.
  await asRole(page, "Tool Owner");
  await page.goto("/tool-owner");
  await expect(page.getByRole("row", { name: /appCentral/ })).toContainText("Sent back");
  await page.getByRole("row", { name: /appCentral/ }).getByRole("link", { name: "Edit coverage" }).click();
  await expect(page.getByText("Version 2 was sent back on")).toBeVisible();
  await expect(page.getByText("Say which limit the gateway applies.")).toBeVisible();
  await saveAppCentralVersion(page, "appCentral rate-limits sign-ins at the gateway: 10 tries each minute.", "appCentral team, 2026-10-29");
  await expect(page.getByText("Saved version 3.")).toBeVisible();

  // The Admin approves version 3 and goes back to the queue.
  await asRole(page, "Admin");
  await page.goto("/admin");
  await reviewAppCentral(page).click();
  await expect(page.getByText(/Compared with approved version 1: 0 added, 1 changed, 0 removed/)).toBeVisible();
  await page.getByRole("button", { name: "Approve this version" }).click();
  await expect(page.getByText("appCentral, version 3, is approved.")).toBeVisible();
  await expect(waiting(page).getByRole("row").filter({ has: page.getByText("appCentral", { exact: true }) })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Decided" }).getByRole("row").filter({ has: page.getByText("appCentral", { exact: true }) })).toHaveCount(3); // the seeded approval of version 1, the send back of version 2, the approval of version 3

  // And the badge flips back.
  await page.goto(PLAN);
  await openTools(page);
  await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible();
});

test("a tool owner can add a tool from the dialog", async ({ page, request }) => {
  await request.post("/api/reset");
  await page.goto("/start");
  await asRole(page, "Tool Owner");
  await page.goto("/tool-owner");
  await page.getByRole("button", { name: "Add a tool" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a tool" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Probe Tool");
  await dialog.getByRole("textbox", { name: "What it is, in one line" }).fill("A tool made by the test");
  await dialog.getByRole("button", { name: "Add tool", exact: true }).click();
  // Saving takes the tool owner straight to the new tool's coverage editor.
  await expect(page.getByRole("heading", { name: "Probe Tool: what it covers" })).toBeVisible();
});
