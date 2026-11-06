# Builder journey — design

Date: 2026-11-06. Status: sections 1–6 approved in chat; written spec waiting for review.
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
- **Success:** a clear go at the start. Within minutes, the officer knows the app type, which tools to use and what each removes, the few things that are theirs, and has the build plan for their agent.
- **Anti-goals:** it must not feel like a compliance form, and it must not feel like a dashboard (cards, charts and badges with no next step).

## Scope

| | Build for the demo (2026-11-17) | Design now, build after |
|---|---|---|
| Steps 1–5 (start to go) | Yes | |
| Step 6 (plan page) | It keeps today's layout but takes the new look; the floor plan goes | Yes, the full redesign |
| Change notice on saved projects | | Yes |
| Medium-Risk and High-Risk profiles | Yes | |

The visual world is replaced. A direction round runs before any UI code (Impeccable seed reference `seed:2721ecae0fe04aab`). This spec fixes structure, content and behaviour, not the look.

## Copy rules

- The builder-language rule in PRODUCT.md stays: no "IM8", "SSP", "OSCAL", "control" or "agency" in our own builder copy.
- **Stage-neutral wording (new).** Steps 1–5 must read the same for an app that is new, part built or built. They must not use future tense about the app or "before you build". Lines to replace include "Who will use your app?", "Tick what your app will use", "yours to build or arrange", "Check these with the right person before you build" and "built by your tools". The final words are set in the visual round.
- Verification words stay: Verified, Not yet verified, Published by GovTech.

## The journey

```
1 Tell us about your app   /start            risk questions
2 Verdict                  /start/verdict    app type and profile (new)
3 About your app           /start/app        tick-list (as today)
4 Your tools               /start/tools      tools with their effect (new; replaces the picker on /plan)
5 Your go                  /start/go         summary and the go (replaces /start/review)
6 Your plan                /plan, /projects/[id]   the workspace
```

- Steps 1–5 show "Step n of 5". Every answer (risk, facts, tools) travels in the link both ways. Back and every "edit" link keep all answers, so the builder never sees an empty form again.
- `/start/review` redirects to `/start/go` with its query string.

### Step 1: Tell us about your app

The risk questions are as today. Each option gets a short hint. CII and SII get "Not sure? Ask your ACISO or MCISO." The full name of SII is still not confirmed, and the screen keeps "SII" until it is.

### Step 2: Verdict

`assessRisk` keeps its rules and returns the level. The profile comes from data, not code (see "Profiles"):

| Result | Profile | Verdict text (intent) |
|---|---|---|
| Low | Low-Risk Cloud | You can plan this app with Blueprint. |
| Medium | Medium-Risk Cloud | You can plan it. Your tools don't cover Medium-Risk yet, so more of the work is yours. Involve your security team early. |
| High and CII | High-Risk Cloud CII | You can plan it. Involve your security team from the start. |
| High, not CII (Critical impact or S-class) | none | Blueprint can't plan this app yet. It shows the reasons, the contact, and a summary of the answers to send them. |

- The screen shows the reasons from `assessRisk` and a link to edit the answers.
- The contact text is kept by an admin. For the demo it is seed data (`data/seed/contacts.json`), with no editor yet.

### Step 3: About your app

As today (`/start/app`), with stage-neutral words. No new questions.

### Step 4: Your tools

There are **no rules on tools**. The recommendation comes from the coverage that already exists, so it stays right when tools or coverage change.

**Effect of a tool `T` for this app.** Count only the items that apply to this app: headings `you` and `questions`. `skipped`, `good-to-have` and `platform` are not counted.
- If `T` is ticked: the effect is `plan(ticked − T)` minus `plan(ticked)`. This is the number of tasks and questions that `T` removes now.
- If `T` is unticked: the effect is `plan(ticked)` minus `plan(ticked + T)`.
- Unverified part: of the items that the effect moves, the number where `T`'s decisive claim is `not-yet-verified`.

**What the screen shows:**
- **Recommended** (listed first): tools whose effect is ≥ 1, sorted by effect, then verified tools before unverified ones, then by name. Each shows, for example, "Removes 6 tasks, answers 2 questions (4 not yet verified)".
- **Other tools:** tools with effect 0 ("Nothing for your app"), and tools with no coverage for the profile ("No Medium-Risk Cloud coverage yet").
- **Nothing is ticked by default.** A button "Use the recommended tools" ticks every recommended tool. The builder can untick any tool.
- **A running line:** "{yours} are yours · {platform} your tools do ({unverified} not yet verified) · {questions} questions". It updates on every tick.
- The tools are sections as today (CPF tools, Whole-of-government tools, Code components) inside each group, with the Sample and verification badges as today.

### Step 5: Your go

- **Summary line:** app type · picked tools. It links to steps 1, 3 and 4.
- **Three counts:** yours · your tools do (with the not-yet-verified number named inside) · questions to answer first.
- **Questions first:** each open question can be answered here, and the counts update. Questions do not block the go.
- **Profile note:** one line on Medium or High, as in step 2.
- **Actions:** the main action is "Give your agent the build plan" (downloads `BUILD-PLAN.md`). Then "Save as a project" (asks for a name) and "Open the full plan" (step 6).

