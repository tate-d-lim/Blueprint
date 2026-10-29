# Demo run-through

Follows the five demo moments in [the scope note](superpowers/specs/2026-10-27-demo-scope-design.md). Every number below came from the seeded data on 2026-10-27; if a number on screen differs, the seed or the data changed, so check before you present.

## Before you start

```bash
docker-compose up -d          # MongoDB. This Mac has the standalone docker-compose, not "docker compose".
npm run seed                  # or use "Reset demo data" in the header
npm run build && npm start    # steadier than `npm run dev` for a live demo; opens on http://localhost:3000
```

The app and MongoDB listen on this Mac only (127.0.0.1), because the database has no password and the venue's Wi-Fi isn't yours. If a page shows a banner saying the database isn't running or is empty, follow it (`docker-compose up -d`, then `npm run seed`).

- **Viewing as** (in the blue title block, top right) on **Builder**. Browser at `http://localhost:3000/start`, desktop width. Downloads folder empty.
- If a page ever shows an error about a missing function, or looks unstyled, after you edited code: stop the dev server, delete the `.next` folder and start it again. Turbopack's dev server can serve a stale module.
- `npm run e2e` checks moments 1 to 4, the room filter and the platform cut-away (moment 5) automatically, on a production build with its own port and database, so it never touches your demo data.

## Moment 1: Tell us about your app (about 30 seconds)

1. Choose **Restricted**, **Sensitive Normal**, **Slight**, **None or minimal**. Leave both tick boxes empty.
2. Click **Work out my app type**.
3. Expect **Low-risk app on the cloud**, the reason ("Data up to Restricted and Sensitive Normal, at most Slight impact…") and a link to GovTech's risk materiality levels.
4. Optional aside: tick **The system is Critical Information Infrastructure (CII)** and submit again. It becomes **High-risk app on the cloud** with "We don't support this type of app yet." Untick it before going on.
5. Click **Next: about your app**. Choose **Members of the public**. Tick **People use it in a web browser**, **People sign in to it** and **It sends SMS text messages**. (Choose **Government staff only** and the SMS question goes away.)
6. Click **Next: how we read your app**. Expect "84 of 86 requirements apply" and a box **Left out because of your answers (2)**: no web address of its own, no shortened links. Each line gives the reason in plain words.
7. Click **See your build plan**.

## Moment 2: Pick your tools (about 75 seconds)

1. Tick **appCentral**, then **DBaaS**, then **IGA**. Watch the headings:

   | Picked | What you need to do | What your platform already does | Questions to answer | Good to have |
   |---|---|---|---|---|
   | nothing | 84 | 0 | 0 | 32 |
   | appCentral | 18 | 51 | 15 | 32 |
   | appCentral + DBaaS + IGA | **18** | **66** | **0** | 32 |

   The floor plan on the left fills in as you tick: hatched rooms are built by your tools. With all three it says **66 of 86 requirements are already built** and "18 are yours to build." A new heading, **Doesn't apply to your app (2)**, lists what your answers left out.
2. Point at the stamps: appCentral **Verified**, DBaaS and IGA **Not yet verified**.
3. Untick **DBaaS**. Questions go 0 → 4 and a box says "appCentral expects DBaaS for 4 requirements. Add DBaaS?" Click **Add DBaaS** to put it back (0 again).
4. If the app uses AI, tick **genCentral**: 8 new questions appear (Questions to answer 11). Untick it again.
5. Click the **App security** room on the floor plan. The lists on the right show only that room (5 tasks), and the address bar gets `room=as`. Click **Show all rooms** (or the room again) to go back.
6. Click one item title (for example "Check every input before you use it") to show the detail panel: official wording, and which tool says what, with its source. Press Escape.

The 86 requirements that must or should be done become **18 that are yours and none to check**, before any code is written.

## Moment 3: Hand it to your agent (about 45 seconds)

1. Click **Export**, then **Build plan for your agent**. Open `BUILD-PLAN.md`: section 1 (18 tasks), section 2 (no questions to ask a person first), section 3 (66 things not to build, grouped by tool), section 4 (2 that do not apply to this app). Show that unverified claims end with "(not yet verified)".
2. In the same box, show the snippet for AGENTS.md or CLAUDE.md under **For your coding agent**.
3. Play the pre-recorded clip of an agent using the plan. (Still to record.)

## Moment 4: Send it for review, two weeks later (about 60 seconds)

