# Builder journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the start flow and plan page with the six-step journey (risk, verdict, about your app, what your app needs, your tools, your plan), drawn as a 3D hotel cutaway in the new light look, and add the Medium-Risk and High-Risk cloud profiles.

**Architecture:** Pure functions in `lib/` decide everything the screens show (`lib/risk/assess.ts` for the verdict, `lib/plan/hotel.ts` for each hotel part's look and words, `lib/plan/effect.ts` for what a tool takes off the builder). Server pages read the link or the saved project, run those functions and pass plain data to small client views. The hotel is one client component that loads Three.js only on steps 4–6, draws from the pure part states, and falls back to a still image and the parts list.

**Tech Stack:** Next.js 16.4.3 (App Router, server actions), React 19.3, Tailwind CSS 4, MongoDB 7, Vitest 4, Playwright 1.64, Three.js 0.169.0 (new), `@fontsource-variable/archivo` (new).

**Spec:** `docs/superpowers/specs/2026-11-06-builder-journey-design.md`. Direction contract: `.impeccable/surfaces/app-layout-tsx.md` (read it, never copy it into source). Reference test for the hotel: `.impeccable/mocks/hotel-b/index.html`.

## Global Constraints

- Builder copy never says "IM8", "SSP", "OSCAL", "control", "agency" (PRODUCT.md rule; checked by `e2e/regressions.spec.ts`).
- Steps 1–5 are stage-neutral: no "will use", "before you build", "to build", and no future tense about the app.
- Verification words stay exactly: "Verified", "Not yet verified", "Published by GovTech".
- Colours: ground `#f6f8fa`, ink `#1c2b3a`, soft ink `#4b5c70`; hotel line `#5f86b3` on fill `#eef3f9` (drawing only, never text); light `#ffc879`; red `#b8322a` for questions only.
- Type: Archivo variable, wide (112%) for page headings, normal for text, narrow (80%) for hotel labels and counts; Roboto Mono only for requirement codes. Barlow is removed.
- One ink-colour main action per step; other actions are links or outline buttons. 3px corners, 1px rules, no shadows, no grid paper, no title-block cells. Focus ring in ink.
- Steps 4–5 at 1280×800 and 1440×900: simple header, hotel column about 60% that does not scroll, side panel about 40% that is the only scroll, main action at the foot of the side panel.
- `three` and `@types/three` pinned to exactly `0.169.0`; `@fontsource-variable/archivo` pinned exactly (`--save-exact`). Use npm (`package-lock.json`); never touch `pnpm-lock.yaml` or `pnpm-workspace.yaml`.
- Everything works offline: models, fonts and Three.js are served from the app.
- Next.js 16 differs from older versions: before each route, redirect or server-action task, read the guides named in that task under `node_modules/next/dist/docs/`.
- Never stage these untracked files: `BUILD-PLAN.md`, `low-risk-cloud-ssp.xlsx`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.impeccable/critique/`, `.impeccable/mocks/`. Stage files by name, never `git add -A`.
- Do not start a dev server. Playwright starts its own production server on port 3100 with database `buildplan_e2e`. `npm run seed` and `/api/reset` drop collections: never run them against `buildplan` without the user.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Desktop only.
- Before any UI edit, read `/Users/tate/.claude/plugins/cache/impeccable/impeccable/4.8.0/skills/impeccable/reference/craft-floor.md` (once per task that edits UI).

## Decisions this plan makes (the user confirms them at review)

1. **Owner name.** The spec wants one click to save, but `createProject` requires `ownerName`. The plan makes it optional with the default "App builder".
2. **Official wording on step 4** comes from the `ProfileEntry` map (as `ItemDetail` does today), not from a new `PlanItem.statement` field.
3. **Models** are copied from `.impeccable/mocks/hotel-b/models/` (the 2026-11-09 Kenney downloads), so no new download is needed.
4. **`BUILD-PLAN.md`** keeps its four numbered sections, so `AGENT_SNIPPET` stays correct. Inside sections 1–3, items are grouped under `### {part} ({families})` in hotel order.
5. **High-Risk Cloud CII has two families the hotel table does not have:** `hr` (People: training, screening, leavers) goes to Hotel rules, and `rs` (Resilience: multi-AZ, scaling, load testing) goes to Standby generator.
6. **genCentral has no coverage in the seed.** With `activatesProfiles` gone it shows in "Other tools" as "No Low-Risk Cloud coverage yet". The plan does not invent sample coverage. The spec test "genCentral removed ≥ 1" becomes "genCentral is not net < 0".
7. **Contact text** for "can't plan yet" is "Your IT security officer (ACISO or MCISO)" until the user gives the real one (an open decision in the spec).
8. **Facts file.** `data/facts/low-risk-cloud.json` is renamed `data/facts/cloud.json` and loaded for every cloud profile. Its rules act only where `checkedFor` allows.
9. **`toolsReviewedAt`** is an ISO string, like `createdAt` and `updatedAt`.
10. **Lit look.** "Published by GovTech" counts as verified for the warm light, as it is an approval.

## Demo numbers (real seed, computed 2026-11-10)

Answers: Restricted, Sensitive Normal, Slight, None or minimal, no CII, no SII. Facts: `reach=public, web=yes, signin=yes, sms=yes, domain=no, shortlinks=no` (`DEMO_FACTS` below).

| Ticked | you | platform | questions | not yet verified | skipped |
|---|---|---|---|---|---|
| nothing | 84 | 0 | 0 | 0 | 2 (is-11, is-15) |
| appCentral | 18 | 51 | 15 | 0 | 2 |
| appCentral + DBaaS | 18 | 55 | 11 | 4 | 2 |
| appCentral + DBaaS + IGA | 18 | 66 | 0 | 15 | 2 |

Per family with appCentral (you/questions/platform): as 5/0/6, sc 2/0/3, st 2/0/3, ns 0/0/8, br 0/0/2, dp 0/4/0, lm 0/0/10, ac 0/11/0, cs 2/0/3, pm 6/0/0, is 1/0/9, sd 0/0/7. With nothing ticked: as 11, sc 5, st 5, ns 8, br 2, dp 4, lm 10, ac 11, cs 5, pm 6, is 10, sd 7 (all `you`). `ck`, `dc`, `tp` have no counting items on Low-Risk Cloud. The 15 appCentral questions are redirects (dp-1..4, ac-1..9, ac-12, ac-14). Verification: appCentral, WebSG and Isomer are approved; DBaaS, IGA, Zod, Prisma and SHIP-HATS are not. If a number differs when you run the test, the seed changed: stop and report it, do not edit the expectation.

Profiles (lite catalog): Medium-Risk Cloud 118 entries, 9 level changes (br-2, lm-5, lm-19, cs-8, is-12, is-13, sd-3, ck-1, ck-2, each 2 → 1). High-Risk Cloud CII 138 entries, 19 level changes. Of the 118 shared statements, 26 have a parameter (for example as-5, as-11, st-1) and 92 match the Low-Risk statement word for word after whitespace is collapsed (for example as-1).

## Review Focus

1. **A project link with an ID that does not exist** (`/projects/nope/tools`, `/start/needs?…&project=nope`): the builder expects a plain "not found" page, not an error page or a silent new project. Test in Task 10 and Task 11.
2. **A step link with missing or broken answers** (`/start/verdict`, `/start/needs?c=bad`): the builder expects step 1 with every answer that still parses filled in. Test in Task 6 (parser) and Task 7 (pages).
3. **Two fast clicks on "Save this plan"**: the builder expects one project. Test in Task 10.
4. **Browser Back after the save**: Back from step 5 must not land on a step 4 that saves a second copy; the save replaces the history entry, so Back goes to step 3. Test in Task 10.
5. **The window is resized on steps 4–5**: the canvas follows its column and the labels stay inside the stage without overlap. Test in Task 13.

---

## File map

| File | Responsibility |
|---|---|
| `app/globals.css` | Tokens and base styles of the light look |
| `app/layout.tsx`, `app/components/header.tsx`, `app/components/site-header.tsx` | Simple header: product name, sheets, "Step n of 5", role, demo reset |
| `lib/plan/steps.ts` | `stepFor(pathname)` |
| `lib/risk/assess.ts` | `assessRisk` (level only), `cloudEligible`, `profileFor` |
| `lib/plan/verdict.ts` | Step 2 words from answers, profiles and coverage |
| `lib/plan/hotel.ts` | Part table, family names, `partOf`, pieces, `partState`, `planTotals`, labels |
| `lib/plan/effect.ts` | `toolEffects`, `effectText`, `tasksAdded` |
| `lib/plan/needs.ts` | Step 4 detail rows per part |
| `lib/plan/url-state.ts` | `startQuery`, `parseStartQuery` (plus today's `planQuery`) |
| `app/start/*` | Steps 1–4 |
| `app/projects/[id]/tools/*` | Step 5 |
| `app/projects/[id]/page.tsx`, `app/plan/plan-view.tsx`, `app/plan/go.tsx` | Step 6 |
| `app/hotel/scene.ts`, `app/hotel/models.ts` | Three.js scene, imperative, client only |
| `app/hotel/hotel.tsx`, `app/hotel/parts-list.tsx`, `app/hotel/labels.ts` | Hotel React component, labels, parts list |
| `public/models/hotel/` | GLB files, colour map, CC0 licence, `still.png` |
| `lib/data/load-sources.ts`, `lib/data/seed-documents.ts` | Profiles from the lite catalog, plain text per profile |
| `lib/export/*`, `app/api/export/*` | Exports for every profile |

---

## Phase A: the look

### Task 1: Tokens, Archivo and the simple header

**Files:**
- Modify: `package.json`, `package-lock.json`, `app/globals.css`, `app/layout.tsx`, `app/components/header.tsx`, `app/ui/button.tsx`, every file the token test names
- Create: `app/components/site-header.tsx`, `lib/plan/steps.ts`, `test/ui/tokens.test.ts`, `test/plan/steps.test.ts`
- Delete: `app/components/title-block.tsx`, `app/ui/title-cell.tsx`, `app/@titlecells/` (whole folder)
- Modify: `e2e/regressions.spec.ts` (only the title-block assertions), `e2e/platform-team.spec.ts`, `e2e/agent-coverage.spec.ts` if their header queries change

**Interfaces:**
- Produces: `stepFor(pathname: string): 1 | 2 | 3 | 4 | 5 | null`; CSS tokens `ground`, `paper`, `ink`, `ink-soft`, `rule`, `rule-strong`, `redline`, `redline-wash`, `done`, `done-wash`, `working`, `working-wash`, `hotel-line`, `hotel-fill`, `hotel-light`; utilities `wide` (font-stretch 112%) and `narrow` (font-stretch 80%); CSS variable `--header-h: 56px`; `buttonClass('primary')` in ink.

Read first: the parallel routes guide (find it with `grep -rl "Parallel Routes" node_modules/next/dist/docs/01-app | head -3`; the `@titlecells` slot is removed) and `.impeccable/surfaces/app-layout-tsx.md`.

- [ ] **Step 1: Write the failing tests**

`test/plan/steps.test.ts`:
```ts
test.each([
  ['/start', 1], ['/start/verdict', 2], ['/start/app', 3], ['/start/needs', 4],
  ['/projects/abc/tools', 5], ['/projects/abc', null], ['/projects', null], ['/admin', null],
])('stepFor(%s) is %s', (path, n) => expect(stepFor(path)).toBe(n));
```

`test/ui/tokens.test.ts`: reads `app/globals.css` and every `.tsx` under `app/`.
```ts
test('the light look tokens have the shape-brief values', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  for (const [name, value] of [['ground', '#f6f8fa'], ['ink', '#1c2b3a'], ['ink-soft', '#4b5c70'], ['hotel-line', '#5f86b3'], ['hotel-fill', '#eef3f9'], ['hotel-light', '#ffc879'], ['redline', '#b8322a']])
    expect(css).toMatch(new RegExp(`--color-${name}:\\s*${value}`, 'i'));
  expect(css).toMatch(/Archivo Variable/);
  expect(css).not.toMatch(/Barlow|drafting-grid|hatch-|revision-cloud|--shadow-/);
});
test('no component uses a removed token or utility', () => {
  const banned = /\b(bg-blueprint|text-blueprint|border-blueprint|blueprint-wash|blueprint-deep|bg-table|drafting-grid|hatch-built|hatch-progress|revision-cloud|shadow-dialog|shadow-dock|font-display|rounded-xs)\b/;
  const hits = tsxFiles('app').filter(f => banned.test(readFileSync(f, 'utf8'))); // tsxFiles: a small recursive readdirSync helper in this file
  expect(hits).toEqual([]);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/plan/steps.test.ts test/ui/tokens.test.ts`
Expected: FAIL (`stepFor` not found; Barlow found; banned classes found).

- [ ] **Step 3: Install and remove packages**

```bash
npm install --save-exact three@0.169.0 @fontsource-variable/archivo
npm install -D --save-exact @types/three@0.169.0
npm uninstall @fontsource/barlow @fontsource/barlow-semi-condensed
```
Expected: `package.json` shows `"three": "0.169.0"` and an exact Archivo version; `pnpm-lock.yaml` is unchanged (`git status` shows it still untracked only).

- [ ] **Step 4: Rewrite the tokens in `app/globals.css`**

Replace the `@theme` colours with the tokens listed under Interfaces (`rule #d5dce4`, `rule-strong #9aa8b8`, `paper #ffffff`, `redline-wash #fbeceb`; keep the done and working values). Fonts: `--font-sans: "Archivo Variable", system-ui, sans-serif`, `--font-code: "Roboto Mono Variable", ui-monospace, monospace`; remove `--font-display`. Add `--radius-sm: 3px` and use `rounded-sm` for every corner. Remove the shadows and the `drafting-grid`, `hatch-*`, `revision-cloud*` utilities; keep `tnum`. Add `@utility wide { font-stretch: 112%; }` and `@utility narrow { font-stretch: 80%; }`. Base layer: `body` on `ground`, text `ink`, focus ring `outline-2 outline-ink outline-offset-2`, `accent-color` ink.

- [ ] **Step 5: Replace the title block with the simple header**

`app/layout.tsx`: import `@fontsource-variable/archivo/wdth.css` and Roboto Mono; drop the double frame and grid; body holds `<Header />`, `<DbStatus />`, `<main className="mx-auto w-full max-w-[1440px] px-8 pt-8 pb-16">`. The layout no longer takes `titlecells`.
`app/components/site-header.tsx` (client): height `var(--header-h)`, 1px rule under it, on `paper`. Left: "Blueprint" link to `/start` (wide, semibold) and the sheets nav (`aria-label="Sheets"`, links "New plan", "Saved projects", and "Admin" or "Verify" by role; current link underlined, `aria-current="page"`). Middle: "Step {n} of 5" from `stepFor(usePathname())`, only when not null. Right: `RoleSwitcher` and `ResetButton` (label stays "Reset demo data"). No uppercase label cells.
`app/ui/button.tsx`: primary is `bg-ink text-paper hover:bg-ink/90`; secondary is a 1px `rule-strong` outline on `paper`; quiet is a text button.

- [ ] **Step 6: Replace every removed class the token test names**

`blueprint*` → `ink` (text and lines) or `hotel-line` only inside the hotel; `bg-table` → `bg-ground`; `font-display` → `wide font-semibold`; `rounded-xs` → `rounded-sm`; delete grid, hatch and cloud classes and shadows. The floor plan files keep working until Task 14 (replace their hatch classes with plain fills).

- [ ] **Step 7: Run the unit tests, types and lint**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: all PASS, no type errors (`LayoutProps` no longer has `titlecells`).

- [ ] **Step 8: Update the e2e header queries and run them**

In `e2e/regressions.spec.ts` remove the assertions on title-block cells inside `banner`; keep the `navigation "Sheets"` queries. Run: `npm run e2e`
Expected: PASS except failures caused only by the start-flow changes that come later (there are none yet, so all PASS).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json app/globals.css app/layout.tsx app/components app/ui lib/plan/steps.ts test/ui/tokens.test.ts test/plan/steps.test.ts e2e/regressions.spec.ts app/@titlecells <every other file changed in step 6>
git commit -m "feat: light look tokens, Archivo and the simple header"
```

---

## Phase B: pure engine

### Task 2: Verdict rules: `cloudEligible`, `profileFor`, profile metadata

**Files:**
- Modify: `lib/risk/assess.ts`, `lib/domain/types.ts`, `lib/data/load-sources.ts`, `lib/export/plan-request.ts`, `test/helpers/factories.ts` (`makeProfile` sets `release`), `app/start/start-form.tsx`, `app/start/app/page.tsx`, `app/start/review/page.tsx`, `app/plan/page.tsx`, `test/risk/assess.test.ts`
- Create: `lib/plan/verdict.ts`, `test/plan/verdict.test.ts`, `data/seed/contacts.json`

**Interfaces:**
- Produces:
  - `RiskResult = { level: 'low' | 'medium' | 'high'; appType: string; reasons: string[] }` (no `profileId`).
  - `cloudEligible(a: RiskAnswers): boolean` (false for `confidential` and `s-class`).
  - `Profile` gains `riskLevel?: 'low' | 'medium' | 'high'`, `requiresCii?: boolean`, `hosting?: 'cloud'`, `release: string`. Low-Risk Cloud: `riskLevel: 'low'`, `hosting: 'cloud'`, `release: '2026-10-22 (local copy)'`. GenAI: no `riskLevel`, no `hosting`.
  - `profileFor(a: RiskAnswers, profiles: Pick<Profile, '_id' | 'riskLevel' | 'requiresCii' | 'hosting'>[]): string | null`. It takes the answers, not the result, because CII and cloud eligibility come from the answers. Rule: not cloud-eligible → null; else the cloud profile with `riskLevel === assessRisk(a).level` and `requiresCii` equal to `a.cii` when the level is high (`!!requiresCii === a.cii`), else null.
  - `Verdict = { kind: 'plan' | 'not-cloud' | 'not-yet'; profileId: string | null; heading: string; sentence: string; coverageLine?: string; reasons: string[] }` and `verdictFor(a: RiskAnswers, profiles: Profile[], versions: VersionPair[]): Verdict` in `lib/plan/verdict.ts`.
  - `data/seed/contacts.json`: `{ "cannotPlan": { "who": "Your IT security officer (ACISO or MCISO)", "how": "Send them the summary of your answers below." } }`.

- [ ] **Step 1: Write the failing tests**

`test/risk/assess.test.ts`: remove every `profileId` expectation; add:
```ts
test('Confidential (not cloud-eligible) and S-class are not cloud-eligible', () => {
  expect(cloudEligible({ ...LOW, classification: 'confidential' })).toBe(false);
  expect(cloudEligible({ ...LOW, classification: 's-class' })).toBe(false);
  expect(cloudEligible({ ...LOW, classification: 'confidential-cloud-eligible' })).toBe(true);
});
```
`test/plan/verdict.test.ts` with three fake profiles (`makeProfile` plus the metadata: low, medium, high+requiresCii) and versions only for the low one:
```ts
test.each([
  ['Low', LOW, 'plan', 'low-risk-cloud', 'Low-Risk Cloud', 'You can plan this app with Blueprint.'],
  ['Medium (Cloud Eligible)', { ...LOW, classification: 'confidential-cloud-eligible' }, 'plan', 'medium-risk-cloud', 'Medium-Risk Cloud', 'You can plan it. Involve your security team early.'],
  ['High and CII', { ...LOW, cii: true }, 'plan', 'high-risk-cloud-cii', 'High-Risk Cloud CII', 'You can plan it. Involve your security team from the start.'],
  ['High, not CII', { ...LOW, impact: 'critical' }, 'not-yet', null, 'High-risk app on the cloud', "Blueprint can't plan this app yet."],
  ['Confidential', { ...LOW, classification: 'confidential' }, 'not-cloud', null, 'Not for the cloud', "This data can't be hosted on the cloud, so Blueprint can't plan it with CPF's cloud tools."],
  ['S-class', { ...LOW, classification: 's-class' }, 'not-cloud', null, 'Not for the cloud', "This data can't be hosted on the cloud, so Blueprint can't plan it with CPF's cloud tools."],
])('%s', (_, answers, kind, profileId, heading, sentence) => {
  const v = verdictFor(answers, PROFILES, VERSIONS);
  expect(v).toMatchObject({ kind, profileId, heading, sentence });
});
test('Medium with no tool coverage says so', () => {
  expect(verdictFor({ ...LOW, sensitivity: 'sensitive-high' }, PROFILES, VERSIONS).coverageLine)
    .toBe('No tool covers Medium-Risk Cloud yet, so more of the work is yours.');
});
test('Low with coverage has no coverage line', () => expect(verdictFor(LOW, PROFILES, VERSIONS).coverageLine).toBeUndefined());
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/risk test/plan/verdict.test.ts`
Expected: FAIL (`cloudEligible`, `verdictFor` not defined).

- [ ] **Step 3: Implement `cloudEligible`, `profileFor` and drop `profileId` in `lib/risk/assess.ts`; add the metadata to `Profile` and to `loadLowRiskCloudProfile` and `loadGenAi` (`release` = their `version`)**

- [ ] **Step 4: Implement `verdictFor` in `lib/plan/verdict.ts`**

Heading is the profile `title` when a profile is found, "Not for the cloud" for `not-cloud`, and `assessRisk(a).appType` for `not-yet`. Reasons: `assessRisk(a).reasons`; for `not-cloud` prepend `The data is ${OPTION_LABELS.classification[a.classification]}.` when that reason is not already listed. `coverageLine` only when the profile has no version in `versions`.

- [ ] **Step 5: Switch every caller of `profileId` to `profileFor(answers, data.profiles)`**

`plan-request.ts` keeps throwing `BadPlanRequestError('This type of app is not supported yet.')` when it is null. `start-form.tsx` keeps its inline result for now (Task 7 replaces it) and uses `cloudEligible` plus the level to decide `supported` (Low only, until Task 7).

- [ ] **Step 6: Run the tests and types**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/risk/assess.ts lib/domain/types.ts lib/data/load-sources.ts lib/export/plan-request.ts lib/plan/verdict.ts data/seed/contacts.json app/start app/plan/page.tsx test/risk/assess.test.ts test/plan/verdict.test.ts
git commit -m "feat: verdict from data: cloudEligible, profileFor and profile metadata"
```

### Task 3: The `uses-genai` fact replaces `activatesProfiles`

**Files:**
- Modify: `lib/domain/types.ts`, `lib/plan/facts.ts`, `lib/plan/select.ts`, `lib/data/seed-documents.ts`, `data/seed/tools.json`, `test/plan/genai.test.ts`, `test/plan/facts.test.ts`
- Rename: `data/facts/low-risk-cloud.json` → `data/facts/cloud.json` (update `test/data/facts.test.ts` and `test/data-files.test.ts` paths)

**Interfaces:**
- Produces: `Fact` gains `always?: true` (asked even when no rule reads it). `GENAI_FACT = 'uses-genai'` and `GENAI_PROFILE_ID = 'generative-ai'` exported from `lib/plan/select.ts`. `Tool.activatesProfiles` is removed. `selectPlanInput` adds the GenAI profile when `state.facts?.['uses-genai'] === 'yes'`.

New fact, last in `data/facts/cloud.json`:
```json
{ "id": "uses-genai", "kind": "choice", "always": true,
  "question": "Does your app use generative AI, for example a chatbot or a text summary?",
  "options": [
    { "value": "yes", "label": "Yes" },
    { "value": "no", "label": "No", "reason": "Your app doesn't use generative AI." }
  ] }
```
Also make `reach` stage-neutral: question "Who is your app for?".

- [ ] **Step 1: Write the failing tests** (in `test/plan/genai.test.ts`, replacing the genCentral tests; spreadsheet tests switch from picking genCentral to the fact)

```ts
test('uses-genai yes adds the 8 GenAI requirements as open questions, with no tool ticked', async () => {
  const plan = await demoPlan([], { ...DEMO_FACTS, 'uses-genai': 'yes' });
  expect(plan.items.filter(i => i.profileId === 'generative-ai' && i.heading === 'questions')).toHaveLength(8);
});
test('uses-genai no, or not answered, adds nothing', async () => {
  expect((await demoPlan([], { ...DEMO_FACTS, 'uses-genai': 'no' })).items.some(i => i.profileId === 'generative-ai')).toBe(false);
  expect((await demoPlan([], DEMO_FACTS)).items.some(i => i.profileId === 'generative-ai')).toBe(false);
});
test('picking genCentral no longer adds requirements', async () => {
  expect((await demoPlan(['gencentral'], DEMO_FACTS)).counts).toEqual((await demoPlan([], DEMO_FACTS)).counts);
});
```
`test/plan/facts.test.ts`: `factsToAsk` returns `uses-genai` for a profile whose entries have no rules at all.

Put `demoPlan(toolIds, facts): Promise<Plan>` and `DEMO_FACTS` in `test/helpers/demo.ts` (built on `loadSeed`, `pairVersions`, `selectPlanInput`, `buildPlan`, profile `low-risk-cloud`); later tasks reuse them. `DEMO_ANSWERS` (Restricted, Sensitive Normal, Slight, minimal, no ticks) goes there too.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/plan/genai.test.ts test/plan/facts.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the `always` rule in `factsToAsk`, the fact in `selectPlanInput` (remove the `activatesProfiles` loop), remove `activatesProfiles` from `Tool` and `tools.json`, load `data/facts/cloud.json` for every profile with `hosting: 'cloud'` in `buildSeedDocuments`. In `app/start/app/page.tsx` remove the "nothing to ask goes straight on" redirect (there is always one fact now).

- [ ] **Step 4: Run all unit tests and types**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/types.ts lib/plan/facts.ts lib/plan/select.ts lib/data/seed-documents.ts data/seed/tools.json data/facts test/helpers/demo.ts test/plan test/data test/data-files.test.ts app/start/app/page.tsx
git commit -m "feat: GenAI comes from the uses-genai fact, not from a tool"
```

### Task 4: The hotel model: parts, families, `partState`

**Files:**
- Create: `lib/plan/hotel.ts`, `test/plan/hotel.test.ts`
- Modify: `app/plan/item-detail.tsx`, `app/plan/plan-view.tsx` (import `familyName` from hotel instead of `roomName`)

**Interfaces:**
- Produces:
```ts
export type PartId = 'rules' | 'cctv' | 'rooms' | 'walls' | 'keycards' | 'assistant' | 'inspection' | 'entrance' | 'deliveries' | 'safe' | 'generator' | 'frame';
export interface HotelPart { id: PartId; name: string; families: string[]; summary: string; pieces: readonly string[] }
export const PARTS = [/* see table */] as const satisfies readonly HotelPart[]; // hotel order, top floor to basement; `as const` so Task 12 can type the pieces
export const FAMILY_NAMES: Record<string, string>;   // today's 16 names plus hr 'People', rs 'Resilience'
export function familyName(code: string): string;    // unknown code → code.toUpperCase()
export function partOf(family: string): PartId;      // unknown code → 'rules'
export type Counted = 'you' | 'platform' | 'question';
export function countsAs(item: PlanItem): Counted | null; // level 2, skipped and answered-not-applicable → null
export type Look = 'drawing' | 'partly' | 'solid' | 'lit';
export type HotelMode = 'needs' | 'tools' | 'progress';
export interface PartState {
  id: PartId; look: Look; share: number; solidPieces: number; question: boolean; nothingForApp: boolean;
  counts: { you: number; platform: number; questions: number; unverified: number; done: number; inProgress: number };
  toolNames: string[]; families: string[]; line1: string; line2: string; areaName: string;
}
export function solidPieces(share: number, pieces: number): number;
export function visibleParts(plan: Plan): HotelPart[];   // all, minus 'assistant' unless the plan has a 'ga' item
export function partState(part: HotelPart, plan: Plan, mode: HotelMode): PartState;
export function planTotals(plan: Plan): { you: number; platform: number; unverified: number; questions: number; parts: number };
export function runningLine(t: ReturnType<typeof planTotals>): string;
export function needsLine(t: ReturnType<typeof planTotals>): string;
```

Part table (order = hotel order and parts-list order):

| id | name | families | pieces | summary |
|---|---|---|---|---|
| rules | Hotel rules | pm, hr | desk, chair, bookcase, rules-board | The rules everyone follows, and who is responsible for security. |
| cctv | CCTV | lm | desk, chair, screen-1, screen-2, screen-3, screen-4, screen-5, camera | A record of who did what, and when, so problems can be found and traced. |
| rooms | Hotel rooms | cs | bed-left, table-left, lamp-left, tv-left, bed-right, table-right, lamp-right, tv-right | The rooms your app runs in, kept apart so a problem in one stays in one. |
| walls | Walls, windows and doors | as | basement-back, basement-left, ground-back, ground-left, first-back, first-left, first-partition, top-back, top-left, top-partition | The app itself: what it lets in, and what it lets out. |
| keycards | Room keycards | ac | desk-left, desk-right, screen, keycards, chair | Who can get in, and to which rooms. |
| assistant | Smart assistant | ga | stand, screen, speaker | The generative AI in your app, and what it may say and do. |
| inspection | Safety inspection | st | extinguisher, board, checklist | Tests that look for weak spots, so they are found and fixed. |
| entrance | Entrance security | ns | doorway, scanner-left, scanner-right, doormat | What can reach your app from the network, and what is stopped at the door. |
| deliveries | Building materials and deliveries | sd, sc, tp | platform, box-1, box-2, box-3, box-4, box-5, sign | Where your code and its parts come from, and how they are checked. |
| safe | Hotel safe | dp, ck | vault, door, wheel | Your data, and the keys that lock it. |
| generator | Standby generator | br, rs | body, exhaust, panel | Backups, and getting the app running again after a failure. |
| frame | Foundation and frame | is, dc | footing, columns-basement, columns-ground, columns-first, columns-top | The servers and cloud set-up your app stands on. |

Rules the tests pin:
- `families` in a state are the part's families (table order) that have at least one counting item (`countsAs` not null) in the plan, named with `familyName`; when none has, the first family of the table.
- `line1` = `${name} · ${families.join(', ')}`; `areaName` = `${name} (${families.join(', ')})`.
- `share` = platform / (you + questions + platform) in `tools` mode; (platform + done) / (you + questions + platform) in `progress` mode; 0 in `needs` mode. `questions` counts open questions only.
- `solidPieces(share, n)`: 0 when share ≤ 0, n when share ≥ 1, else `Math.min(n - 1, Math.max(1, Math.round(share * n)))`.
- Look in `needs` mode: always `drawing`. Otherwise: platform 0 → `drawing`; you + questions > 0 → `partly`; else `lit` when every decisive claim of the part's platform items is `verified` or `govtech-published`, else `solid`.
- `line2`, `needs` mode: `${n} requirement(s)` with n = you + questions, plus ` · ${q} question(s)` when q > 0.
- `line2`, other modes, as joined segments: `${you} yours` when you > 0; for platform > 0 and you + questions > 0: `${tool} does ${platform}` (one tool) or `your tools do ${platform}`; for `solid`: `${tool} does all · ${k} not yet verified` (more than one tool: `Your tools do all · …`); for `lit`: `${tool} does all` / `Your tools do all`; then ` · ${q} question(s)` when q > 0. A tool name keeps its own spelling ("appCentral does all"); our own words start with a capital ("Your tools do all").
- No counting items: `nothingForApp: true`, look `drawing`, `line2` "Nothing for your app".
- `toolNames`: names from the decisive claims of the part's platform items, unique, in first-seen order.
- `planTotals.parts` = visible parts that are not `nothingForApp`.
- `runningLine`: `${you} are yours · ${platform} your tools do (${unverified} not yet verified) · ${questions} questions`; the parenthesis is left out when unverified is 0; "1 question" in the singular.
- `needsLine`: `This is everything your app needs: ${you + questions} requirements in ${parts} parts. Next, you choose the tools that meet part of it.`

- [ ] **Step 1: Write the failing tests** in `test/plan/hotel.test.ts` (use `demoPlan` and `DEMO_FACTS` from Task 3)

```ts
test('every family code maps to a part, and an unknown code goes to Hotel rules', () => {
  for (const code of ['as','sc','st','ns','br','dp','lm','ac','cs','pm','is','sd','dc','tp','ck','ga','hr','rs'])
    expect(PARTS.some(p => p.families.includes(code)), code).toBe(true);
  expect(partOf('zz')).toBe('rules');
});
test('needs mode on the demo: 84 requirements in 11 parts, all Drawing', async () => {
  const plan = await demoPlan([], DEMO_FACTS);
  expect(needsLine(planTotals(plan))).toBe('This is everything your app needs: 84 requirements in 11 parts. Next, you choose the tools that meet part of it.');
  const cctv = partState(part('cctv'), plan, 'needs');
  expect(cctv).toMatchObject({ look: 'drawing', line1: 'CCTV · Logging', line2: '10 requirements' });
  expect(partState(part('deliveries'), plan, 'needs').line2).toBe('12 requirements');
  expect(partState(part('safe'), plan, 'needs').line1).toBe('Hotel safe · Data');
});
test('appCentral on the demo: looks and words per part', async () => {
  const plan = await demoPlan(['appcentral'], DEMO_FACTS);
  const s = (id: PartId) => partState(part(id), plan, 'tools');
  expect(s('cctv')).toMatchObject({ look: 'lit', line2: 'appCentral does all' });
  expect(s('walls')).toMatchObject({ look: 'partly', line2: '5 yours · appCentral does 6', solidPieces: 5 });
  expect(s('safe')).toMatchObject({ look: 'drawing', line2: '4 questions', question: true });
  expect(s('keycards')).toMatchObject({ look: 'drawing', line2: '11 questions', question: true });
  expect(s('rules')).toMatchObject({ look: 'drawing', line2: '6 yours', solidPieces: 0 });
  expect(s('frame')).toMatchObject({ look: 'partly', line2: '1 yours · appCentral does 9' });
});
test('a part done by tools with one claim not yet verified is Solid, not lit', async () => {
  const plan = await demoPlan(['appcentral', 'dbaas', 'iga'], DEMO_FACTS);
  expect(partState(part('safe'), plan, 'tools')).toMatchObject({ look: 'solid', line2: 'DBaaS does all · 4 not yet verified' });
});
test('the parts add up to the running line', async () => {
  for (const ids of [[], ['appcentral'], ['appcentral', 'dbaas'], ['appcentral', 'dbaas', 'iga']]) {
    const plan = await demoPlan(ids, DEMO_FACTS);
    const states = visibleParts(plan).map(p => partState(p, plan, 'tools'));
    const sum = (k: 'you' | 'platform' | 'questions' | 'unverified') => states.reduce((n, s) => n + s.counts[k], 0);
    expect({ you: sum('you'), platform: sum('platform'), questions: sum('questions'), unverified: sum('unverified') })
      .toEqual(pick(planTotals(plan), ['you', 'platform', 'questions', 'unverified']));
  }
  expect(runningLine(planTotals(await demoPlan(['appcentral', 'dbaas', 'iga'], DEMO_FACTS))))
    .toBe('18 are yours · 66 your tools do (15 not yet verified) · 0 questions');
});
test('solid pieces follow the share, with at least one of each when partly done', () => {
  expect([solidPieces(0, 8), solidPieces(0.01, 8), solidPieces(0.5, 8), solidPieces(0.99, 8), solidPieces(1, 8)]).toEqual([0, 1, 4, 7, 8]);
});
test('a part with nothing for the app stays and says so; the assistant shows only with uses-genai yes', async () => {
  const plan = await demoPlan([], DEMO_FACTS);
  expect(visibleParts(plan).map(p => p.id)).not.toContain('assistant');
  expect(visibleParts(await demoPlan([], { ...DEMO_FACTS, 'uses-genai': 'yes' })).map(p => p.id)).toContain('assistant');
});
test('a done task raises the share in progress mode', async () => {
  const plain = await demoPlan(['appcentral'], DEMO_FACTS);
  const withDone = await demoPlan(['appcentral'], DEMO_FACTS, { taskStatus: { 'im8-reform:pm-1': { status: 'done' } }, questionAnswers: {} });
  expect(partState(part('rules'), withDone, 'progress').share).toBeGreaterThan(partState(part('rules'), plain, 'progress').share);
});
```
Add a fake-profile test with `makeProfile` for "Nothing for your app" (a part whose only family has a level-2 item only), and one for no coverage: every visible part is `drawing`. `demoPlan` gains an optional third argument `project?: ProjectOverlay`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/plan/hotel.test.ts`
Expected: FAIL (`lib/plan/hotel` not found).

- [ ] **Step 3: Implement `lib/plan/hotel.ts`** with the signatures and rules above. `FAMILY_NAMES` takes over the names from `lib/plan/floor-plan.ts` (`roomName` there now calls `familyName`, until Task 14 deletes the file).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/plan/hotel.ts lib/plan/floor-plan.ts test/plan/hotel.test.ts test/helpers/demo.ts app/plan/item-detail.tsx app/plan/plan-view.tsx
git commit -m "feat: hotel part table and partState"
```

### Task 5: Tool effects

**Files:**
- Create: `lib/plan/effect.ts`, `test/plan/effect.test.ts`

**Interfaces:**
- Consumes: `countsAs` (Task 4), `buildPlan`, `selectPlanInput`, `versionVerification`.
- Produces:
```ts
export interface ToolEffect {
  removed: { tasks: number; questions: number }; added: { tasks: number; questions: number };
  unverified: number; net: number; noCoverage: boolean;
}
export function toolEffects(data: PlanData, state: Omit<PlanState, 'toolIds'>, ticked: string[], project?: ProjectOverlay): Record<string, ToolEffect>;
export function effectText(e: ToolEffect, profileTitle: string): string;
export function orderTools(tools: Tool[], effects: Record<string, ToolEffect>, versions: VersionPair[], profileId: string): { more: Tool[]; other: Tool[] };
export function tasksAdded(before: Plan, after: Plan): number;
```
The spec writes `toolEffects(input: PlanInput, ticked)`; it takes `PlanData` here because `PlanInput` holds only the ticked tools' versions.

Rules: as in the spec section "Effect of a tool". `removed` splits by how the item counted in `without`; `added` by how it counts in `with`; an item that is `you` in `without` and `question` in `with` adds one question. `unverified`: removed items whose decisive claim from T is `not-yet-verified`. `noCoverage`: T has no version for any active profile. `orderTools`: `more` = net ≥ 1, by net descending, then verified (`versionVerification` of the base-profile pair is not `not-yet-verified`) before unverified, then name; `other` = the rest, by name. `tasksAdded`: items that count as `you` in `after` and not in `before` (by `key`).

`effectText`:
- `noCoverage` → `No ${profileTitle} coverage yet`
- net ≤ 0 and nothing added → `Nothing for your app`
- else the removed part, then `· adds …`: "Removes 6 tasks, answers 2 questions (4 not yet verified)", "Answers 4 questions (4 not yet verified)", "Removes 51 tasks · adds 15 questions". Singular "1 task", "1 question". The parenthesis only when unverified > 0. First letter upper-case.

- [ ] **Step 1: Write the failing tests**

```ts
test('appCentral from nothing: removes 51 tasks, adds 15 questions (redirects), net 36', async () => {
  const e = (await effects([]))['appcentral'];
  expect(e).toEqual({ removed: { tasks: 51, questions: 0 }, added: { tasks: 0, questions: 15 }, unverified: 0, net: 36, noCoverage: false });
  expect(effectText(e, 'Low-Risk Cloud')).toBe('Removes 51 tasks · adds 15 questions');
});
test('DBaaS with appCentral ticked answers 4 questions, all not yet verified', async () => {
  const e = (await effects(['appcentral']))['dbaas'];
  expect(e).toMatchObject({ removed: { tasks: 0, questions: 4 }, added: { tasks: 0, questions: 0 }, unverified: 4, net: 4 });
  expect(effectText(e, 'Low-Risk Cloud')).toBe('Answers 4 questions (4 not yet verified)');
});
test('a ticked tool is measured against the plan without it', async () => {
  expect((await effects(['appcentral', 'dbaas']))['dbaas'].removed.questions).toBe(4);
});
test('IGA after appCentral and DBaaS answers 11 questions', async () => {
  expect((await effects(['appcentral', 'dbaas']))['iga']).toMatchObject({ removed: { tasks: 0, questions: 11 }, unverified: 11, net: 11 });
});
test('a tool with no coverage for the profile', async () => {
  const e = (await effects([]))['gencentral'];
  expect(e.noCoverage).toBe(true);
  expect(e.net).toBe(0);
  expect(effectText(e, 'Low-Risk Cloud')).toBe('No Low-Risk Cloud coverage yet');
});
test('genCentral is not net < 0 when the app uses GenAI', async () => {
  expect((await effects([], { ...DEMO_FACTS, 'uses-genai': 'yes' }))['gencentral'].net).toBeGreaterThanOrEqual(0);
});
test('net = removed − added, and the removed count matches the plan difference', async () => {
  const e = (await effects([]))['appcentral'];
  expect(e.removed.tasks + e.removed.questions).toBe((await demoPlan(['appcentral'], DEMO_FACTS)).counts.platform); // 51
  expect(e.net).toBe(e.removed.tasks + e.removed.questions - e.added.tasks - e.added.questions);
});
test('order: more first by net, then verified, then name; tools with no effect are other', async () => {
  const fx = await effects([]);
  const { more, other } = orderTools(seedTools, fx, seedVersions, 'low-risk-cloud');
  const nets = more.map(t => fx[t._id].net);
  expect(nets).toEqual([...nets].sort((a, b) => b - a));
  const ids = more.map(t => t._id);
  expect(ids.indexOf('iga')).toBeLessThan(ids.indexOf('dbaas')); // net 11 before net 4
  expect(other.map(t => t._id)).toEqual(expect.arrayContaining(['gencentral', 'zod', 'prisma', 'ship-hats']));
});
test('tasksAdded counts tasks new in the second plan', async () => {
  expect(tasksAdded(await demoPlan(['appcentral', 'dbaas', 'iga'], DEMO_FACTS), await demoPlan([], DEMO_FACTS))).toBe(66);
});
```
`effects(ticked, facts = DEMO_FACTS)` is a local helper over `toolEffects(seedData, { profileId: 'low-risk-cloud', facts }, ticked)`; `seedTools` and `seedVersions` come from `loadSeed()` and `pairVersions`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/plan/effect.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/plan/effect.ts`**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run test/plan/effect.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/plan/effect.ts test/plan/effect.test.ts
git commit -m "feat: tool effects from the coverage that exists"
```

### Task 6: Link state for steps 1–4

**Files:**
- Modify: `lib/plan/url-state.ts`, `test/plan/url-state.test.ts`

**Interfaces:**
- Produces:
```ts
export function startQuery(answers: Partial<RiskAnswers>, facts: FactAnswers = {}, projectId?: string): string; // keys c, s, i, d, k, f, project; no t
export function parseStartQuery(sp: SearchParams): { answers: Partial<RiskAnswers>; complete: RiskAnswers | null; facts: FactAnswers; projectId: string | null };
```
`complete` is set only when all four choices parse. A bad single value is dropped, the rest stay. `projectId` only when it matches `/^[A-Za-z0-9-]{1,64}$/`. `planQuery` and `parsePlanQuery` stay for the export links.

- [ ] **Step 1: Write the failing tests**

```ts
test('round trip with facts and project', () => {
  const q = startQuery(DEMO_ANSWERS, DEMO_FACTS, 'abc-123');
  expect(parseStartQuery(Object.fromEntries(new URLSearchParams(q)))).toEqual({ answers: DEMO_ANSWERS, complete: DEMO_ANSWERS, facts: DEMO_FACTS, projectId: 'abc-123' });
});
test('a bad value is dropped and the rest stay', () => {
  const r = parseStartQuery({ c: 'bad', s: 'sn', i: 'slight', d: 'min', k: '' });
  expect(r.complete).toBeNull();
  expect(r.answers).toEqual({ sensitivity: 'sensitive-normal', impact: 'slight', downstream: 'minimal', cii: false, sii: false });
});
test('no query gives empty answers', () => expect(parseStartQuery({})).toEqual({ answers: {}, complete: null, facts: {}, projectId: null }));
test('a project id with odd characters is ignored', () => expect(parseStartQuery({ project: '../x' }).projectId).toBeNull());
test('startQuery carries no tools', () => expect(startQuery(DEMO_ANSWERS)).not.toMatch(/(^|&)t=/));
```
With empty `k`, `cii` and `sii` are `false` only when `k` is present in the link; with no `k` at all they are absent from `answers`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/plan/url-state.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** with one zod schema per key (`safeParse` each key on its own).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run test/plan/url-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/plan/url-state.ts test/plan/url-state.test.ts
git commit -m "feat: step links keep risk answers, facts and the project both ways"
```

---

## Phase C: the journey

Before Tasks 7–11 read: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`, `not-found.md`, `use-router.md`, `05-config/01-next-config-js/redirects.md` (query strings pass through), and the server functions guide under `01-app/02-guides/` (search for "use server").

### Task 7: Steps 1 and 2

**Files:**
- Modify: `app/start/page.tsx`, `app/start/start-form.tsx`
- Create: `app/start/verdict/page.tsx`, `app/start/step-nav.tsx` (shared "Back" link and step heading)
- Test: `e2e/journey.spec.ts` (new; Tasks 8–11 add to it)

**Interfaces:**
- Consumes: `parseStartQuery`, `startQuery` (Task 6), `verdictFor` (Task 2), `data/seed/contacts.json`.
- Produces: `StartForm({ initial: Partial<RiskAnswers>; projectId: string | null })`; `StepHeading({ title: string; children?: ReactNode })` with the wide heading; `BackLink({ href: string; children: string })`.

Copy:
- Step 1 heading "Tell us about your app"; lead "A few questions, so we can work out which security requirements apply. It takes about a minute." Main action "Work out my app type". Each option gets a hint (one short line, from the GovTech risk page wording, stage-neutral). CII and SII hints: "Not sure? Ask your IT security officer (ACISO or MCISO)." SII label stays "The system is SII".
- Submit pushes `/start/verdict?${startQuery(answers, facts, projectId)}` (facts from the link are kept).
- Step 2: heading = `verdict.heading`; the sentence; `coverageLine`; reasons as a list; link "GovTech's risk materiality levels" (`RISK_SOURCE_URL`); `BackLink` "Change answers" to `/start?…`. For `plan`: main action link "Next: about your app" to `/start/app?…`. For `not-yet` and `not-cloud`: "Who to ask" with `contacts.cannotPlan.who` and `.how`, and "Your answers" as a definition list from `OPTION_LABELS` (with CII and SII yes or no). No main action.
- Missing or incomplete answers on `/start/verdict` → `redirect('/start?' + startQuery(answers, facts, projectId))`.

- [ ] **Step 1: Write the failing e2e tests** in `e2e/journey.spec.ts` (`beforeEach` posts `/api/reset`)

```ts
test('step 1 to step 2, and back keeps every answer', async ({ page }) => {
  await page.goto('/start');
  await answerLowRisk(page); // Restricted, Sensitive Normal, Slight, None or minimal
  await page.getByRole('button', { name: 'Work out my app type' }).click();
  await expect(page).toHaveURL(/\/start\/verdict\?/);
  await expect(page.getByRole('heading', { level: 1, name: 'Low-Risk Cloud' })).toBeVisible();
  await expect(page.getByText('You can plan this app with Blueprint.')).toBeVisible();
  await expect(page.getByText('Step 2 of 5')).toBeVisible();
  await page.getByRole('link', { name: 'Change answers' }).click();
  await expect(page.getByRole('radio', { name: 'Restricted' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Slight' })).toBeChecked();
});
test('Critical impact without CII cannot be planned yet, with who to ask', async ({ page }) => {
  await page.goto('/start/verdict?c=restricted&s=sn&i=critical&d=min&k=');
  await expect(page.getByText("Blueprint can't plan this app yet.")).toBeVisible();
  await expect(page.getByText('Your IT security officer (ACISO or MCISO)')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Next: about your app' })).toHaveCount(0);
});
test('Confidential data is not for the cloud', async ({ page }) => {
  await page.goto('/start/verdict?c=conf&s=sn&i=slight&d=min&k=');
  await expect(page.getByText("This data can't be hosted on the cloud, so Blueprint can't plan it with CPF's cloud tools.")).toBeVisible();
});
test('a verdict link with a broken answer opens step 1 with the rest filled in', async ({ page }) => {
  await page.goto('/start/verdict?c=bad&s=sn&i=slight&d=min&k=');
  await expect(page).toHaveURL(/\/start\?/);
  await expect(page.getByRole('radio', { name: 'Sensitive Normal' })).toBeChecked();
});
```
(The Medium verdict is checked in Task 16, once the profile exists.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx playwright test e2e/journey.spec.ts`
Expected: FAIL (no `/start/verdict`).

- [ ] **Step 3: Implement steps 1 and 2** (read `craft-floor.md` first). Layout: one column, `max-w-form`, wide heading, 1px rules between question groups, no panels with shadows.

- [ ] **Step 4: Run the e2e tests**

Run: `npx playwright test e2e/journey.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/start e2e/journey.spec.ts
git commit -m "feat: steps 1 and 2: answers in the link and the verdict page"
```

### Task 8: Step 3, stage-neutral, on to step 4

**Files:**
- Modify: `app/start/app/page.tsx`, `app/start/app/app-form.tsx`, `e2e/journey.spec.ts`

**Interfaces:**
- Consumes: `parseStartQuery`, `startQuery`, `profileFor`.
- Produces: `AppForm({ risk: RiskAnswers; initial: FactAnswers; profile: FactProfile; projectId: string | null })`.

Copy: heading "About your app"; lead "Tick what is true. We leave out the requirements that can't apply to your app, and we tell you which ones."; legend "Tick everything that is true for your app"; main action "Next: what your app needs"; `BackLink` "Back" to `/start/verdict?…`. Unticked ticks are sent as `no` (as today). Submit pushes `/start/needs?${startQuery(risk, facts, projectId)}`. No profile (incomplete answers or `profileFor` null) → redirect to `/start?…`.

- [ ] **Step 1: Add the failing e2e test**

```ts
test('step 3 asks about GenAI and keeps the answers on the way back', async ({ page }) => {
  await page.goto(`/start/app?${LOW_QUERY}`);
  await expect(page.getByText('Step 3 of 5')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Does your app use generative AI, for example a chatbot or a text summary?' })).toBeVisible();
  await answerDemoFacts(page); // public, web, signin, sms; GenAI No
  await page.getByRole('button', { name: 'Next: what your app needs' }).click();
  await expect(page).toHaveURL(/\/start\/needs\?.*f=/);
  await page.goBack();
  await expect(page.getByRole('checkbox', { name: 'It sends SMS text messages' })).toBeChecked();
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx playwright test e2e/journey.spec.ts -g "step 3"`
Expected: FAIL.

- [ ] **Step 3: Implement** (read `craft-floor.md` first).

- [ ] **Step 4: Run it**

Run: `npx playwright test e2e/journey.spec.ts`
Expected: PASS (step 4 itself is still missing; the test checks only the URL).

- [ ] **Step 5: Commit**

```bash
git add app/start/app e2e/journey.spec.ts
git commit -m "feat: step 3 with the GenAI question and stage-neutral words"
```

### Task 9: Project data for the new journey

**Files:**
- Modify: `lib/domain/types.ts`, `lib/data/repos/projects.ts`, `lib/data/seed-documents.ts`, `app/projects/actions.ts`, `test/int/projects.int.test.ts`

**Interfaces:**
- Produces:
  - `Project.toolsReviewedAt?: string` (ISO). Seed projects get `toolsReviewedAt: now`.
  - `createProject(db, input: { name: string; ownerName?: string; riskAnswers; toolIds; facts? })`; owner defaults to `'App builder'`.
  - `updateProjectAnswers(db, id, input: { riskAnswers: RiskAnswers; facts: FactAnswers; clearToolsReviewed: boolean }): Promise<boolean>` (false when the project does not exist; `$unset toolsReviewedAt` when asked).
  - `markToolsReviewed(db, id): Promise<void>`.
  - `setQuestionAnswer` cuts `reason` to 280 characters after the trim.
  - Actions: `createProjectAction({ name; riskAnswers; facts })` → `{ ok: true; id } | { ok: false; error }` (tools `[]`); `saveProjectAnswersAction(projectId, { riskAnswers; facts })` → `{ ok: true; profileChanged: boolean } | { ok: false; error }` (it compares `profileFor` of the stored and the new answers, and clears `toolsReviewedAt` when they differ); `continueToPlanAction(projectId)` → `SaveOutcome`.

- [ ] **Step 1: Write the failing integration tests**

```ts
test('a project needs a name; the owner defaults to "App builder"', async () => {
  await expect(createProject(db, { name: ' ', riskAnswers: LOW, toolIds: [] })).rejects.toThrow('Give the project a name.');
  expect((await createProject(db, { name: 'Low-Risk Cloud app', riskAnswers: LOW, toolIds: [] })).ownerName).toBe('App builder');
});
test('a new project has no toolsReviewedAt until it is marked', async () => {
  const p = await createProject(db, { name: 'A', riskAnswers: LOW, toolIds: [] });
  expect(p.toolsReviewedAt).toBeUndefined();
  await markToolsReviewed(db, p._id);
  expect((await getProject(db, p._id))!.toolsReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});
test('saving changed answers keeps the id, the tools and the statuses', async () => {
  const p = await createProject(db, { name: 'A', riskAnswers: LOW, toolIds: ['appcentral'] });
  await setTaskStatus(db, p._id, 'im8-reform:pm-1', { status: 'done' });
  await markToolsReviewed(db, p._id);
  expect(await updateProjectAnswers(db, p._id, { riskAnswers: { ...LOW, sensitivity: 'sensitive-high' }, facts: { reach: 'staff' }, clearToolsReviewed: true })).toBe(true);
  const after = (await getProject(db, p._id))!;
  expect(after).toMatchObject({ _id: p._id, toolIds: ['appcentral'], facts: { reach: 'staff' } });
  expect(after.taskStatus['im8-reform:pm-1']).toEqual({ status: 'done' });
  expect(after.toolsReviewedAt).toBeUndefined();
  expect(await updateProjectAnswers(db, 'nope', { riskAnswers: LOW, facts: {}, clearToolsReviewed: false })).toBe(false);
});
test('a question reason is stored as typed, and cut at 280 characters', async () => {
  const p = await createProject(db, { name: 'A', riskAnswers: LOW, toolIds: [] });
  await setQuestionAnswer(db, p._id, 'im8-reform:is-1', { applies: false, reason: 'No  SMS & no café sign-in — 済' });
  expect((await getProject(db, p._id))!.questionAnswers['im8-reform:is-1'].reason).toBe('No  SMS & no café sign-in — 済');
  await setQuestionAnswer(db, p._id, 'im8-reform:is-1', { applies: false, reason: 'x'.repeat(300) });
  expect((await getProject(db, p._id))!.questionAnswers['im8-reform:is-1'].reason).toHaveLength(280);
});
```
Remove the old "a project needs a name and an owner" test.

- [ ] **Step 2: Run them to see them fail**

Run: `docker-compose up -d && npm run test:int -- test/int/projects.int.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the repo functions, the seed field and the actions (each action through the existing `saved()` / `attempt` pattern with `revalidatePath`).

- [ ] **Step 4: Run all tests**

Run: `npm run test:int && npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/types.ts lib/data/repos/projects.ts lib/data/seed-documents.ts app/projects/actions.ts test/int/projects.int.test.ts
git commit -m "feat: project fields and actions for save, edit and tools review"
```

### Task 10: Step 4 "What your app needs", the save, editing, redirects

**Files:**
- Create: `app/start/needs/page.tsx`, `app/start/needs/needs-view.tsx`, `app/start/needs/part-details.tsx`, `app/start/needs/save-bar.tsx`, `app/hotel/parts-list.tsx`, `app/hotel/hotel-frame.tsx` (the two-column frame for steps 4–5), `lib/plan/needs.ts`, `test/plan/needs.test.ts`, `lib/plan/unsaved.ts`
- Modify: `next.config.ts`, `e2e/journey.spec.ts`
- Delete: `app/start/review/` (whole folder), `app/plan/page.tsx`, `app/plan/save-dialog.tsx`

**Interfaces:**
- Consumes: `partState`, `visibleParts`, `planTotals`, `needsLine` (Task 4), `tasksAdded` (Task 5), `parseStartQuery` (Task 6), actions (Task 9).
- Produces:
  - `DetailRow = { key: RequirementKey; id: string; text: string; official: string; question: boolean; plainChecked: boolean }` and `needsDetails(plan: Plan, profiles: Profile[]): Record<PartId, DetailRow[]>` (counting items only, `you` and `question`; `text` = `plain.task` or, with no plain text, the official statement; `official` = `resolveParameters(entry.statement)`; ordered by requirement id with natural number order).
  - `skippedItems(plan): { id: string; title: string; reason: string }[]`.
  - `HotelFrame({ hotel: ReactNode; panel: ReactNode; foot: ReactNode })`: the grid `grid-cols-[3fr_2fr]`, height `calc(100dvh - var(--header-h))`, the panel column `overflow-y-auto`, the foot `sticky bottom-0` with a 1px rule above.
  - `PartsList({ parts: PartState[]; selected: PartId | null; onSelect(id: PartId | null): void })`: heading "Parts of your app", a grid of buttons (3 columns), each with `aria-pressed`, line1 and line2, a red dot (`aria-hidden`) when `question`, plus visually hidden text "has open questions".
  - `useUnsavedGuard(dirty: boolean)` in `lib/plan/unsaved.ts` (adds and removes a `beforeunload` handler).

Behaviour and copy:
- Server page: `parseStartQuery`; incomplete answers or no profile → redirect to `/start?…`; a `projectId` that does not exist → `notFound()`. Plan = no tools, the link's facts.
- Above the hotel: `needsLine(...)`; for a profile with no coverage the line "No tool covers {profile} yet, so every part is yours." under it; a summary line `{profile title} · Change risk answers · Change app details` (links to steps 1 and 3 with the same query).
- Hotel column for now: the still-image slot (`/models/hotel/still.png`, `alt=""`; a plain `hotel-fill` box until Task 13 makes the file) and `PartsList`. Task 13 puts the live hotel in.
- Side panel, nothing chosen: "Point at a part, or pick it in the list, to see what it asks for." Chosen part: name (wide heading), families line, `summary`, counts ("10 requirements", "· 2 questions"), a `Disclosure` "Show all {n} requirements" with one row per `DetailRow`: the text; an "Official wording" `Disclosure` with `official` in Roboto Mono id + text; question rows have the red dot and "Someone must check if this applies."; rows with `plainChecked: false` show "A plain version isn't checked for this risk level yet." Under the parts list: closed `Disclosure` "Left out because of your answers ({n})" with each id, title and reason.
- Esc clears the chosen part.
- Foot: input "Plan name" filled with `${profile.title} app`, main action "Save this plan". Pending → button disabled and "Saving…". On success `router.replace('/projects/{id}/tools')`. Errors from `runSave` show under the button.
- Edit mode (`projectId` present): the name field is hidden, the main action reads "Save changes to {project.name}". When `profileFor(stored answers) !== profileFor(link answers)` the side panel shows above the foot: "Your app type changes from {old title} to {new title}. {k} tasks are added. Tasks you marked done stay done." (`k` = `tasksAdded(oldPlan, newPlan)`, both with the project's tools). On success: `profileChanged` → `/projects/{id}/tools`, else `/projects/{id}`. `useUnsavedGuard(true)` while the link answers differ from the stored ones (on steps 1, 3 and 4 in edit mode).
- `next.config.ts` redirects (not permanent): `/start/review`, `/start/tools`, `/start/go`, `/plan` → `/start/needs`.

- [ ] **Step 1: Write the failing unit test** (`test/plan/needs.test.ts`)

```ts
test('the CCTV rows are exactly its 10 counting items, each with official wording', async () => {
  const rows = needsDetails(await demoPlan([], DEMO_FACTS), seedProfiles).cctv;
  expect(rows).toHaveLength(10);
  expect(rows.every(r => r.official.length > 0 && r.id.startsWith('lm-'))).toBe(true);
});
test('skipped items carry their reason', async () => {
  expect(skippedItems(await demoPlan([], DEMO_FACTS)).map(s => s.id)).toEqual(['is-11', 'is-15']);
});
```

- [ ] **Step 2: Write the failing e2e tests** (add to `e2e/journey.spec.ts`)

```ts
test('step 4: the line, CCTV details, and the save opens step 5', async ({ page }) => {
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expect(page.getByText('Step 4 of 5')).toBeVisible();
  await expect(page.getByText('This is everything your app needs: 84 requirements in 11 parts. Next, you choose the tools that meet part of it.')).toBeVisible();
  await expect(page.getByText('Point at a part, or pick it in the list, to see what it asks for.')).toBeVisible();
  const cctv = page.getByRole('button', { name: /CCTV · Logging/ });
  await cctv.click();
  await expect(cctv).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('A record of who did what, and when, so problems can be found and traced.')).toBeVisible();
  await page.getByText('Show all 10 requirements').click();
  await expect(page.getByText('Official wording')).toHaveCount(10);
  await page.keyboard.press('Escape');
  await expect(cctv).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Plan name')).toHaveValue('Low-Risk Cloud app');
  await expect(page.getByRole('link', { name: /build plan/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save this plan' }).dblclick();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/tools$/);
  await page.goto('/projects');
  await expect(page.getByRole('link', { name: 'Low-Risk Cloud app' })).toHaveCount(1);
});
test('Back from step 5 lands on step 3', async ({ page }) => {
  await page.goto(`/start/app?${LOW_QUERY}`);
  await answerDemoFacts(page);
  await page.getByRole('button', { name: 'Next: what your app needs' }).click();
  await page.getByRole('button', { name: 'Save this plan' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/start\/app\?/);
});
test('old links go to step 4 with their answers', async ({ page }) => {
  await page.goto(`/plan?${DEMO_QUERY}&t=appcentral`);
  await expect(page).toHaveURL(/\/start\/needs\?.*c=restricted/);
  await page.goto(`/start/review?${DEMO_QUERY}`);
  await expect(page).toHaveURL(/\/start\/needs\?/);
});
test('a step 4 link with an unknown project is not found', async ({ page }) => {
  const res = await page.goto(`/start/needs?${DEMO_QUERY}&project=nope`);
  expect(res?.status()).toBe(404);
});
test('editing a saved project writes to the same project and keeps statuses', async ({ page }) => {
  await page.goto('/projects/sample-two-weeks-in');
  await page.getByRole('link', { name: 'Change answers' }).click();
  await expect(page).toHaveURL(/\/start\/needs\?.*project=sample-two-weeks-in/);
  await page.getByRole('link', { name: 'Change app details' }).click();
  await page.getByRole('radio', { name: 'Government staff only' }).check();
  await page.getByRole('button', { name: 'Next: what your app needs' }).click();
  await page.getByRole('button', { name: 'Save changes to Sample project (two weeks in)' }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in$/);
  await expect(page.getByText(/\d+ of \d+ tasks done/)).toBeVisible(); // the new facts can leave some tasks out
});
test('a profile change is announced and the save opens step 5', async ({ page }) => {
  await page.goto(`/start/needs?c=restricted&s=sh&i=slight&d=min&k=&project=sample-two-weeks-in`);
  await expect(page.getByText(/^Your app type changes from Low-Risk Cloud to Medium-Risk Cloud\. \d+ tasks are added\. Tasks you marked done stay done\.$/)).toBeVisible();
  await page.getByRole('button', { name: /^Save changes to / }).click();
  await expect(page).toHaveURL(/\/projects\/sample-two-weeks-in\/tools$/);
});
test('leaving with unsaved changes asks first', async ({ page }) => {
  await page.goto(`/start/needs?c=restricted&s=sh&i=slight&d=min&k=&project=sample-two-weeks-in`);
  await page.getByRole('button', { name: /CCTV · Logging/ }).click(); // the browser asks only after a user action on the page
  const dialog = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  expect((await dialog).type()).toBe('beforeunload');
});
```
The "profile change" test needs the Medium profile: mark it `test.fixme` until Task 16, and remove the `fixme` there. `DEMO_QUERY` = `startQuery(DEMO_ANSWERS, DEMO_FACTS)` written out as a literal in `e2e/helpers.ts`, with `LOW_QUERY` (answers only), `answerLowRisk` and `answerDemoFacts`.

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run test/plan/needs.test.ts && npx playwright test e2e/journey.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Implement step 4** (read `craft-floor.md` first). The "Change answers" link on the plan page comes in Task 14; until then put a plain link on `app/plan/plan-view.tsx` for projects: `/start/needs?${startQuery(project.riskAnswers, project.facts ?? {}, project._id)}`.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run && npx tsc --noEmit && npx playwright test e2e/journey.spec.ts`
Expected: PASS, with the profile-change test reported as fixme.

- [ ] **Step 6: Commit**

```bash
git add app/start app/hotel lib/plan/needs.ts lib/plan/unsaved.ts test/plan/needs.test.ts next.config.ts e2e app/plan/plan-view.tsx app/plan/page.tsx app/plan/save-dialog.tsx
git commit -m "feat: step 4, what your app needs, with the save and editing"
```

### Task 11: Step 5 "Your tools"

**Files:**
- Create: `app/projects/[id]/tools/page.tsx`, `app/projects/[id]/tools/tools-view.tsx`, `app/projects/[id]/tools/tool-row.tsx`
- Modify: `app/projects/[id]/page.tsx` (redirect to tools when `!project.toolsReviewedAt`), `data/seed/tools.json` (`partOfAppWhen` for every tool), `lib/domain/types.ts` (`Tool.partOfAppWhen: string`), `lib/data/seed-documents.ts` (guide tools get `partOfAppWhen` from `guides.json`), `data/seed/guides.json`, `test/data-files.test.ts`, `e2e/journey.spec.ts`

**Interfaces:**
- Consumes: `toolEffects`, `effectText`, `orderTools` (Task 5); `partState`, `planTotals`, `runningLine` (Task 4); `HotelFrame`, `PartsList` (Task 10); `setProjectToolsAction`, `continueToPlanAction` (Task 9); `runSave`; `Badge`, `SampleTag` from `app/plan/badge.tsx`; `ToolHints` from `app/plan/tool-picker.tsx` (moved into `tool-row.tsx` in Task 14).
- Produces: `ToolsView({ data: PlanData; project: Project; profileId: string; profileTitle: string })`.

`partOfAppWhen` lines (one each, "It is part of your app if …" is added by the screen):
- appcentral: "your app is deployed on appCentral."
- dbaas: "your app keeps its data in a DBaaS database."
- iga: "your staff sign in and get access through IGA."
- gencentral: "your app calls a model through genCentral."
- zod: "your code checks its inputs with Zod."
- prisma: "your code reaches its database through Prisma."
- ship-hats: "your code is built and shipped with SHIP-HATS."
- websg: "your site is built and hosted on WebSG."
- isomer: "your site is built and hosted on Isomer."

Behaviour and copy:
- Server page: project not found → `notFound()`; `profileFor(project.riskAnswers)` null → the verdict sentence and a link "Change answers".
- Side panel: heading "Your tools"; "Tick the tools that are part of your app."; the running line (`aria-live="polite"`), and under it "Each requirement counts as one, whatever its size."; group "Could take more off you" then group "Other tools", each with the sections CPF tools, Whole-of-government tools, Code components (only sections with tools); each row: checkbox with the tool name, Sample tag and verification badge as today, "It is part of your app if {partOfAppWhen}", and `effectText(...)`. The order is computed once from the effects when the view mounts (`useState(() => orderTools(...))`), so a tick changes only the numbers.
- `ToolHints` notes ("appCentral expects DBaaS for 4 requirements. Add DBaaS?") above the groups, as today.
- A tick: state changes at once, then `runSave(() => setProjectToolsAction(id, next))`; success shows "Saved" next to the running line, failure shows the error text there.
- Hotel column: `PartsList` with `partState(..., 'tools')` (the live hotel comes in Task 13). Selecting a part shows a card in the hotel column with line1, line2 and the summary (Task 13 moves it next to the part).
- Foot: main action "Continue to your plan" → `continueToPlanAction`, then `router.push('/projects/{id}')`.
- Nothing ticked by default; no button ticks many tools. Each tool row has `data-tool-id`.

- [ ] **Step 1: Write the failing tests**

`test/data-files.test.ts`: every tool in `tools.json` and every guide in `guides.json` has a non-empty `partOfAppWhen` that ends with "." and does not start with a capital letter.

e2e:
```ts
test('step 5: ticks build the plan, save at once, and keep their order', async ({ page }) => {
  const id = await saveDemoPlan(page); // steps 1–4 through the UI, returns the project id
  await expect(page.getByText('Step 5 of 5')).toBeVisible();
  await expect(page.getByText('Tick the tools that are part of your app.')).toBeVisible();
  await expect(page.getByText('84 are yours · 0 your tools do · 0 questions')).toBeVisible();
  const order = () => page.locator('[data-tool-id]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.toolId));
  const before = await order();
  await page.getByRole('checkbox', { name: 'appCentral' }).check();
  await expect(page.getByText('18 are yours · 51 your tools do · 15 questions')).toBeVisible();
  await expect(page.getByText('Saved')).toBeVisible();
  expect(await order()).toEqual(before);
  await page.getByRole('checkbox', { name: 'DBaaS' }).check();
  await page.getByRole('checkbox', { name: 'IGA' }).check();
  await expect(page.getByText('18 are yours · 66 your tools do (15 not yet verified) · 0 questions')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'IGA' })).toBeChecked();
  await page.goto(`/projects/${id}`);
  await expect(page).toHaveURL(new RegExp(`/projects/${id}/tools$`)); // not reviewed yet
  await page.getByRole('button', { name: 'Continue to your plan' }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
  await page.goto(`/projects/${id}`);
  await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
});
test('a tool row states both sides', async ({ page }) => {
  await saveDemoPlan(page);
  await expect(page.getByText('Removes 51 tasks · adds 15 questions')).toBeVisible();
  await expect(page.getByText('No Low-Risk Cloud coverage yet')).toBeVisible(); // genCentral
});
test('an unknown project has no tools page', async ({ page }) => {
  expect((await page.goto('/projects/nope/tools'))?.status()).toBe(404);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/data-files.test.ts && npx playwright test e2e/journey.spec.ts -g "step 5|tool row|unknown project"`
Expected: FAIL.

- [ ] **Step 3: Implement step 5** (read `craft-floor.md` first).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run && npx tsc --noEmit && npx playwright test e2e/journey.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/projects/[id]" data/seed/tools.json data/seed/guides.json lib/domain/types.ts lib/data/seed-documents.ts test/data-files.test.ts e2e/journey.spec.ts
git commit -m "feat: step 5, your tools, with effects and autosave"
```

---

## Phase D: the hotel

### Task 12: Models and the Three.js scene

**Files:**
- Create: `public/models/hotel/` (copy), `app/hotel/scene.ts`, `app/hotel/models.ts`
- Test: `test/hotel/models.test.ts`

**Interfaces:**
- Consumes: `PARTS`, `PartId`, piece lists (Task 4).
- Produces:
```ts
// app/hotel/models.ts
export const HOTEL_COLOURS = { ground: '#f6f8fa', line: '#5f86b3', fill: '#eef3f9', light: '#ffc879' } as const;
type PieceBuilders = { [P in PartId]: Record<(typeof PARTS)[number]['pieces'][number], Builder> };
export const BUILDERS: PieceBuilders; // a missing or extra piece is a type error
export const ANCHORS: Record<PartId, [number, number, number]>;
// app/hotel/scene.ts
export interface ScenePart { id: PartId; look: Look; solidPieces: number }
export interface HotelScene {
  setParts(parts: ScenePart[], animate: boolean): void;
  isolate(id: PartId | null): void;
  anchorOnScreen(id: PartId): { x: number; y: number } | null; // px inside the stage
  partAt(clientX: number, clientY: number): PartId | null;
  resize(): void;
  dispose(): void;
}
export function createHotelScene(stage: HTMLElement, opts: { reducedMotion: boolean; visible: PartId[]; onReady(): void; onError(e: unknown): void }): HotelScene;
```
`PARTS` must be declared `as const` (with `satisfies readonly HotelPart[]`) in Task 4 for the mapped type to work; change it there if it is not.

Port from `.impeccable/mocks/hotel-b/index.html` (lines 40–147) with these changes:
- Import `three` and `three/examples/jsm/loaders/GLTFLoader.js` from the package; model URLs `/models/hotel/building/*.glb` and `/models/hotel/furniture/*.glb`.
- Background `HOTEL_COLOURS.ground`; ghost material `MeshBasicMaterial({ color: fill, transparent: true, opacity: 0.55, depthWrite: false })`, edges `LineBasicMaterial({ color: line })`; set `material.needsUpdate = true` when `transparent` changes.
- Split each part into its named pieces (one `Group` per piece, in table order); a part shows its first `solidPieces` pieces with their real materials and the rest as ghosts.
- A point light per part (colour `light`), intensity 0 unless the look is `lit`.
- Smart assistant (new): a kiosk on the ground floor near the front at about (0.9, 0, 0.8): stand `box(0.4, 1.2, 0.3)`, screen `box(0.34, 0.24, 0.02)` on its face, speaker a flat cylinder on top. Added only when `visible` has `assistant`.
- Size from `stage.clientWidth/clientHeight` with a `ResizeObserver`, never `innerWidth`.
- Motion: roof opens over 1.4 s on load; a piece that becomes solid drops in from +0.35 over 0.4 s; light fades over 0.7 s; walls and frame change without the drop; `reducedMotion` → roof open and every change immediate.
- `isolate(id)`: other parts and the floor slabs go to opacity 0.12; `null` restores.
- `onReady` after every model loaded; `onError` when WebGL is missing (`renderer` throws) or a model fails.

- [ ] **Step 1: Copy the models**

```bash
mkdir -p public/models/hotel
cp -R .impeccable/mocks/hotel-b/models/building .impeccable/mocks/hotel-b/models/furniture public/models/hotel/
ls public/models/hotel/building/License.txt public/models/hotel/furniture/License.txt
```
Expected: both licence files listed (CC0).

- [ ] **Step 2: Write the failing test** (`test/hotel/models.test.ts`, runs in node, no WebGL)

```ts
test('every part has an anchor and every piece a builder, in table order', () => {
  for (const part of PARTS) {
    expect(ANCHORS[part.id]).toHaveLength(3);
    expect(Object.keys(BUILDERS[part.id])).toEqual([...part.pieces]);
  }
});
test('every model file the builders use is in public/models/hotel', () => {
  for (const url of MODEL_URLS) expect(existsSync(path.join('public', url)), url).toBe(true);
});
```
`MODEL_URLS: string[]` is exported from `models.ts`.

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run test/hotel/models.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `models.ts` and `scene.ts`**

- [ ] **Step 5: Run the test and types**

Run: `npx vitest run test/hotel && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/models/hotel app/hotel/scene.ts app/hotel/models.ts test/hotel/models.test.ts
git commit -m "feat: hotel scene from the Kenney kits, piece by piece"
```

### Task 13: The hotel component on steps 4 and 5

**Files:**
- Create: `app/hotel/hotel.tsx`, `app/hotel/labels.ts`, `e2e/hotel.spec.ts`, `e2e/hotel-still.spec.ts`, `public/models/hotel/still.png` (made by the still spec)
- Modify: `app/start/needs/needs-view.tsx`, `app/projects/[id]/tools/tools-view.tsx`, `playwright.config.ts` (only if the still spec needs its own project)

**Interfaces:**
- Consumes: `createHotelScene` (Task 12), `PartState` (Task 4), `PartsList` (Task 10).
- Produces:
```ts
export const LABEL_PLACES: Record<PartId, { side: 'left' | 'right'; y: number }>; // y is a fraction of the stage height
export function Hotel(props: {
  parts: PartState[]; selected: PartId | null; onSelect(id: PartId | null): void;
  interactive: boolean; card?: ReactNode; // step 5: shown next to the selected part
}): JSX.Element;
```
Start values for `LABEL_PLACES` (tune them until the overlap test passes, keep left/right): left — rules 0.06, rooms 0.24, walls 0.40, keycards 0.56, safe 0.74, frame 0.90; right — cctv 0.06, assistant 0.26, inspection 0.42, entrance 0.56, deliveries 0.70, generator 0.86.

Behaviour:
- `useEffect` does `import('./scene')` so Three.js loads only on pages with the hotel. Until `onReady`, and for good after `onError`, the stage shows `<img src="/models/hotel/still.png" alt="">`; the parts list always shows.
- The stage has `data-hotel="loading" | "ready" | "fallback"` (for tests).
- Labels: absolutely placed `div`s, `aria-hidden="true"`, narrow Archivo, line1 in ink, line2 in soft ink, red dot when `question`; one SVG overlay draws a 1px ink line from each label to `anchorOnScreen(id)`. Labels and lines update on resize and after `onReady`.
- Pointer: `partAt` on move → `onSelect(id)` while pointing (step 4 and 5); leaving the stage clears it unless the part was pressed in the list. Esc → `onSelect(null)`. The selected part is passed to `scene.isolate(selected)`.
- Each label has `data-label="{partId}"`; each parts-list button has `data-part="{partId}"` and the same two lines (red dot and its hidden text aside).
- `prefers-reduced-motion` read with `matchMedia` and passed to the scene.
- Step 4: `interactive`, details in the side panel. Step 5: `interactive`, `card` with line1, line2, summary and "Who does it: {toolNames}" next to the selected part's anchor.

- [ ] **Step 1: Write the failing e2e tests** (`e2e/hotel.spec.ts`)

```ts
for (const size of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`no two labels overlap at ${size.width}×${size.height}, on step 4 and on step 5 with appCentral`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(`/start/needs?${DEMO_QUERY}`);
    await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
    expect(await overlaps(page)).toEqual([]);
    await saveAndTick(page, 'appCentral');
    await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
    expect(await overlaps(page)).toEqual([]);
  });
}
test('labels stay inside the stage after a resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expect(page.locator('[data-hotel="ready"]')).toBeVisible({ timeout: 20_000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await outsideStage(page)).toEqual([]);
  expect(await overlaps(page)).toEqual([]);
});
test('each parts-list row is a button with aria-pressed and the same words as its label', async ({ page }) => {
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  const rows = page.getByRole('region', { name: 'Parts of your app' }).getByRole('button');
  await expect(rows).toHaveCount(11);
  const words = (l: Locator) => l.evaluate(e => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim());
  for (const row of await rows.all()) {
    await expect(row).toHaveAttribute('aria-pressed', 'false');
    const id = await row.getAttribute('data-part');
    expect(await words(row)).toBe(await words(page.locator(`[data-label="${id}"]`)));
  }
  await rows.first().click();
  await expect(rows.first()).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(rows.first()).toHaveAttribute('aria-pressed', 'false');
});
test('with WebGL off, steps 4 and 5 show the still image and the list', async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto(`/start/needs?${DEMO_QUERY}`);
  await expect(page.locator('[data-hotel="fallback"] img')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Parts of your app' })).toBeVisible();
  await saveAndTick(page, 'appCentral');
  await expect(page.locator('[data-hotel="fallback"] img')).toBeVisible();
  await expect(page.getByText('18 are yours · 51 your tools do · 15 questions')).toBeVisible();
});
```
`overlaps(page)` returns pairs of `[data-label]` boxes that intersect; `outsideStage(page)` returns labels whose box leaves `[data-hotel]`. Put both and `saveAndTick` in `e2e/helpers.ts`. The parts list is a `section` with `aria-labelledby` its heading.

`e2e/hotel-still.spec.ts` (skipped unless `HOTEL_STILL=1`): with `reducedMotion: 'reduce'` at 1280×800, open step 4, wait for ready, hide the labels, and save the stage screenshot to `public/models/hotel/still.png`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx playwright test e2e/hotel.spec.ts`
Expected: FAIL (`data-hotel` not found).

- [ ] **Step 3: Implement the component and put it on steps 4 and 5** (read `craft-floor.md` first).

- [ ] **Step 4: Make the still image**

Run: `HOTEL_STILL=1 npx playwright test e2e/hotel-still.spec.ts`
Expected: PASS and `public/models/hotel/still.png` exists. Open it with the Read tool and check that it shows the whole hotel, roof open, all parts in the Drawing look.

- [ ] **Step 5: Run the hotel and journey tests, then look**

Run: `npx playwright test e2e/hotel.spec.ts e2e/journey.spec.ts`
Expected: PASS. Then take screenshots of step 4 (nothing chosen, CCTV chosen) and step 5 (nothing ticked, appCentral, all three) at 1280×800 and 1440×900 in the e2e server (a temporary spec or the built-in browser on port 3100 while the e2e server runs) and check them against the direction contract. Fix what one look shows, then look once more.

- [ ] **Step 6: Commit**

```bash
git add app/hotel app/start/needs "app/projects/[id]/tools" e2e/hotel.spec.ts e2e/hotel-still.spec.ts e2e/helpers.ts public/models/hotel/still.png
git commit -m "feat: the hotel on steps 4 and 5, with labels, parts list and fallback"
```

---

## Phase E: step 6 and the build plan

### Task 14: The plan page with the go

**Files:**
- Create: `app/plan/go.tsx`
- Modify: `app/plan/plan-view.tsx`, `app/plan/export-dialog.tsx`, `app/plan/item-detail.tsx`, `app/projects/[id]/tools/tool-row.tsx` (takes `ToolHints`)
- Delete: `app/plan/floor-plan.tsx`, `lib/plan/floor-plan.ts`, `test/plan/floor-plan.test.ts`, `app/plan/tool-picker.tsx`
- Modify: `e2e/progress.spec.ts`

**Interfaces:**
- Consumes: `Hotel` (non-interactive), `partState(..., 'tools')`, `planTotals`, `startQuery`.
- Produces: `PlanView({ data: PlanData; project: Project; profileId: string })` (projects only; the unsaved path is gone). `Go({ plan: Plan; parts: PartState[]; project: Project; profileTitle: string; toolNames: string[] })`.

Copy and layout:
- Top: "Your plan is ready. {yours} are yours, and your tools do {platform}." (wide heading). Three counts next to the hotel still: "{yours} yours", "{platform} your tools do" with "({unverified} not yet verified)" when > 0, "{questions} questions to answer first".
- Summary line: `{profile title} · {tool names joined with ", " or "No tools"}`, links "Change answers" (to `/start/needs?…&project=`) and "Change tools" (to `/projects/{id}/tools`).
- Main action: `DownloadButton` "Give your agent the build plan" (`/api/export/build-plan?project={id}`). "Export" opens `ExportDialog` with the security review spreadsheet first, then "Security plan (JSON)" and "Tool coverage (JSON)" last; the build plan entry leaves the dialog.
- Below: today's sections and task list, without `FloorPlan`, `ToolPicker`, `ToolHints` and the `room` URL parameter; area names in rows use `areaName` (`"CCTV (Logging)"`). Copy that breaks the stage-neutral rule on this page is replaced too ("yours to build or arrange" → "yours"; "before you build" removed).

- [ ] **Step 1: Write the failing e2e test** (replace the floor-plan parts of `e2e/progress.spec.ts`)

```ts
test('the plan page opens with the go', async ({ page }) => {
  await page.goto('/projects/sample-two-weeks-in');
  await expect(page.getByRole('heading', { name: /^Your plan is ready\. \d+ are yours, and your tools do \d+\.$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Change tools' })).toHaveAttribute('href', '/projects/sample-two-weeks-in/tools');
  await expect(page.getByRole('link', { name: 'Give your agent the build plan' })).toBeVisible();
  await expect(page.getByText('9 of 17 tasks done')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'appCentral' })).toHaveCount(0);
});
```
Keep the task-status and question tests in `progress.spec.ts`; delete the room-filter tests.

- [ ] **Step 2: Run it to see it fail**

Run: `npx playwright test e2e/progress.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** (read `craft-floor.md` first), delete the floor plan and picker files, and fix every import.

- [ ] **Step 4: Run everything that can break**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npx playwright test e2e/progress.spec.ts e2e/journey.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/plan "app/projects/[id]" lib/plan test/plan e2e/progress.spec.ts
git commit -m "feat: the plan page opens with the go; floor plan and picker removed"
```

### Task 15: `BUILD-PLAN.md` by hotel part

**Files:**
- Modify: `lib/export/build-plan-md.ts`, `test/export/build-plan-md.test.ts`, `test/export/__snapshots__/*`

**Interfaces:**
- Consumes: `partOf`, `PARTS`, `partState` (for `areaName`).
- Produces: `renderBuildPlan(plan, meta)` unchanged in signature; inside sections 1, 2 and 3 the items are grouped under `### {areaName}` in `PARTS` order, parts with no items left out; section 4 stays a flat list. `AGENT_SNIPPET` is unchanged.

- [ ] **Step 1: Write the failing test**

```ts
test('tasks are grouped by hotel part in hotel order', async () => {
  const md = renderBuildPlan(await demoPlan(['appcentral', 'dbaas', 'iga'], DEMO_FACTS), META);
  const section1 = md.split('## 1. ')[1].split('## 2. ')[0];
  const heads = [...section1.matchAll(/^### (.+)$/gm)].map(m => m[1]);
  expect(heads).toEqual(['Hotel rules (Security programme)', 'Hotel rooms (Containers)', 'Walls, windows and doors (App security)', 'Safety inspection (Testing)', 'Building materials and deliveries (Secure development, Supply chain)', 'Foundation and frame (Infrastructure)']);
  expect(md).toContain('## 3. Don\'t build this: your platform already does it (66)');
});
```
The heads come from the demo: the 18 tasks are pm 6, cs 2, as 5, st 2, sc 2, is 1. Area names are the plan-wide `areaName`, the same as on step 6, so deliveries names both its families.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run test/export/build-plan-md.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**, then update the snapshot after reading the diff of the snapshot by eye.

Run: `npx vitest run test/export/build-plan-md.test.ts -u`
Expected: PASS; the snapshot diff shows only the new `###` headings.

- [ ] **Step 4: Commit**

```bash
git add lib/export/build-plan-md.ts test/export
git commit -m "feat: build plan sections grouped by hotel part"
```

---

## Phase F: Medium and High profiles

### Task 16: Load Medium-Risk Cloud and High-Risk Cloud CII

**Files:**
- Modify: `lib/data/load-sources.ts`, `lib/data/seed-documents.ts`, `lib/domain/types.ts`, `data/plain-language/low-risk-cloud.json`, `data/plain-language/generative-ai.json`, `test/data/load-sources.test.ts`, `test/data/plain-language.test.ts`, `test/data/seed-documents.test.ts`, `e2e/journey.spec.ts` (remove the `fixme`)

**Interfaces:**
- Produces:
  - `loadLiteProfile(dataDir: string, name: string, id: string, riskLevel: 'low' | 'medium' | 'high', opts?: { requiresCii?: boolean }): Promise<Profile>` reading `im8-lite-catalog.xlsx` column G ("SSP-Profile Level"), entries where the tag `"{name} - Level {n}"` is present; title = name; `plainTitle` "Medium-risk app on the cloud" / "High-risk app on the cloud"; `hosting: 'cloud'`; `release` = catalog version; `version` = `"{release} (locally derived)"`.
  - Profiles: `medium-risk-cloud` (name "Medium-Risk Cloud", medium), `high-risk-cloud-cii` (name "High-Risk Cloud CII", high, `requiresCii: true`).
  - `ProfileEntry.wording: string` = first 16 hex of sha256 of the statement with whitespace collapsed; `hasParameter(statement: string): boolean` = `/\[[^\]]*(default\s*=|insert:)[^\]]*\]/`.
  - `PlainText.checkedFor: string[]`; today's entries get `["low-risk-cloud"]` (GenAI: `["generative-ai"]`).
  - `attachPlain(profiles: Profile[], plainById: Record<string, PlainText>, homeProfileId: string): void`: for each entry, plain text is attached when the profile is in `checkedFor`; otherwise, when the statement has no parameter and its `wording` equals the wording of the same id in a `checkedFor` profile, it is attached **without** `appliesWhen`; otherwise none.
  - Defaults: `defaults.json['low-risk-cloud']` ids are applied to every cloud profile that has them.

- [ ] **Step 1: Write the failing tests**

```ts
test('Medium-Risk Cloud: 118 entries, 9 level changes', async () => {
  const { low, medium } = await profiles();
  expect(medium.entries).toHaveLength(118);
  expect(levelChanges(low, medium)).toEqual(['br-2', 'lm-5', 'lm-19', 'cs-8', 'is-12', 'is-13', 'sd-3', 'ck-1', 'ck-2']);
});
test('High-Risk Cloud CII: 138 entries, 19 level changes, with hr and rs', async () => {
  const { low, high } = await profiles();
  expect(high.entries).toHaveLength(138);
  expect(levelChanges(low, high)).toHaveLength(19);
  expect(high.entries.some(e => e.family === 'hr') && high.entries.some(e => e.family === 'rs')).toBe(true);
});
test('plain text per profile', async () => {
  const { medium } = await seedProfiles();
  const as1 = medium.entries.find(e => e.id === 'as-1')!, as5 = medium.entries.find(e => e.id === 'as-5')!;
  expect(as1.plain?.task).toBeTruthy();          // no parameter, same wording
  expect(as5.plain).toBeUndefined();              // has a parameter
  expect(medium.entries.filter(e => e.plain).length).toBe(92);
});
test('an appliesWhen rule never removes a requirement on a profile outside checkedFor', async () => {
  const { medium } = await seedProfiles();
  expect(medium.entries.some(e => e.plain?.appliesWhen)).toBe(false);
});
test('the High-only requirements have no plain text', async () => {
  const { high } = await seedProfiles();
  expect(high.entries.filter(e => ['hr', 'rs'].includes(e.family)).every(e => !e.plain)).toBe(true);
});
```
`test/data/plain-language.test.ts`: every entry in both JSON files has `checkedFor`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/data`
Expected: FAIL.

- [ ] **Step 3: Add `checkedFor` to the plain-language files**

```bash
node -e "for (const [f,id] of [['data/plain-language/low-risk-cloud.json','low-risk-cloud'],['data/plain-language/generative-ai.json','generative-ai']]) { const fs=require('fs'); const d=JSON.parse(fs.readFileSync(f,'utf8')); for (const k in d) d[k].checkedFor=[id]; fs.writeFileSync(f, JSON.stringify(d,null,2)+'\n'); }"
git diff --stat data/plain-language
```
Expected: only `checkedFor` lines added (check one entry with `git diff | head -20`).

- [ ] **Step 4: Implement the loader, `attachPlain`, the fingerprint and the defaults; seed the two profiles**

- [ ] **Step 5: Add the Medium verdict e2e test and remove the `fixme` from Task 10**

```ts
test('Medium: you can plan it, and no tool covers it yet', async ({ page }) => {
  await page.goto('/start/verdict?c=restricted&s=sh&i=slight&d=min&k=');
  await expect(page.getByRole('heading', { level: 1, name: 'Medium-Risk Cloud' })).toBeVisible();
  await expect(page.getByText('No tool covers Medium-Risk Cloud yet, so more of the work is yours.')).toBeVisible();
  await page.goto('/start/needs?c=restricted&s=sh&i=slight&d=min&k=&f=uses-genai.no');
  await expect(page.getByText('No tool covers Medium-Risk Cloud yet, so every part is yours.')).toBeVisible();
});
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run && npm run test:int && npx tsc --noEmit && npx playwright test e2e/journey.spec.ts`
Expected: PASS, the profile-change test included.

- [ ] **Step 7: Commit**

```bash
git add lib/data lib/domain/types.ts data/plain-language test/data e2e/journey.spec.ts
git commit -m "feat: Medium-Risk Cloud and High-Risk Cloud CII profiles, plain text checked per profile"
```

### Task 17: Exports for every profile, no fixed profile IDs

**Files:**
- Modify: `lib/export/plan-request.ts`, `lib/export/ssp-xlsx.ts`, `lib/export/filename.ts`, `lib/export/about.ts`, `app/api/export/oscal/route.ts`, `app/api/export/ssp/route.ts`, `app/plan/plan-view.tsx`, `app/verify/[toolId]/page.tsx`, `test/export/*.test.ts`

**Interfaces:**
- Produces:
  - `resolvePlanRequest(sp)` also returns `profileId: string` (the base profile).
  - `sspFileName(profileId: string, slug?: string): string` → `${profileId}-ssp.xlsx` or `${profileId}-ssp-${slug}.xlsx`.
  - `buildSspWorkbook(plan: Plan, profile: Profile, opts: { genai?: Plan; about?: AboutInfo }): Promise<ExcelJS.Workbook>` for profiles with no template: sheet `ssp` with the header `['ID','Title','Statement','Recommendations','Risk/Rationale','Profile Level','References','Implemented','Explanation']`, rows in profile order, the GenAI and About sheets as today; the About sheet adds "No official template for this profile; columns follow the Low-Risk Cloud template."
  - The SSP route uses `fillSspWorkbook` with the template when `profileId === 'low-risk-cloud'` (the template file is named for it; that is the one fixed ID left, inside the route, as the template lookup `TEMPLATES: Record<string, string>`), else `buildSspWorkbook`.
  - `defaultVerifyProfile(profiles: Profile[], versions: VersionPair[], toolId: string): string` (the first profile the tool has a version for, else the cloud profile with `riskLevel: 'low'`).
  - No string `'low-risk-cloud'` remains in `app/plan/plan-view.tsx`, `app/api/export/oscal/route.ts`, `lib/export/ssp-xlsx.ts`, `lib/risk/assess.ts` or `app/verify/[toolId]/page.tsx`.

- [ ] **Step 1: Write the failing tests**

```ts
test('a Medium plan exports a build plan, schema-valid OSCAL and a spreadsheet', async () => {
  const plan = await mediumPlan(); // demo answers with sensitivity 'sensitive-high', no tools
  expect(renderBuildPlan(plan, { ...META, profileTitle: 'Medium-Risk Cloud' })).toContain('App type: ');
  expect(validateOscal(buildOscalSsp(plan, OSCAL_INPUT_MEDIUM))).toEqual([]);
  const wb = await buildSspWorkbook(plan, mediumProfile, { about: ABOUT });
  expect(wb.getWorksheet('ssp')!.rowCount).toBe(1 + 118);
  expect(sheetText(wb.getWorksheet('About')!)).toContain('No official template for this profile; columns follow the Low-Risk Cloud template.');
});
test('file names follow the profile', () => {
  expect(sspFileName('medium-risk-cloud', 'payments')).toBe('medium-risk-cloud-ssp-payments.xlsx');
});
test('no fixed profile id is left in the builder code', () => {
  for (const f of ['app/plan/plan-view.tsx', 'app/api/export/oscal/route.ts', 'lib/export/ssp-xlsx.ts', 'lib/risk/assess.ts', 'app/verify/[toolId]/page.tsx'])
    expect(readFileSync(f, 'utf8'), f).not.toContain("low-risk-cloud");
});
```
Use the OSCAL builder and validator the existing `test/export/oscal.test.ts` uses (`test/helpers/oscal-validate.ts`); match their names when you write the test.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run test/export`
Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run all tests**

Run: `npx vitest run && npm run test:int && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/export app/api/export app/plan/plan-view.tsx "app/verify/[toolId]/page.tsx" test/export
git commit -m "feat: exports for every profile; no fixed profile ids"
```

---

## Phase G: finish

### Task 18: End-to-end demo, banned words, run-through

**Files:**
- Modify: `e2e/demo.spec.ts` (rewrite), `e2e/regressions.spec.ts`, `docs/run-through.md` (rewrite)

- [ ] **Step 1: Rewrite `e2e/demo.spec.ts` as the smoke path**

```ts
test('demo: start → verdict → app → needs → save → tools → plan → build plan', async ({ page }) => {
  await page.goto('/start');
  await answerLowRisk(page);
  await page.getByRole('button', { name: 'Work out my app type' }).click();
  await page.getByRole('link', { name: 'Next: about your app' }).click();
  await answerDemoFacts(page);
  await page.getByRole('button', { name: 'Next: what your app needs' }).click();
  await page.getByRole('button', { name: /CCTV · Logging/ }).click();
  await page.getByText('Show all 10 requirements').click();
  await page.getByRole('button', { name: 'Save this plan' }).click();
  await page.getByRole('checkbox', { name: 'appCentral' }).check();
  await expect(page.getByText('18 are yours · 51 your tools do · 15 questions')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to your plan' }).click();
  await expect(page.getByRole('heading', { name: 'Your plan is ready. 18 are yours, and your tools do 51.' })).toBeVisible();
  await expect(page.locator('[data-hotel]')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Give your agent the build plan' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
});
```

- [ ] **Step 2: Extend the banned-word check in `e2e/regressions.spec.ts`**

Walk steps 1–5 (step 1, a verdict, step 3, step 4 with CCTV open and "Show all" open, step 5 with appCentral ticked) and on each page check the visible text, outside official-wording blocks (`[data-official]`), against today's builder regex and the new stage-neutral one: `/\b(will use|before you build|to build)\b/gi`. Give the official-wording disclosures `data-official`.

- [ ] **Step 3: Run the whole e2e suite**

Run: `npm run e2e`
Expected: PASS (all specs). Fix copy the stage-neutral check finds; each new word is listed in the task report for the user's open decision on final words.

- [ ] **Step 4: Rewrite `docs/run-through.md`**

The demo moments in the new order (needs, save, tools as the hotel builds, the go, the build plan), with the numbers from the "Demo numbers" table, the commands to start (`docker-compose up -d`, `npm run seed`, `npm run build && npm start`), the reset button, the WebGL fallback note, and "Viewing as" in the header.

- [ ] **Step 5: Commit**

```bash
git add e2e docs/run-through.md
git commit -m "test: demo smoke path and stage-neutral words; run-through for the new journey"
```

### Task 19: Design finish: detect, review, DESIGN.md

**Files:**
- Modify: whatever the review finds; `DESIGN.md` (written by the documenter)

- [ ] **Step 1: Run the detector once on the changed UI**

Run: `"/Users/tate/.claude/plugins/cache/impeccable/impeccable/4.8.0/skills/impeccable/scripts/impeccable" detect --json app/globals.css app/layout.tsx app/components app/start app/hotel app/plan "app/projects/[id]"`
Expected: JSON findings. Fix each real finding; list the ones you leave, with the reason.

- [ ] **Step 2: Finish review**

Dispatch `impeccable:impeccable-finish-reviewer` with the direction contract (`.impeccable/surfaces/app-layout-tsx.md`), the screenshots from Task 13 step 5 retaken now, and the steps 1–6 routes. Apply the material fixes it returns, re-run `npm run e2e`, and commit with message `fix: finish review` and the files by name.

- [ ] **Step 3: DESIGN.md from the built screens**

Dispatch `impeccable:impeccable-documenter` to write `DESIGN.md` and its sidecar from the shipped code. Read the result, then:

```bash
git add DESIGN.md <sidecar path the documenter names>
git commit -m "docs: DESIGN.md for the light Blueprint look"
```

- [ ] **Step 4: Final check**

Run: `npx vitest run && npm run test:int && npx tsc --noEmit && npm run lint && npm run build && npm run e2e`
Expected: all PASS. Report: the open decisions (SII full name, contact text, final stage-neutral words), and that PRODUCT.md still waits for the user's approval.