### Step 6: Your plan (full redesign after the demo)

- **Header:** the step 5 summary plus progress ("9 of 17 done · 2 in progress · 0 questions"), "Change answers or tools", and an Export menu (build plan for your agent, security review spreadsheet, OSCAL files last).
- **Questions block** above the tasks while any question is open.
- **Your tasks:** one list, the main area. Filters: status (default "Not done"), area (requirement family), and search. A row is one line: title, area, status control. An open row shows what to do, why it matters, who says it is yours, the tool tip from the existing hints, the note, and the official wording. Only one row is open at a time.
- **What your tools do** (closed by default, grouped by tool, each claim with its verification and source), **Good to have** (closed), and **Doesn't apply to your app** (closed, each with its reason).
- **Removed:** the floor plan and the tool picker on this page. Tools are changed in step 4.
- **For the demo:** the page keeps today's structure without the floor plan and the picker, in the new look.

## Profiles

- **Load Medium-Risk Cloud and High-Risk Cloud CII** from `im8-lite-catalog.xlsx`, column "SSP-Profile Level" (format `"<Profile> - Level <n>"`, `;` between profiles).
  - Medium-Risk Cloud: the same 118 requirements as Low-Risk Cloud, 9 with a different level.
  - High-Risk Cloud CII: the same 118 plus 20 more, 19 with a different level.
  - Both are labelled locally derived.
- **Wording.** Low-Risk Cloud keeps `low-risk-cloud-ssp.xlsx`, which has resolved parameter values. Medium and High use the lite-catalog wording, with parameters as written there. The plan says so in one line.
- **Plain text and About-your-app rules** are reused by requirement ID across the cloud profiles. Requirements with no plain text (the 20 High-only ones) show the official wording.
- **Defaults** (`defaults.json`, the requirements that default to the builder) are reused by requirement ID.
- **Coverage is per profile only.** A tool covers a profile only through a version for that profile. There is no carry-over from Low-Risk.
- **Risk level → profile is data.** Each profile record gets `riskLevel: 'low' | 'medium' | 'high'`, `requiresCii?: boolean`, and `release: string` (the release version; today the file version). `assessRisk` returns the level only, and a pure `profileFor(result, profiles)` picks the profile. Remove the fixed `'low-risk-cloud'` IDs from `plan-view.tsx`, `app/api/export/oscal/route.ts`, `app/api/export/ssp/route.ts`, `lib/export/ssp-xlsx.ts`, `lib/risk/assess.ts` and the verifier page default.
- **GenAI** is still added by genCentral at any risk level.
- **Exports.**
  - `BUILD-PLAN.md` and OSCAL work for every profile.
  - The security review spreadsheet uses the Low-Risk template for Low-Risk Cloud. For other profiles it builds a sheet with the same columns from the profile, and the About sheet says "No official template for this profile; columns follow the Low-Risk Cloud template."

## Change notice on saved projects (after the demo)

- The project stores `seen: { at, items: Record<RequirementKey, { placement, wording: string /* hash of the official statement */ }> }`. It is written when the project is saved and when the builder clicks "Mark as seen".
- On open, Blueprint compares the current plan with `seen` and lists the groups that have items:
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
- `lib/plan/effect.ts` (new, pure): `toolEffects(input: PlanInput, ticked: string[]): Record<toolId, { tasks: number; questions: number; unverified: number; noCoverage: boolean }>`.
- URL state: carry risk answers, facts and tools through `/start/*` both ways (`lib/plan/url-state.ts`).
- `data/seed/contacts.json`: the contact for the "can't plan yet" verdict.
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

- `assessRisk` + `profileFor`: each row of the verdict table, including "High, not CII → none".
- Profile loading: Medium has 118 entries with 9 level changes; High has 138. The levels match the lite catalog tags.
- `toolEffects`: on the seed demo, appCentral's effect matches the plan difference. A tool with no coverage for the profile gives `noCoverage: true`. Only `you` + `questions` count. The unverified count matches the claims.
- URL state round trip: from step 5 back to step 1 and forward again, nothing is lost.
- Builder-language e2e test: steps 1–5 still pass. Add a stage-neutral check that bans "will use", "before you build" and "to build" in steps 1–5.
- Exports: `BUILD-PLAN.md`, OSCAL (schema-valid) and the spreadsheet for a Medium plan.
- Playwright smoke: start → verdict → app → tools (Use the recommended tools) → go → download the build plan.

## Constraints

- Desktop only. Next.js 16: read `node_modules/next/dist/docs/` before route work. Stable accessible names for tests, or deliberate test updates.
- The OSCAL shared-responsibility work (commits `4512d35`..`8f3be9c`) is on main. The fixed-ID removal touches `app/api/export/oscal/route.ts`, which that work changed. Build on the current file.
- PRODUCT.md is out of date: the users (officer, not developers and tech leads), the "presentation only" constraint, and the blueprint brand commitments. Update it with the user's approval when the visual round settles the new world.

## Open decisions

- The full name of SII.
- The contact text for the "can't plan yet" verdict.
- The final stage-neutral words (visual round).
