# Demo run-through

Follows the five demo moments in [the scope note](superpowers/specs/2026-10-27-demo-scope-design.md). Every number below came from the seeded data on 2026-10-27; if a number on screen differs, the seed or the data changed, so check before you present.

## Before you start

```bash
docker-compose up -d          # MongoDB. This Mac has the standalone docker-compose, not "docker compose".
npm run seed                  # or use "Reset demo data" in the header
npm run build && npm start    # steadier than `npm run dev` for a live demo; opens on http://localhost:3000
```

The app and MongoDB listen on this Mac only (127.0.0.1), because the database has no password and the venue's Wi-Fi isn't yours. If a page shows a banner saying the database isn't running or is empty, follow it (`docker-compose up -d`, then `npm run seed`).

- Role switcher on **Builder**. Browser at `http://localhost:3000/start`. Downloads folder empty.
- If a page ever shows an error about a missing function after you edited code, restart the server. Turbopack's dev server can serve a stale module.
- `npm run e2e` checks moments 1 to 3 automatically (own port and database, so it never touches your demo data).

## Moment 1: Tell us about your app (about 30 seconds)

1. Choose **Restricted**, **Sensitive Normal**, **Slight**, **None or minimal**. Leave both tick boxes empty.
2. Click **Work out my app type**.
3. Expect **Low-risk app on the cloud**, the reason ("Data up to Restricted and Sensitive Normal, at most Slight impact…") and a link to GovTech's risk materiality levels.
4. Optional aside: tick **The system is CII** and submit again. It becomes **High-risk app on the cloud** with "We don't support this type of app yet." Untick it before going on.
5. Click **See your build plan**.

## Moment 2: Pick your tools (about 75 seconds)

1. Tick **appCentral**, then **DBaaS**, then **IGA**. Watch the headings:

   | Picked | What you need to do | What your platform already does | Questions to answer | Good to have |
   |---|---|---|---|---|
   | nothing | 11 | 0 | 75 | 32 |
   | appCentral | 11 | 51 | 24 | 32 |
   | appCentral + DBaaS + IGA | **11** | **66** | **9** | 32 |

2. Point at the badges: appCentral **Verified**, DBaaS and IGA **Not yet verified**.
3. Untick **DBaaS**. Questions go 9 → 13 and a box says "appCentral expects DBaaS for 4 requirements. Add DBaaS?" Click **Add DBaaS** to put it back (9 again).
4. If the app uses AI, tick **genCentral**: 8 new questions appear (Questions to answer 17). Untick it again.
5. Click one item title (for example "Check every input before you use it") to show the detail panel: official wording, and which tool says what, with its source. Press Escape.

The 86 requirements that must or should be done become **11 that are yours and 9 to check**, before any code is written.

## Moment 3: Hand it to your agent (about 45 seconds)

1. Click **Build plan for your agent**. Open `BUILD-PLAN.md`: section 1 (11 tasks), section 2 (9 questions to ask a person first), section 3 (66 things not to build, grouped by tool). Show that unverified claims end with "(not yet verified)".
2. Open **Using a coding agent? Add this to AGENTS.md or CLAUDE.md** and show the snippet.
3. Play the pre-recorded clip of an agent using the plan. (Still to record.)

## Moment 4: Send it for review, two weeks later (about 60 seconds)

1. Header → **Saved projects** → **Sample project (two weeks in)**.
2. Expect **17** under What you need to do: 9 done, 2 in progress, 6 to do. The 11 core tasks plus 6 of the questions the builder answered "Applies". The other 3 questions are answered "Doesn't apply" with a reason.
3. Click **Security review spreadsheet** and open it. Check these rows (columns H and I):

   | Row | Implemented | Explanation starts |
   |---|---|---|
   | as-1 | Y | App builder's responsibility. Status: Done (self-declared). Schemas on every route. |
   | as-9 | Partial | App builder's responsibility. Status: In progress (self-declared). |
   | cs-3 | N | App builder's responsibility. Status: To do (self-declared). |
   | is-14 | N/A | Does not apply (self-declared): The app sends no SMS (sample answer). |
   | as-4 | Y | Provided by appCentral. Source: AEO TPC slide 12 (28 Oct 2026). |
   | dp-1 | Y | [Not yet verified] Provided by DBaaS. Source: … |

   The "About this file" sheet lists the tool versions and says the profile is locally derived.

   (The scope note says "7 of 11 tasks done". With the answered questions it is 9 of 17; update the slide or the note, whichever you use.)

## Moment 5: The platform cut-away (about 30 seconds)

1. Switch role to **Admin** → **Admin** → **appCentral** → **Edit coverage**. In the as-4 row, type an explanation ("appCentral rate-limits sign-ins at the gateway."). Click **Save new version**, type a source for this version (it is required and starts empty on purpose, for example "appCentral team, 2026-10-27"; only the row you changed is credited to it, every other row keeps its old source), add "What changed", **Save**. A green note says version 2 is not yet verified.
2. Open the plan for appCentral: **only as-4** shows **Not yet verified**, and so does appCentral in the picker.
3. Switch role to **Verifier** → **Verify** → **Review** on appCentral. The table shows the one changed row. Click **Approve this version**.
4. Reload the plan: as-4 and appCentral are **Verified** again.

Optional: as Admin, **Import a Component Guide** and upload a published guide to show a platform team's spreadsheet becoming a not-yet-verified version. Real guides to try: `data/guides/WebSG-LowRiskCloud_2026-06-22.xlsx` (works), `data/guides/FormSG-Component-Guide-DSS.xlsx` (rejected: it is for a different standard).

## After a rehearsal

Click **Reset demo data** (confirm) to put everything back. It reloads all the source files, so edits made in the admin screens are lost.

## What was checked on 2026-10-27, and what wasn't

Checked by Claude in the in-app browser, in pieces: moment 1 (including the High-risk aside), the counts and hint in moment 2, the detail panel, the saved-project page and its spreadsheet cells in moment 4, and the whole admin → verifier → approve → badge flip in moment 5. `npm run e2e` runs moments 1 to 3 end to end.

**Not checked:** one uninterrupted run of all five moments with a stopwatch, the exported `.xlsx` opened in Excel itself (the template has no widths, merges or validation, so little can be lost, but look at it once), and the agent clip.
