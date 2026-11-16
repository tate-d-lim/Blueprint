# Run-through (builder, tool owner, admin; Low-Risk app)

Numbers come from the seed and were read from the screen on 2026-11-16. If a number on screen differs, the seed changed: check before you present.

## Before you start

```bash
docker-compose up -d          # MongoDB
npm run seed                  # or Admin → Catalog → "Reset data" at the foot of the sheet
npm run build && npm start    # steadier than the dev server
```

A seed or "Reset data" deletes every saved project and loads the catalog, the tools and the sample project again.

"Viewing as" in the header on **Builder**. A change of role opens the first page of that role. Desktop, 1280×800 or 1440×900. If WebGL is off, the hotel shows as a still image with the parts list; everything else works.

`npm run e2e` runs every path on port 3100 and database `buildplan_e2e`. If another app uses port 3100, use `E2E_PORT=3111 npm run e2e`. The Catalog sheet checks the GovTech site by itself when the last check is older than 24 hours; `CATALOG_AUTO_CHECK=off` stops that.

## Builder

1. **Projects.** The welcome sheet "Plan the security of your app" with the three steps. **Start a new plan.**
2. **Tell us about your app.** Restricted, Sensitive Normal, Slight, None or minimal. **Find your app type** → **Low-Risk Cloud**.
3. **Next: about your app.** Members of the public; web, sign-in and SMS ticked; GenAI No. **Next: what your app needs.** (With GenAI Yes, three more questions appear: an AI service run by another company, an AI model you host, file uploads.)
4. **What your app needs.** The tour has 4 steps. "Your app needs 84 controls, in 11 parts." Select a part of the hotel to read its controls. "Left out because of your answers (2)". Give the plan a name. **Save this plan.**
5. **The saved plan.** It opens on the **Plan** tab: the hotel beside the checklist, "0 of 84 done". The **Next** strip shows the three first steps.
6. **Pick your tools.** **Add tools** → tick appCentral: "51 of 84 done · 51 by your tools · 33 left". With DBaaS and IGA: "66 of 84 done". Each tool shows Verified, Not yet verified or Published by GovTech.
7. **Give to your agent.** Download the security plan (a JSON file) and copy the prompt. The prompt is made for this project: it names the app, the IM8 profile, each tool with its number of controls ("appCentral does 51 controls"), and the number of planned controls ("33 controls are in state "planned" for me").
8. **Details** on a control: in plain words, the official wording, and what each tool says with its source.
9. Tick a control in the checklist. **Export for review** → the security review spreadsheet.
10. **Projects → Sample project (two weeks in):** "75 of 83 done · 66 by your tools · 8 left".

There is no build plan: the security plan (SSP) is the plan.

## Tool owner

1. **Viewing as → Tool Owner.** The **Tools** sheet lists each tool with one status: Verified, Waiting for approval, Sent back, Published by GovTech, No coverage yet, or the number of rows to check.
2. **Add a tool** opens a dialog (name, one line, section, kind). The coverage page opens next.
3. **Edit coverage** on appCentral. Three ways to fill in: by hand, from a Component Guide, with a coding agent (download the brief, upload the OSCAL file the agent wrote). The rows are in groups by hotel part, and each group starts closed.
4. Open a group and a row, change the answer or the explanation. The save bar shows "1 row changed". Write the source. **Save new version** → "Saved version 2. It waits for an admin."
5. Until an admin approves it, builders see that tool as "Not yet verified".

## Admin

1. **Viewing as → Admin.** The **Approvals** sheet: "Waiting for approval" (5 after a seed, plus each new version) and "Decided".
2. **Review** a version: what changed compared with the approved version. **Approve this version**, or **Send back** with a note. The tool owner sees the note; builders keep the older approved version.
3. **Catalog.** The IM8 controls by profile (118, 118, 138, 8). Search, the "Needs work" filter, and a side panel for each control: official wording, what the tools say, and the plain text that builders read (title, what to do, why it matters).
4. **Check GovTech now** reads info.standards.tech.gov.sg. When GovTech has changes, "Review the release" shows each change for each profile. **Apply this release** or **Discard**. Nothing changes before you apply.
5. **Upload a release** takes an .xlsx file or an OSCAL catalog in a .json file. It goes through the same review.
6. After a release is applied: the builder sees a notice on each saved project, the tool owner sees "rows to check", and the Catalog sheet marks reworded controls "Check the plain text".

### The live GovTech release (read on 2026-11-16)

The site had these changes compared with the seed: Low-Risk Cloud and Medium-Risk Cloud, 1 reworded (lm-4); High-Risk Cloud CII, 1 with a new level (is-14); Generative AI, 15 added and 8 removed.

If you apply it, the 8 old GenAI controls go and the 15 new ones have no plain text and no rule. Then step 3 does not ask the three GenAI questions, and a GenAI app gets all 15 controls with the official wording. Discard it, or seed again, to get the seed catalog back.