1. Title block → **Saved projects** → **Sample project (two weeks in)**. The title block now also shows the project, its owner and the date it last changed.
2. The floor plan says **9 of 17 tasks done** and "2 in progress, 6 to do. All 3 questions answered." Solid rooms are done, cross-hatched ones are in progress, dashed ones are still to do. The 17 are the 11 core tasks plus 6 planning and paperwork tasks. The 3 questions are answered "Doesn't apply" with a reason.
   Optional: click **To do (6)** above the task list to show only what is left.
3. Click **Export**, then **Security review spreadsheet** (under **For security review**) and open it. Check these rows (columns H and I):

   | Row | Implemented | Explanation starts |
   |---|---|---|
   | as-1 | Y | App builder's responsibility. Status: Done (self-declared). Schemas on every route. |
   | as-9 | Partial | App builder's responsibility. Status: In progress (self-declared). |
   | cs-3 | N | App builder's responsibility. Status: To do (self-declared). |
   | is-14 | N/A | Does not apply (self-declared): The app sends no SMS (sample answer). |
   | as-4 | Y | Provided by appCentral. Source: AEO TPC slide 12 (28 Oct 2026). |
   | dp-1 | Y | [Not yet verified] Provided by DBaaS. Source: … |

   The "About this file" sheet lists the tool versions and says the profile is locally derived.

   (The scope note says "7 of 11 tasks done". With the 6 planning tasks it is 9 of 17; update the slide or the note, whichever you use.)

## Moment 5: The platform cut-away (about 30 seconds)

1. Set **Viewing as** to **Admin** → **Admin** in the title block → **appCentral**: **Edit coverage**. Click the row **Authentication Mechanism Rate-Limiting** (as-4) to open it and type in **Explanation**: "appCentral rate-limits sign-ins at the gateway." Click **Save new version**, type a source for this version (it is required and starts empty on purpose, for example "appCentral team, 2026-10-27"; only the row you changed is credited to it, every other row keeps its old source), add "What changed", **Save**. A green note says version 2 is not yet verified.
2. Open the plan for appCentral: **only as-4** shows **Not yet verified**, and so does appCentral in the picker.
3. Set **Viewing as** to **Verifier** → **Verify** in the title block → **Review** on appCentral. The table shows the one changed row. Click **Approve this version**.
4. Reload the plan: as-4 and appCentral are **Verified** again.

Optional: as Admin, **Import a Component Guide** and upload a published guide to show a platform team's spreadsheet becoming a not-yet-verified version. Real guides to try: `data/guides/WebSG-LowRiskCloud_2026-06-22.xlsx` (works), `data/guides/FormSG-Component-Guide-DSS.xlsx` (rejected: it is for a different standard).

Optional, "a new tool in two minutes": as Admin, create a tool with the form at the bottom of **Admin**. In its editor, under **Fill in with your coding agent**, click **Download the brief** and show that `BUILD-COVERAGE.md` lists every requirement and holds a JSON template. Upload an agent file you made before the demo (an agent's answers to that template, with one row left blank) and click **Fill in the editor**. The note says how many rows are filled and asks you to fill the blank one. **Show blank rows**, open the row marked **Needs an answer**, choose who handles it, then **Save new version** → **Save**. As Verifier, the version's review page says a coding agent filled it in.

## After a rehearsal

Click **Reset demo data** (confirm) to put everything back. It reloads all the source files, so edits made in the admin screens are lost.

## After the blueprint redesign (2026-10-28)

Every screen is now a drawing sheet with a title block, built from our own plain HTML controls (the Singapore Government Design System is gone). The app is for desktop only. Checked: all screens in the browser at 1440 wide, and `npm run e2e` (11 tests on a production build: moments 1 to 4, the room filter, the project cells in the title block, the platform cut-away, adding a tool, and three regressions). Still **not** checked: one uninterrupted timed run, the exported `.xlsx` in Excel, and the agent clip.

## What was checked on 2026-10-27, and what wasn't

Checked by Claude in the in-app browser, in pieces: moment 1 (including the High-risk aside), the counts and hint in moment 2, the detail panel, the saved-project page and its spreadsheet cells in moment 4, and the whole admin → verifier → approve → badge flip in moment 5. `npm run e2e` runs moments 1 to 3 end to end.

**Not checked:** one uninterrupted run of all five moments with a stopwatch, the exported `.xlsx` opened in Excel itself (the template has no widths, merges or validation, so little can be lost, but look at it once), and the agent clip.
