# Builder journey — design

Date: 2026-11-06. Status: sections 1–6 approved in chat. The hotel direction was added and revised after an Impeccable critique (2026-11-09, 24/40). The journey was then changed to plan first, tools after the save (user, 2026-11-09). The revised spec is waiting for review.
Sub-project 1 of 3 in the frontend redesign (2: platform workspace, 3: visual system, which is decided inside this sub-project's visual round).

## Why

Blueprint must give an app builder confidence to build with CPF tools: what the requirements are, what the tools cover, and how to go on. Today the journey answers these questions too late and in a confusing way:
- the tool picker is below the floor plan
- the floor plan needs a legend before anyone can read it
- answers are lost when the builder goes back
- unverified claims count as "built"
- medium and high risk results are a dead end

## Who and what success is

- **Builder:** a CPFB officer who builds a small app with a coding agent and is not a security specialist. The app can be new, part built, or built.
- **Success:** a clear go at the start. Within minutes, the officer knows the app type and everything the app needs, then which tools to use and what each takes off them, the few things that are theirs, and has the build plan for their agent.
- **Anti-goals:** it must not feel like a compliance form, and it must not feel like a dashboard (cards, charts and badges with no next step).

## Scope

| | Build for the demo (2026-11-17) | Design now, build after |
|---|---|---|
| Steps 1–5 (start, save, tools) | Yes | |
| Step 6 (plan page) | The go at the top; the rest keeps today's layout in the new look, without the floor plan | Yes, the full redesign, with the hotel as progress |
| Change notice on saved projects | | Yes |
| Medium-Risk and High-Risk profiles | Yes | |

The Blueprint world stays, in a **light** execution (user, 2026-11-09). A direction round to replace the world ran (Impeccable seed reference `seed:2721ecae0fe04aab`), and the user declined all its directions. The surface round (seed reference `seed:36f5bde92930a801`) and the research with the user then chose a **hotel cutaway** for steps 4 to 6 (see "The hotel" below). This spec fixes structure, content and behaviour. The look of each step comes from the shape brief. The colours, type and timings in "The hotel" are starting values that the shape brief can change. The cream paper and Inter from the reference test are not decided yet (the detector flags both as overused).

Light Blueprint means:
- The palette is free: blueprint blue is no longer required (user, 2026-11-09). Red stays only for what needs attention.
- No legend. State is said in words on the label of each part, not in a key.
- The title block becomes a simple header. No uppercase label cells.
- Fewer boxes and more space. Only one column scrolls: on steps 4 and 5 the hotel stays in place and the side panel (part details or tools) scrolls beside it.
- The drawing carries meaning, not decoration.

Demo notes:
- **The hotel replaces the floor plan as the demo's memorable moment, everywhere** (user, 2026-11-09). Step 4 shows it as a drawing of everything the app needs. Step 5 builds it as tools are ticked, and step 6 shows it at the go. The demo order is: needs, save, tools (the hotel builds), the go, the build plan. Its part names are the area names in step 6 and in `BUILD-PLAN.md`. `docs/run-through.md` and the Playwright files in `e2e/` that use the floor plan or the picker on `/plan` are rewritten as part of this work.
- **The demo uses a Low-Risk app.** Medium and High are built but not shown on stage.
- **Admin and verifier screens** are redesigned in the new world as sub-project 2, right after this one.

## Copy rules

- The builder-language rule in PRODUCT.md stays: no "IM8", "SSP", "OSCAL", "control" or "agency" in our own builder copy.
- **Stage-neutral wording (new).** Steps 1–5 must read the same for an app that is new, part built or built. They must not use future tense about the app or "before you build". Lines to replace include "Who will use your app?", "Tick what your app will use", "yours to build or arrange", "Check these with the right person before you build" and "built by your tools". The final words are set in the visual round.
- Verification words stay: Verified, Not yet verified, Published by GovTech.

## The journey

The plan comes first, and tools come after the plan is saved (user, 2026-11-09). A requirement does not go away when a tool is used: the tool is one way to meet it, and doing the work yourself is the other. So the start flow shows everything the app needs, with no tools. After the save, the builder chooses the tools that meet part of it, and then gets the go.

```
1 Tell us about your app   /start                  risk questions
2 Verdict                  /start/verdict          app type and profile (new)
3 About your app           /start/app              tick-list (as today)
4 What your app needs      /start/needs            the full hotel, no tools; save (new; replaces /start/review)
5 Your tools               /projects/[id]/tools    tools with their effect (new; the first page of a new project)
6 Your plan                /projects/[id]          the go at the top, then the workspace
```

- Steps 1–5 show "Step n of 5". The plan page (step 6) shows no step number.
- **Steps 1–4 are unsaved.** Every answer travels in the link both ways: risk answers and facts. Back and every "edit" link keep all answers, so the builder never sees an empty form again.
- **The save is the end of the start flow.** Step 4's main action is "Save this plan". It asks for a name, filled in with "{app type} app" so that one click is enough. The project is created with `riskAnswers`, `facts` and no tools, and step 5 opens.
- **No build plan before the tools.** `BUILD-PLAN.md` is offered only on the plan page, after step 5. Before the tools are chosen, the plan would give the agent every requirement, and the agent could build its own logging or backup instead of using a tool.
- **A new project opens on step 5** until the builder leaves it with "Continue to your plan" (`Project.toolsReviewedAt`). After that, the project opens on the plan page, and "Change tools" opens step 5 again.
- **Questions are answered on the saved plan**, not in the link. Each answer is applies yes or no, plus a reason of at most 280 characters, stored in `questionAnswers`.
- **Editing a saved project.** "Change answers" on the plan page opens step 1, 3 or 4 with `project=<id>` in the link and the saved answers loaded. Every step keeps `project=<id>`.
  - On step 4, the main action becomes "Save changes to {project name}". It writes `riskAnswers` and `facts` to the **same** project. It never creates a new one. Then the plan page opens.
  - Task statuses and tools are kept. Task statuses are keyed by requirement.
  - If the builder leaves with unsaved changes, the browser asks first.
- **The app type of a saved project can change.** If the edited answers give another profile, step 4 says so before the save. For example: "Your app type changes from Low-Risk Cloud to Medium-Risk Cloud. 4 tasks are added. Tasks you marked done stay done." Statuses for requirements that are not in the new profile are kept on the project but not shown. They come back if the profile changes back. Because tool coverage is per profile, the save opens step 5, not the plan page.
- `/start/review`, `/start/tools` and `/start/go` redirect to `/start/needs` with their query string. `/plan` (the old unsaved plan) also redirects to `/start/needs`.

### Step 1: Tell us about your app

The risk questions are as today. Each option gets a short hint. CII and SII get "Not sure? Ask your IT security officer (ACISO or MCISO)." The full name of SII is still not confirmed, and the screen keeps "SII" until it is.

### Step 2: Verdict

`assessRisk` keeps its rules and returns the level. The profile comes from data, not code (see "Profiles").

**Cloud eligibility is checked first.** A new pure `cloudEligible(answers)` is false when the classification is Confidential (not cloud-eligible) or S-class. Then the verdict is "This data can't be hosted on the cloud, so Blueprint can't plan it with CPF's cloud tools." The screen shows the reasons, the contact, and the answer summary. No profile is picked, whatever the risk level. Today `assessRisk` makes Confidential (not cloud-eligible) Medium, which would wrongly lead to Medium-Risk **Cloud**. Every cloud profile gets `hosting: 'cloud'`, and `profileFor` only picks a cloud profile when `cloudEligible` is true.

Then, for cloud-eligible data:

| Result | Profile | Verdict text (intent) |
|---|---|---|
| Low | Low-Risk Cloud | You can plan this app with Blueprint. |
| Medium | Medium-Risk Cloud | You can plan it. Involve your security team early. When no tool has coverage for the profile, it adds: "No tool covers Medium-Risk Cloud yet, so more of the work is yours." This is computed from coverage, not written as a fact. |
| High and CII | High-Risk Cloud CII | You can plan it. Involve your security team from the start. |
| High, not CII (Critical impact) | none | Blueprint can't plan this app yet. It shows the reasons, the contact, and a summary of the answers to send them. |

- The screen shows the reasons from `assessRisk` and a link to edit the answers.
- The contact text is kept by an admin. For the demo it is seed data (`data/seed/contacts.json`), with no editor yet.

### Step 3: About your app

As today (`/start/app`), with stage-neutral words. One new question for every profile: **"Does your app use generative AI, for example a chatbot or a text summary?"** (fact `uses-genai`). A yes adds the GenAI requirements and the Smart assistant part. A tool no longer adds requirements: `activatesProfiles` is removed, so genCentral is judged like any other tool, against a plan that already has the GenAI requirements.

### Step 4: What your app needs

The full hotel, with no tools. Every part is in the Drawing look (see "The hotel"), because nothing is met yet.

- **The line above the hotel:** "This is everything your app needs: {n} requirements in {p} parts. Next, you choose the tools that meet part of it." Here {n} counts the items with headings `you` and `questions` when no tool is ticked.
- **Labels** say "{n} requirements" on line 2 (plus "· {q} questions"). The words "yours" and "your tools do" are not used yet.
- **The side panel** beside the hotel shows the chosen part. When no part is chosen, it shows how to start: "Point at a part, or pick it in the list, to see what it asks for."
- **Part details: the summary first, then the full requirements.**
  - The part name, its families, and one sentence on what the part protects (from the part table, `summary`). For example, CCTV: "A record of who did what, and when, so problems can be found and traced."
  - The counts: requirements and questions.
  - "Show all {n} requirements" opens the list. Each row is the plain task text. Under it, "Official wording" opens the requirement's official statement. A requirement with no plain text shows the official wording in the row. Questions show with the red dot and the line "Someone must check if this applies."
- **Left out because of your answers:** a closed section under the parts list with the items that `appliesWhen` rules skipped, each with its reason.
- **Profile note:** one line on Medium or High, as in step 2.
- **Actions:** the main action is "Save this plan" (see "The journey"). There is no build plan download here.

### Step 5: Your tools

The first page of a new project. The same hotel, with the tool list in the side panel. Each tick builds parts of the hotel, and is saved to the project at once (`toolIds`), with a "Saved" note.

There are **no rules on tools**. The recommendation comes from the coverage that already exists, so it stays right when tools or coverage change.

**Effect of a tool `T` for this app.** Compare two plans: `without` and `with`.
- If `T` is ticked: `without = plan(ticked − T)` and `with = plan(ticked)`.
- If `T` is unticked: `without = plan(ticked)` and `with = plan(ticked + T)`.

Only the items that apply to this app count: headings `you` and `questions`. `skipped`, `good-to-have` and `platform` do not count.
- **Removed:** items that are `you` or `questions` in `without` and are neither in `with`. Split into tasks and questions.
- **Added:** items that are neither in `without` and are `you` or `questions` in `with`, plus items that move from `you` to `questions`. For example, a claim that points to another tool, or a conflict with another tool's claim. Split into tasks and questions.
- **Unverified part:** of the removed items, the number where `T`'s decisive claim is `not-yet-verified`.
- **Net** = removed − added.

**What the screen shows:**
- **The question is "Tick the tools that are part of your app."** A tick means one thing only: the tool is part of the app (chosen or already in use) and meets the requirements it covers. Each tool row has one line from the tool data, "It is part of your app if …" (`partOfAppWhen`), so the builder can tell.
- **Could take more off you** (listed first): tools with net ≥ 1 when the step opens, sorted by net, then verified tools before unverified ones, then by name. The order is set when the step opens and does not change on a tick; only the numbers change in place. So rows never move under the pointer or the keyboard focus.
- Each tool states both sides. For example: "Removes 6 tasks, answers 2 questions (4 not yet verified)". When something is added, it also says, for example, "· adds 1 question". It never shows only the good side.
- **Every requirement counts as one.** The screen says so once, under the running line: "Each requirement counts as one, whatever its size." The counts are never called effort, time or a score.
- **Other tools:** tools with net ≤ 0 ("Nothing for your app", or the added items when net < 0), and tools with no coverage for the profile ("No Medium-Risk Cloud coverage yet").
- **Nothing is ticked by default, and no button ticks many tools.** The builder ticks each tool on its own. Using no tool is a valid answer.
- **A running line:** "{yours} are yours · {platform} your tools do ({unverified} not yet verified) · {questions} questions". It updates on every tick.
- The tools are sections as today (CPF tools, Whole-of-government tools, Code components) inside each group, with the Sample and verification badges as today.
- **Action:** "Continue to your plan" opens step 6 and sets `toolsReviewedAt`.

### The hotel

The app is a hotel. Each family of requirements is one part of the hotel, so a builder can see what each family protects. The hotel is a 3D cutaway: the front and right walls are cut away, the roof opens like a lid, and the hotel sits on a block of ground that is cut at the front so the basement shows. The camera is orthographic (isometric) and does not move.

| Part | Families |
|---|---|
| Foundation and frame | Infrastructure (`is`), Datacentre (`dc`) |
| Entrance security | Network (`ns`) |
| Room keycards | Access (`ac`) |
| Hotel safe | Data (`dp`), Cryptography (`ck`) |
| Standby generator | Backup (`br`) |
| CCTV | Logging (`lm`) |
| Walls, windows and doors | App security (`as`) |
| Building materials and deliveries | Secure development (`sd`), Supply chain (`sc`), Third parties (`tp`) |
| Hotel rooms | Containers (`cs`) |
| Safety inspection | Testing (`st`) |
| Hotel rules | Security programme (`pm`) |
| Smart assistant | Generative AI (`ga`), shown only when the app uses GenAI |

Every part shows, except the Smart assistant, which shows only when `uses-genai` is yes. A part whose families have no items that count for this app stays in place (so the hotel never has a hole) and says "Nothing for your app". A family code that is not in the table goes to "Hotel rules", and a unit test fails so that the table gets the new code.

**Pieces.** Each part's model is a fixed, ordered list of pieces (for example, each hotel room has a bed, a table, a lamp and a TV). The share of a part that the tools do is `platform / (you + questions + platform)` for its families. That share of the pieces, rounded, is solid; the rest are drawn. A share above 0 shows at least one solid piece, and a share below 1 leaves at least one piece drawn. So "partly done" is visible in the model, not only in the words. The walls and the frame follow the same rule.

**Looks, said in words on each label:**
- **Drawing** (pale blue lines): no tool meets any of this part.
- **Partly solid**: the ticked tools do some of this part.
- **Solid**: the tools do all of this part, but at least one claim is not yet verified.
- **Solid and lit** (warm light): the tools do all of this part, and every claim that covers it is Verified. Only this look has the light.
- An open question adds a red dot, whatever the look. Red is used for nothing else in the hotel.

**Labels** have two lines. Line 1 is the part and its family names, for example "CCTV · Logging". Line 2 is the state:
- "{n} yours"
- "{n} yours · {tool} does {m}" (with more than one tool: "your tools do {m}")
- "{tool} does all · {k} not yet verified"
- "{tool} does all"
- "Nothing for your app"
- plus "· {q} questions" when there are open questions.

Each part has a fixed label place and a thin line to the part. The places are set so that no two labels overlap at 1280×800 or 1440×900.

The looks come from a pure `partState(part, plan)`, from the same plan that gives the running line, so the hotel and the counts always agree. `partState` returns the look, the counts, the share and the tool names.

On step 4, line 2 is "{n} requirements" (see step 4).

**Behaviour:**
- While the models load, the step shows a still image of the hotel. If WebGL is not available or a model fails to load, the still image stays with the parts list, and the tool list and the counts work as normal.
- When a tick changes a part, the changed pieces drop in by 0.35 units and the light fades on over 0.7 s. The walls and the frame change without the drop. On load, the roof opens over 1.4 s.
- With `prefers-reduced-motion`, the roof is open from the start and every change is immediate.
- Pointing at a part shows that part on its own: the other parts and the floors fade. On step 5, a card next to the part shows the part, its families, its counts and who does it. On step 4, the part details open in the side panel.

**Parts list (keyboard and screen readers).** Under the hotel, a compact visible list "Parts of your app" has one row per part, in order from the top floor to the basement, with the same two lines as the label.
- Each row is a button with `aria-pressed`. Pressing it shows that part on its own with its card or details, the same as pointing at it. Pressing it again, or Esc, shows the whole hotel.
- The labels on the picture are for the pointer only (`aria-hidden`), so a screen reader hears each part once.
- The running line is `aria-live="polite"`.

**Medium-Risk and High-Risk.** When no tool covers the profile, one line above the hotel says "No tool covers {profile} yet, so every part is yours." The hotel shows in the Drawing look.

**One component, four modes:**
- **Step 4 (needs):** every part is Drawing; pointing at a part opens its details in the side panel.
- **Step 5 (tools):** live; each tick changes the parts.
- **Step 6 (the go), for the demo:** the hotel in its final look, not interactive.
- **Step 6, after the demo:** the hotel shows progress. The share becomes `(platform + done) / (you + questions + platform)`. Parts with tasks in progress get the in-progress word on the label, and pointing at a part filters the task list to it.
- **Area names:** the step 6 area filter and the `BUILD-PLAN.md` sections use "{part} ({families})", for example "CCTV (Logging)", in hotel order.

**Assets and stack:** Three.js (exact version pinned) with an orthographic camera, in one client component that loads only on the pages that show the hotel (steps 4, 5 and 6). Models are the Kenney Building Kit and Furniture Kit (CC0, 2026-11-09 downloads from kenney.nl). Only the GLB files in use and their colour maps go in `public/models/hotel/`, with the CC0 licence text. The safe, the generator, the gate, the inspection board and the CCTV screens are simple shapes, because the kits have no such models. Everything works offline. The reference test is `.impeccable/mocks/hotel-b/index.html`. It has sample coverage, not real data, and only the Drawing and Solid-and-lit looks, so it is not the reference for counts, labels or accessibility.

### Step 6: Your plan (full redesign after the demo)

The saved project. The go is at the top, so the first visit after step 5 ends with a clear go.

- **The go:** the hotel in its final look under "Your plan is ready. {yours} are yours, and your tools do {platform}." Under it, the three counts: yours · your tools do (with the not-yet-verified number named inside) · questions to answer first.
- **Summary line:** app type · tools. "Change answers" opens steps 1, 3 or 4, and "Change tools" opens step 5.
- **Actions:** the main action is "Give your agent the build plan" (downloads `BUILD-PLAN.md`). The Export menu has the security review spreadsheet and the OSCAL files last.
- **Questions block** above the tasks while any question is open. Each question can be answered here, and the counts and the hotel update. Questions do not block the go.
- **Progress** after the demo: "9 of 17 done · 2 in progress · 0 questions", with the hotel in progress mode.
- **Your tasks:** one list, the main area. Filters: status (default "Not done"), area (hotel part with its families, for example "CCTV (Logging)"), and search. A row is one line: title, area, status control. An open row shows what to do, why it matters, who says it is yours, the tool tip from the existing hints, the note, and the official wording. Only one row is open at a time.
- **What your tools do** (closed by default, grouped by tool, each claim with its verification and source), **Good to have** (closed), and **Doesn't apply to your app** (closed, each with its reason).
- **Removed:** the floor plan and the tool picker on this page. Tools are changed in step 5.
- **For the demo:** the page keeps today's structure without the floor plan and the picker, in the new look, with the go at the top.

## Profiles

- **Load Medium-Risk Cloud and High-Risk Cloud CII** from `im8-lite-catalog.xlsx`, column "SSP-Profile Level" (format `"<Profile> - Level <n>"`, `;` between profiles).
  - Medium-Risk Cloud: the same 118 requirements as Low-Risk Cloud, 9 with a different level.
  - High-Risk Cloud CII: the same 118 plus 20 more, 19 with a different level.
  - Both are labelled locally derived.
- **Wording.** Low-Risk Cloud keeps `low-risk-cloud-ssp.xlsx`, which has resolved parameter values. Medium and High use the lite-catalog wording, with parameters as written there. The plan says so in one line.
- **Plain text and About-your-app rules are checked per profile.** They are written for one profile and can be wrong for another. For example, a plain task can say "every 365 days" where a stricter profile sets a shorter time, or a rule can remove a requirement that applies in all cases at High risk.
  - Each plain entry gets `checkedFor: string[]` (profile IDs). Today's entries get `['low-risk-cloud']`.
  - **Plain text** shows for a profile in two cases. Case 1: the profile is in `checkedFor`. Case 2: the requirement's official statement in that profile has no parameter, and its wording fingerprint is the same as in a profile in `checkedFor`. In every other case the builder sees the official wording for that profile, with the line "A plain version isn't checked for this risk level yet."
  - **`appliesWhen` rules** apply only in profiles in `checkedFor`. They never carry over automatically. In any other profile the requirement always applies. This keeps the rule that an unknown never removes a requirement.
  - The admin adds a profile to `checkedFor` after a check. For the demo that is seed data. The editor comes with the platform workspace.
  - Requirements with no plain entry (for example the 20 High-only ones) show the official wording.
- **Defaults** (`defaults.json`, the requirements that default to the builder) are reused by requirement ID.
- **Coverage is per profile only.** A tool covers a profile only through a version for that profile. There is no carry-over from Low-Risk.
- **Risk level → profile is data.** Each profile record gets `riskLevel: 'low' | 'medium' | 'high'`, `requiresCii?: boolean`, and `release: string` (the release version; today the file version). `assessRisk` returns the level only, and a pure `profileFor(result, profiles)` picks the profile. Remove the fixed `'low-risk-cloud'` IDs from `plan-view.tsx`, `app/api/export/oscal/route.ts`, `app/api/export/ssp/route.ts`, `lib/export/ssp-xlsx.ts`, `lib/risk/assess.ts` and the verifier page default.
- **GenAI** is added by the `uses-genai` fact at any risk level, not by a tool.
- **Exports.**
  - `BUILD-PLAN.md` and OSCAL work for every profile.
  - The security review spreadsheet uses the Low-Risk template for Low-Risk Cloud. For other profiles it builds a sheet with the same columns from the profile, and the About sheet says "No official template for this profile; columns follow the Low-Risk Cloud template."

## Change notice on saved projects (after the demo)

- The project stores `seen: { at, profileId, items: Record<RequirementKey, { placement, wording: string /* hash of the official statement */ }> }`. It is written when the project is saved and when the builder clicks "Mark as seen".
- On open, Blueprint compares the current plan with `seen` and lists the groups that have items:
  - your app type changed (from {profile} to {profile}). `seen` also stores the profile ID.
  - new tasks or questions (To do)
  - a done task whose wording changed (stays Done with a "Check again" mark)
  - a tool now covers it (moves to "What your tools do")
  - a tool no longer covers it (moves to tasks as To do)
  - a verification changed
  - removed (kept in history, not counted)
- "Show me the changes" filters the task list. This works for new tool versions now, and for catalog or profile releases when the platform workspace adds them.
- A project saved before this feature has no `seen`. Its first open writes `seen` and shows no notice.

## Data and engine changes

- `Profile`: `riskLevel`, `requiresCii?`, `release`.
- `lib/data/load-sources.ts`: `loadLiteProfile(name, id, riskLevel)` for the two new profiles. The plain-language, facts and defaults loaders read by requirement ID for every cloud profile.
- `lib/risk/assess.ts`: drop `profileId` from `RiskResult`; add `profileFor`.
- `lib/plan/effect.ts` (new, pure): `toolEffects(input: PlanInput, ticked: string[]): Record<toolId, { removed: { tasks: number; questions: number }; added: { tasks: number; questions: number }; unverified: number; net: number; noCoverage: boolean }>`.
- `lib/risk/assess.ts`: also `cloudEligible(answers): boolean`.
- Plain entries: `checkedFor: string[]`, and a wording fingerprint per profile entry (a hash of the official statement).
- URL state: carry risk answers and facts through `/start/*` (steps 1–4) both ways (`lib/plan/url-state.ts`). Tools and question answers are on the project only.
- Routes: new `/start/needs` and `/projects/[id]/tools`; redirects from `/start/review`, `/start/tools`, `/start/go` and `/plan` to `/start/needs`.
- `Project.toolsReviewedAt?: Date`: unset on a new project, so it opens on step 5. A profile change on save clears it.
- Save from step 4: a server action creates the project with `riskAnswers`, `facts`, `toolIds: []` and the name, and redirects to `/projects/[id]/tools`. A tick on step 5 writes `toolIds` at once.
- `data/seed/contacts.json`: the contact for the "can't plan yet" verdict.
- `lib/plan/hotel.ts` (new, pure): the part table with a one-sentence `summary` per part, `partOf(family)`, the piece lists, and `partState(part, plan, mode: 'needs' | 'tools' | 'progress')`.
- Facts: `uses-genai` for every profile. `lib/plan/select.ts` adds the `generative-ai` profile when it is yes. Remove `activatesProfiles` from `Tool` and from the genCentral seed.
- Tools: `partOfAppWhen: string` (one line) in `data/seed/tools.json`.
- `BUILD-PLAN.md`: sections by hotel part, named "{part} ({families})".
- `Project.seen` (after the demo).

## Later (other sub-projects)

- **Platform workspace:**
  - catalog and profile release upload, diff and publish (verifier)
  - coverage linked to a release, and rows marked not yet verified when their requirement changes
  - plain-text review when the official wording changes
  - an editor for the contact text
  - "start my Medium-Risk draft from my Low-Risk answers"
  - a CPFB-wide component for organisation-level requirements (for example pm-1, pm-2)
- **Review end point:** "Get ready for review", with the OSCAL POA&M.
- **Not chosen now:** agent kit, person-only work with a timeline, and a coding-agent verdict (it would become outdated as tool approvals change).

## Tests

- Hotel: every code in `FAMILIES` maps to a part. On the real seed demo (not sample numbers), `partState` gives each look as appCentral is ticked and unticked, and its counts add up to the running line.
  - A part whose covering claims are all done by tools but one is not yet verified is Solid, not lit, and its label says "· 1 not yet verified".
  - The solid-piece count follows the share, with at least one solid piece above 0 and at least one drawn piece below 1.
  - A part with no counting items stays and says "Nothing for your app". The Smart assistant shows only with `uses-genai` yes.
  - With no coverage for the profile, every part is Drawing and the line names the profile.
  - Progress mode: a done task raises the share.
  - Needs mode: every part is Drawing, and line 2 of each label is "{n} requirements". The step 4 line counts the same items as the plan with no tools.
  - Playwright: no two label boxes overlap at 1280×800 and 1440×900, on step 4 and on step 5 with appCentral ticked. Each parts-list row is a button with `aria-pressed` and the same words as its label. Esc shows the whole hotel. With WebGL off, steps 4 and 5 show the still image and the list.
- GenAI: `uses-genai` yes adds the GenAI requirements with no tool ticked. genCentral's effect is then removed ≥ 1, not net < 0.
- Tool order: on step 5, ticking a tool does not change the order of the rows.
- Step 4 part details: the summary shows first, and "Show all {n} requirements" lists exactly the part's counting items, each with its official wording. A question row has the red dot.
- Save and tools: "Save this plan" with the filled-in name creates one project and opens step 5. A new project opens on step 5 until "Continue to your plan", then on step 6. A tick on step 5 is on the project after a reload. Steps 1–5 offer no build plan download.
- `assessRisk` + `cloudEligible` + `profileFor`: each row of the verdict table, including "High, not CII → none". Confidential (not cloud-eligible) and S-class → not cloud-eligible, with no profile. Confidential (Cloud Eligible) → Medium-Risk Cloud.
- Plain text per profile: an entry with `checkedFor: ['low-risk-cloud']` shows its plain text on Low. On Medium it shows the official wording when the statement has a parameter, and the plain text when the statement has no parameter and the same fingerprint. An `appliesWhen` rule never removes a requirement on a profile that is not in `checkedFor`.
- `toolEffects` with a claim that points to another tool: `added.questions` ≥ 1, and the screen text names it.
- Question answers on a saved plan: a reason with spaces, `&` and non-ASCII is stored as typed. A reason over 280 characters is cut at 280.
- Editing a saved project: the save goes to the same project ID, and tools and statuses stay. A profile change shows the "app type changes" line and opens step 5.
- Profile loading: Medium has 118 entries with 9 level changes; High has 138. The levels match the lite catalog tags.
- `toolEffects`: on the seed demo, appCentral's removed count matches the plan difference. A tool with no coverage for the profile gives `noCoverage: true`. Only `you` + `questions` count. The unverified count matches the claims. `net = removed − added`.
- URL state round trip: from step 4 back to step 1 and forward again, nothing is lost.
- Builder-language e2e test: steps 1–5 still pass. Add a stage-neutral check that bans "will use", "before you build" and "to build" in steps 1–5.
- Exports: `BUILD-PLAN.md`, OSCAL (schema-valid) and the spreadsheet for a Medium plan.
- Playwright smoke: start → verdict → app → needs (open CCTV, show all its requirements) → save → tools (tick appCentral) → continue → the plan page (the hotel and "Your plan is ready") → download the build plan.

## Constraints

- Desktop only. Next.js 16: read `node_modules/next/dist/docs/` before route work. Stable accessible names for tests, or deliberate test updates.
- The OSCAL shared-responsibility work (commits `4512d35`..`8f3be9c`) is on main. The fixed-ID removal touches `app/api/export/oscal/route.ts`, which that work changed. Build on the current file.
- PRODUCT.md is out of date: the users (officer, not developers and tech leads), the "presentation only" constraint, and the blueprint brand commitments. Update it with the user's approval when the visual round settles the new world.

## Open decisions

- The full name of SII.
- The contact text for the "can't plan yet" verdict.
- The final stage-neutral words (visual round).
- The palette and type of the hotel and the steps (shape brief). The cream paper and Inter are not decided.
