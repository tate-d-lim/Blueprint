import { expect, test, type Page } from "@playwright/test";

const asRole = async (page: Page, role: "Tool Owner" | "Admin" | "Builder") => {
  await page.getByRole("combobox", { name: "Viewing as" }).selectOption({ label: role });
};

test("a tool owner fills a new tool from a coding agent file and submits it for approval", async ({ page, request }) => {
  await request.post("/api/reset");
  await page.goto("/start");
  await asRole(page, "Tool Owner");
  await expect(page.getByRole("navigation", { name: "Sheets" }).getByRole("link", { name: "Tools" })).toBeVisible();
  await page.goto("/tool-owner");
  await page.getByRole("button", { name: "Add a tool" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a tool" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Agent Probe");
  await dialog.getByRole("textbox", { name: "What it is, in one line" }).fill("A tool filled in by a coding agent");
  await dialog.getByRole("button", { name: "Add tool", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Agent Probe: what it covers" })).toBeVisible();

  // "With a coding agent" is one of three ways to fill in the rows. The rows stay under it.
  await page.getByRole("button", { name: "With a coding agent" }).click();

  // The brief downloads for this tool and the editor's profile.
  const briefUrl = (await page.getByRole("link", { name: "Download the brief" }).getAttribute("href"))!;
  const brief = await page.request.get(briefUrl);
  expect(brief.status()).toBe(200);
  expect(brief.headers()["content-disposition"]).toContain("BUILD-COVERAGE.md");

  // The "agent" answers every row from the brief's own template, except the first.
  const template = JSON.parse((await brief.text()).match(/```json\n([\s\S]*?)\n```/)![1]);
  const rows = template["component-definition"].components[0]["control-implementations"][0]["implemented-requirements"];
  rows.forEach((row: { description: string; props: { name: string; value: string }[] }, i: number) => {
    if (i === 0) return;
    row.props.find(p => p.name === "responsibility")!.value = "app-builder";
    row.description = "The app team does this.";
  });
  await page.getByLabel("The agent's file (.json)").setInputFiles({
    name: "agent-probe-coverage.oscal.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(template)),
  });
  await page.getByRole("button", { name: "Fill in the rows" }).click();
  await expect(page.getByText(`Filled in from agent-probe-coverage.oscal.json: ${rows.length - 1} of ${rows.length} rows.`)).toBeVisible();
  await expect(page.getByText("Fill the 1 blank row before you save.")).toBeVisible();

  // The blank row blocks submit until the tool owner answers it.
  await expect(page.getByRole("button", { name: "Save new version" })).toBeDisabled();
  await expect(page.getByText("Answer the 1 blank row first.")).toBeVisible();
  await page.getByRole("button", { name: "Show blank rows" }).click();
  await expect(page.getByText("Needs an answer")).toHaveCount(1);
  await page.getByText("Needs an answer").click();
  // Answering a row in the blank-rows view keeps it open, so a "Shared" answer can still get its builder part.
  await page.getByRole("combobox", { name: "Who handles it" }).selectOption({ label: "Shared (Agent Probe + App Builder)" });
  await page.getByRole("textbox", { name: "App Builder's part" }).fill("Set the app's own limits.");
  await expect(page.getByRole("button", { name: "Save new version" })).toBeEnabled();
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByText("Saved version 1.")).toBeVisible();
  // Once saved, the draft is no longer the agent's: a later save is the tool owner's own edit.
  await expect(page.getByText(/Filled in from agent-probe-coverage/)).toHaveCount(0);

  // The admin sees where the version came from.
  await asRole(page, "Admin");
  await expect(page.getByRole("navigation", { name: "Sheets" }).getByRole("link", { name: "Approvals" })).toBeVisible();
  await page.goto("/admin");
  await page
    .getByRole("region", { name: "Waiting for approval" })
    .getByRole("row")
    .filter({ has: page.getByText("Agent Probe", { exact: true }) })
    .getByRole("link", { name: "Review" })
    .click();
  await expect(page.getByText("A coding agent filled this in from agent-probe-coverage.oscal.json.")).toBeVisible();

  // Only a tool owner can download the brief.
  await asRole(page, "Builder");
  await expect(page.getByRole("navigation", { name: "Sheets" }).getByRole("link", { name: "Approvals" })).toHaveCount(0);
  expect((await page.request.get(briefUrl)).status()).toBe(403);
});
