# Build Plan App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local CPFB build plan app. Builders answer risk questions, pick tools, see a sorted plan, and download `BUILD-PLAN.md` and a pre-filled Low-Risk Cloud spreadsheet. Admins record tool coverage and verifiers approve it.

**Architecture:**
- One Next.js App Router app over a local MongoDB.
- A pure TypeScript plan engine (`lib/plan`) runs in the browser for live counts and on the server for downloads.
- Source spreadsheets are loaded by a seed script into plain records. Exports (Markdown, the spreadsheet template filled with exceljs, OSCAL) are generated from those records.

**Tech Stack:**
- Next.js 16.4.3 (App Router, TypeScript, Tailwind 4)
- MongoDB 8.0 in Docker, with the `mongodb` driver 7.7.0
- exceljs 4.4.0, zod 4.6.7, uuid 14.0.3
- Vitest 4.1.12, tsx 4.23.15, ajv 8.20.0 + ajv-formats 3.0.1, @playwright/test 1.64.1

**Spec:** [docs/superpowers/specs/2026-10-27-build-plan-app-design.md](../specs/2026-10-27-build-plan-app-design.md). Read it alongside this plan. Scope tiers are in [2026-10-27-demo-scope-design.md](../specs/2026-10-27-demo-scope-design.md).

## Global Constraints

- **Node:** the installed v25.2.1. Vitest is pinned to 4.1.12 because Vitest 5 excludes Node 25. Don't upgrade it.
- **Builder screen headings, exactly:** "What you need to do", "What your platform already does", "Questions to answer", "Good to have".
- **Words kept off builder screens** (`/start`, `/plan`, `/projects`): "IM8", "SSP", "OSCAL" and "control". They are fine in exports, `/admin` and `/verify`. Requirement IDs appear only as secondary detail.
- **"App Builder", never "Agency",** in every label and export.
- **Requirement keys** are `catalogId:requirementId` (`im8-reform:as-1`, `genai:ga-3`) everywhere: stored records, maps and tests.
- **Coverage values and their labels:**

  | Value | Label |
  |---|---|
  | `provided` | Provided by <tool> |
  | `shared` | Shared (<tool> + App Builder) |
  | `app-builder` | App Builder |
  | `not-applicable` | Not applicable |
  | `other-tool` | Handled by another tool: <tool> |

- **Badge text:**

  | State | Text |
  |---|---|
  | `verified` | Verified |
  | `govtech-published` | Published by GovTech |
  | `not-yet-verified` | Not yet verified |
  | Sample tools | Sample (tag) |

- **Locally derived label:** "Locally derived from GovTech files received 2026-10-22; not an official GovTech release." The Low-Risk Cloud profile version is `2026-10-22 (local copy)`.
- **Spreadsheet export:** writes only columns H (Implemented) and I (Explanation) of `data/source/low-risk-cloud-ssp.xlsx`. Values are `Y`, `N`, `N/A`, `Partial` or blank.
- **Seeding never drops or rewords a requirement.** An unknown requirement ID or tool ID fails the seed with the file name and the ID.
- **Pure modules:** `lib/domain`, `lib/risk`, `lib/plan`, `lib/verify`, `lib/admin`, `lib/export/ssp-values.ts`, `lib/export/build-plan-md.ts`, `lib/export/oscal.ts` and `lib/import/suggest.ts`. They import nothing from `mongodb`, `exceljs`, `next` or `lib/data`.
- **Client components** (`'use client'`) import only from `lib/domain`, `lib/plan`, `lib/risk` and `lib/export/build-plan-md.ts` (for `AGENT_SNIPPET`).
- **Dates** are ISO strings in records, so data passes from server components to client components unchanged. Every `_id` is a string.
- **Commits:** every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Tests:** `npm test` runs the unit tests. `npm run test:int` runs the MongoDB integration tests (`*.int.test.ts`) and needs `docker compose up -d` first.

## Review Focus

1. **Tampered or stale links.** A `/plan` link with unknown or repeated tool IDs in `t=` should drop the unknown ones, remove duplicates and still render. Test in Task 8.
2. **Multi-line or Markdown-like text.** A note or explanation such as `"## Done\nsee PR 12"` must not create a heading in `BUILD-PLAN.md`, and the spreadsheet must keep the text. Test in Task 10.
3. **A picked tool with no version for the active profile.** For example, a newly created tool, or genCentral on Low-Risk Cloud. It contributes no claims, and nothing crashes. Test in Task 5.
4. **A saved project that refers to things that no longer exist.** Statuses for requirements or tool IDs gone after a reset or an edit are ignored without errors. Tests in Tasks 5 and 18.
5. **Uploading a non-workbook, or a workbook whose first sheet isn't the guide.** A non-workbook is rejected with a clear message. When the guide is on another sheet (WebSG's file has a "Change or comment" sheet), the importer finds the sheet with the "ID" header. Test in Task 20.

---

## Tuesday (Must)

### Task 1: Project scaffold, data folder, Docker and test runner

**Files:**
- Create (scaffolded): `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`
- Create: `docker-compose.yml`, `vitest.config.ts`, `vitest.int.config.ts`, `.env.example`, `.claude/launch.json`, `test/data-files.test.ts`
- Move: the root source files into `data/source/` and `data/guides/`

**Interfaces:**
- Produces: the `@/*` import alias at the repo root. Scripts `dev`, `build`, `start`, `test`, `test:int` and `seed`. Env vars `MONGODB_URI` (default `mongodb://localhost:27017`) and `MONGODB_DB` (default `buildplan`; `buildplan_test` in integration tests).

- [ ] **Step 1: Initialise git and move the source files**

```bash
cd /Users/tate/Desktop/flashpoint
git init -b main
mkdir -p data/source data/guides
mv im8-reform.json im8-lite-catalog.xlsx low-risk-cloud-ssp.xlsx gen-ai-catalog.xlsx data/source/
mv FormSG-Component-Guide-DSS.xlsx WebSG-Component-Guide-DSS.xlsx WebSG-LowRiskCloud_2026-06-22.xlsx Isomer-low-risk-cloud-ssp_06Oct2025_Final.xlsx CWP-low-risk-cloud-ssp_v1.2.xlsx data/guides/
```

- [ ] **Step 2: Scaffold Next.js beside the repo and move it in**

create-next-app refuses a non-empty folder, so scaffold in a subfolder first.

```bash
npx create-next-app@16.4.3 .scaffold --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --disable-git --yes
rsync -a .scaffold/ ./ && rm -rf .scaffold
npm install exceljs@4.4.0 mongodb@7.7.0 zod@4.6.7 uuid@14.0.3
npm install -D vitest@4.1.12 tsx@4.23.15 ajv@8.20.0 ajv-formats@3.0.1
```

If create-next-app still prompts, choose App Router yes, `src/` no, Turbopack default. Add `.DS_Store` and `.env` to `.gitignore`.

- [ ] **Step 3: Add the supporting config files**

- **`docker-compose.yml`:** one service `mongo`, image `mongo:8.0`, port `27017:27017`, named volume `mongo-data`.
- **`package.json` scripts:** `"test": "vitest run"`, `"test:int": "vitest run --config vitest.int.config.ts"`, `"seed": "tsx scripts/seed.ts"`.
- **`vitest.config.ts`:** environment `node`, include `test/**/*.test.ts`, exclude `test/**/*.int.test.ts`, alias `@` → repo root.
- **`vitest.int.config.ts`:** include `test/**/*.int.test.ts`, `env: { MONGODB_DB: 'buildplan_test' }`, `fileParallelism: false`, same alias.
- **`.claude/launch.json`:** one configuration `web` with `npm run dev` on port 3000.
- **`.env.example`:** documents the two env vars.

- [ ] **Step 4: Write the data-files test**

```ts
// test/data-files.test.ts
import { existsSync } from 'node:fs';
const source = ['im8-reform.json', 'im8-lite-catalog.xlsx', 'low-risk-cloud-ssp.xlsx', 'gen-ai-catalog.xlsx'];
const guides = ['FormSG-Component-Guide-DSS.xlsx', 'WebSG-Component-Guide-DSS.xlsx', 'WebSG-LowRiskCloud_2026-06-22.xlsx',
  'Isomer-low-risk-cloud-ssp_06Oct2025_Final.xlsx', 'CWP-low-risk-cloud-ssp_v1.2.xlsx'];
test.each(source)('data/source/%s exists', f => expect(existsSync(`data/source/${f}`)).toBe(true));
test.each(guides)('data/guides/%s exists', f => expect(existsSync(`data/guides/${f}`)).toBe(true));
```

- [ ] **Step 5: Verify the toolchain**

- Run `npm test`. Expected: 9 passed.
- Run `docker compose up -d && docker compose ps`. Expected: `mongo` is running.
- Run `npm run dev`. Expected: http://localhost:3000 serves the starter page.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app, data folder, Mongo and Vitest"
```

### Task 2: Domain types and source loaders

**Files:**
- Create: `lib/domain/types.ts`, `lib/data/xlsx.ts`, `lib/data/load-sources.ts`
- Test: `test/data/load-sources.test.ts`

**Interfaces:**
- Produces, in `lib/domain/types.ts` (the contract for every later task):

```ts
export type RequirementKey = `${string}:${string}`;
export type Level = 0 | 1 | 2;
export type CoverageValue = 'provided' | 'shared' | 'app-builder' | 'not-applicable' | 'other-tool';
export type Section = 'cpf' | 'wog' | 'code';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Catalog { _id: string; title: string; version: string; sourceFile: string; derived: true; familyTitles: Record<string, string> }
export interface Requirement { _id: RequirementKey; catalogId: string; id: string; family: string; title: string;
  statement: string; recommendations: string; rationale: string; references: string; lastModified?: string }
export interface PlainText { title: string; task: string; why: string; question?: string }
export interface ProfileEntry { key: RequirementKey; id: string; family: string; title: string; level: Level;
  statement: string; recommendations: string; rationale: string; references: string;
  ifUncovered: 'app-builder' | 'ask'; plain?: PlainText }
export interface Profile { _id: string; title: string; plainTitle: string; version: string; sourceFile: string; entries: ProfileEntry[] }
export interface Tool { _id: string; name: string; description: string; section: Section;
  oscalType: 'service' | 'software'; isSample: boolean; activatesProfiles?: string[] }
export interface CoverageEntry { key: RequirementKey; value: CoverageValue; otherToolId?: string;
  explanation?: string; builderPart?: string; source?: string; originalText?: string }
export interface Approval { at: string; by: string; kind: 'verifier' | 'govtech-published' }
export interface ToolVersion { _id: string; toolId: string; profileId: string; version: number; writtenAgainst: string;
  source: string; changeNote?: string; createdAt: string; createdByRole: 'admin' | 'seed'; approval?: Approval;
  importedFrom?: { fileName: string; missingKeys: RequirementKey[] }; entries: CoverageEntry[] }
export interface Project { _id: string; name: string; ownerName: string; riskAnswers: import('../risk/assess').RiskAnswers;
  toolIds: string[]; taskStatus: Record<RequirementKey, { status: TaskStatus; note?: string }>;
  questionAnswers: Record<RequirementKey, { applies: boolean; reason: string }>; createdAt: string; updatedAt: string }
```

  The `RiskAnswers` import is type-only; Task 7 defines it. Until then, create `lib/risk/assess.ts` exporting only the `RiskAnswers` type and its enums from Task 7.

- Produces, in `lib/data/xlsx.ts`:
  - `cellText(cell: ExcelJS.Cell): string`: handles rich text, hyperlinks, formula results, numbers and dates; trims.
  - `readSheet(file: string, sheetName: string): Promise<ExcelJS.Worksheet>`
- Produces, in `lib/data/load-sources.ts`:
  - `loadIm8Catalog(dataDir: string): Promise<{ catalog: Catalog; requirements: Requirement[] }>`
  - `loadLowRiskCloudProfile(dataDir: string, catalogReqs: Map<RequirementKey, Requirement>): Promise<Profile>`
  - `loadGenAi(dataDir: string): Promise<{ catalog: Catalog; requirements: Requirement[]; profile: Profile }>`
  - `class UnknownRequirementError extends Error`, with the message `Unknown requirement <id> in <file>`

- [ ] **Step 1: Write the failing tests**

```ts
// test/data/load-sources.test.ts
test('IM8 catalog: 149 requirements, keys and family titles from the JSON', async () => {
  const { catalog, requirements } = await loadIm8Catalog('data');
  expect(requirements).toHaveLength(149);
  expect(requirements.find(r => r.id === 'as-1')?._id).toBe('im8-reform:as-1');
  expect(catalog.familyTitles.as).toBe('Application Security');
  expect(catalog.familyTitles.ck).toBe('Cryptography, Encryption and Key Management');
});
test('Low-Risk Cloud: 118 entries, levels 13/73/32, version label, all default to ask', async () => { /* counts by level; version '2026-10-22 (local copy)' */ });
test('profile wording wins over catalog wording', async () => {
  // as-5 is one of the 26 rows whose statement differs: entry.statement equals the SSP sheet cell C for as-5 and differs from the catalog's statement
});
test('an SSP row missing from the catalog throws with the ID and file', async () => {
  // a catalog map without im8-reform:as-1 → rejects /as-1.*low-risk-cloud-ssp.xlsx/
});
test('GenAI: 8 requirements, ga-1..4 level 0, ga-5..8 level 1, key genai:ga-1', async () => { /* ... */ });
```

- [ ] **Step 2: Run the tests to verify they fail.** Run `npx vitest run test/data/load-sources.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement the loaders**

Source layouts:

| File | Sheet | Columns | Notes |
|---|---|---|---|
| `im8-lite-catalog.xlsx` | `catalog` | A ID, B Title, C Statement, D Recommendations, E Risk/Rationale, F References, G SSP-Profile Level, H Last Modified | |
| `low-risk-cloud-ssp.xlsx` | `ssp` | Header row 1, data rows 2–119. A ID, B Title, C Statement, D Recommendations, E Risk/Rationale, F Profile Level (`0`/`1`/`2`), G References | |
| `gen-ai-catalog.xlsx` | `catalog` | Same as the lite catalog; G is `Generative AI - Level N` | |

Family titles come from `im8-reform.json` → `catalog.groups[].{id,title}`. A catalog's `version` is its latest Last Modified date.

Catalogs and profiles:

| Record | `_id` | title / plainTitle | version | Other fields |
|---|---|---|---|---|
| GenAI catalog | `genai` | `Generative AI` | its latest Last Modified date | familyTitles `{ ga: 'Generative AI' }` |
| GenAI profile | `generative-ai` | `Generative AI` / `Apps that use generative AI` | same as the GenAI catalog | |
| Low-Risk Cloud profile | `low-risk-cloud` | `Low-Risk Cloud` / `Low-risk app on the cloud` | `2026-10-22 (local copy)` | |

Entries take the profile sheet's wording; `ifUncovered` is `'ask'`.

- [ ] **Step 4: Run the tests to verify they pass.** Run `npx vitest run test/data/load-sources.test.ts`. Expected: 5 passed.

- [ ] **Step 5: Commit** `feat: domain types and source loaders`.

### Task 3: Seed documents (catalogs, profiles, tools, slide-12 coverage)

**Files:**
- Create: `data/seed/defaults.json`, `data/seed/tools.json`, `data/seed/appcentral-slide12.json`, `data/seed/dbaas-iga-slide12.json`, `lib/data/seed-documents.ts`, `test/helpers/seed.ts`
- Test: `test/data/seed-documents.test.ts`

**Interfaces:**
- Consumes: the Task 2 loaders and types.
- Produces:
  - `interface SeedDocuments { catalogs: Catalog[]; requirements: Requirement[]; profiles: Profile[]; tools: Tool[]; toolVersions: ToolVersion[]; projects: Project[] }`
  - `buildSeedDocuments(dataDir = 'data', now = new Date().toISOString()): Promise<SeedDocuments>`
  - `expandSeedVersion(file: string, seed: SeedVersionFile, profile: Profile, toolIds: Set<string>, now: string): ToolVersion`: exported so tests can call it directly.
  - `test/helpers/seed.ts`: `loadSeed(): Promise<SeedDocuments>`, memoised per test file.
  - Version `_id` format: `${toolId}:${profileId}:v${version}`.

`SeedVersionFile` groups IDs so the JSON stays short:

```ts
interface SeedVersionFile { toolId: string; profileId: string; version: number; source: string; writtenAgainst: string;
  approval?: { by: string; kind: 'verifier' | 'govtech-published' };
  groups: { ids: string[]; value: CoverageValue; otherToolId?: string; explanation?: string; builderPart?: string }[] }
```

- [ ] **Step 1: Write the seed JSON**

**`defaults.json`:** `{ "low-risk-cloud": ["as-1","as-2","as-3","as-7","as-9","sc-4","sc-6","st-4","st-5","cs-3","cs-4"] }`

**`tools.json`:** all with `oscalType: service`.

| `_id` | name | section | isSample | description | Other |
|---|---|---|---|---|---|
| `appcentral` | appCentral | cpf | false | Hosting platform for CPFB apps | |
| `dbaas` | DBaaS | cpf | false | Managed database service | |
| `iga` | IGA | cpf | false | Identity and access governance | |
| `gencentral` | genCentral | cpf | true | Generative AI service | `activatesProfiles: ["generative-ai"]` |

The user may correct the descriptions.

**`appcentral-slide12.json`:** profile `low-risk-cloud`, version 1. Source and `writtenAgainst` are both `AEO TPC slide 12 (28 Oct 2026)`. Approval: `{ by: "AEO TPC slide 12 (28 Oct 2026)", kind: "verifier" }`.

| Value | IDs |
|---|---|
| `provided` | as-4, as-5, as-6, as-8, as-11, as-15, sc-1, sc-3, sc-5, st-1, st-2, st-3, cs-7, cs-9, cs-10, ns-1…ns-8, br-1, br-3, lm-1, lm-2, lm-3, lm-4, lm-6, lm-7, lm-8, lm-9, lm-10, lm-12, sd-1, sd-2, sd-4, sd-5, sd-6, sd-7, sd-8 (42) |
| `not-applicable` (explanation "appCentral does not have hosts (EC2).") | is-1…is-7, is-9, is-10 (9) |
| `app-builder` | as-1, as-2, as-3, as-7, as-9, sc-4, sc-6, st-4, st-5, cs-3, cs-4 (11) |
| `other-tool` → `dbaas` | dp-1…dp-4 (4) |
| `other-tool` → `iga` | ac-1…ac-9, ac-12, ac-14 (11) |

**`dbaas-iga-slide12.json`:** an array of two version files, with no approval. Source: `AEO TPC slide 12 (appCentral's view; not confirmed by the team)`.
- DBaaS v1: dp-1…dp-4 provided.
- IGA v1: ac-1…ac-9, ac-12 and ac-14 provided.

- [ ] **Step 2: Write the failing tests**

```ts
test('appCentral v1 follows slide 12', async () => {
  const v = (await loadSeed()).toolVersions.find(v => v._id === 'appcentral:low-risk-cloud:v1')!;
  const count = (value: string, other?: string) => v.entries.filter(e => e.value === value && e.otherToolId === other).length;
  expect([count('provided'), count('not-applicable'), count('app-builder'), count('other-tool', 'dbaas'), count('other-tool', 'iga')])
    .toEqual([42, 9, 11, 4, 11]);
  expect(v.approval?.kind).toBe('verifier');
});
test('DBaaS (4) and IGA (11) are seeded, not approved', async () => { /* entries length, approval undefined */ });
test('exactly the 11 defaults are app-builder', async () => { /* profile entries with ifUncovered 'app-builder' map to the defaults list */ });
test('unknown requirement ID fails with file and ID', () => {
  expect(() => expandSeedVersion('bad.json', { ...minimal, groups: [{ ids: ['zz-9'], value: 'provided' }] }, profile, new Set(['appcentral']), now))
    .toThrow(/zz-9.*bad\.json/);
});
test('other-tool pointing at an unknown tool fails', () => { /* otherToolId 'nope' → throws /nope/ */ });
```

- [ ] **Step 3: Run the tests to verify they fail.** Run `npx vitest run test/data/seed-documents.test.ts`. Expected: FAIL.

- [ ] **Step 4: Implement `buildSeedDocuments`**

It loads the IM8 catalog, the Low-Risk Cloud profile and the GenAI catalog and profile (via `loadGenAi`), applies `defaults.json`, and merges `data/plain-language/<profileId>.json` into `entry.plain` when that file exists (Task 11 creates it). It then expands each version file, validates tool IDs, and returns `projects: []` (Task 18 fills it).

- [ ] **Step 5: Run the tests to verify they pass.** Run `npx vitest run test/data/seed-documents.test.ts`. Expected: 5 passed.

- [ ] **Step 6: Commit** `feat: seed documents from slide 12`.

### Task 4: Per-row verification

**Files:**
- Create: `lib/plan/verification.ts`, `test/helpers/factories.ts`
- Test: `test/plan/verification.test.ts`

**Interfaces:**
- Produces:
  - `type Verification = 'verified' | 'govtech-published' | 'not-yet-verified'`
  - `interface VersionPair { current: ToolVersion; lastApproved?: ToolVersion }`. When `current` is approved, `lastApproved === current`.
  - `sameCoverage(a?: CoverageEntry, b?: CoverageEntry): boolean`: compares `value`, `otherToolId`, `explanation` and `builderPart`, treating `undefined` and `''` as equal.
  - `rowVerification(key: RequirementKey, pair: VersionPair): Verification`
  - `versionVerification(pair: VersionPair): Verification`: the current version's approval kind, else `'not-yet-verified'`.
  - `test/helpers/factories.ts`:
    - `makeEntry(key, opts?)`
    - `makeProfile(id, entries: Partial<ProfileEntry>[])`
    - `makeTool(id, opts?)`
    - `makeVersion(toolId, profileId, version, entries, approval?)`
    - `pair(current, lastApproved?)`

- [ ] **Step 1: Write the failing tests.** Each case is its own test:
  1. An unchanged row is `verified`.
  2. An edited explanation gives `not-yet-verified`.
  3. A row added since approval gives `not-yet-verified`.
  4. A tool that was never approved gives `not-yet-verified`.
  5. Approval kind `govtech-published` gives `govtech-published`.
  6. When the current version is the approved one, its rows are `verified`.
  7. An explanation of `''` against `undefined` is still `verified`.
  8. `versionVerification` of an edited, unapproved current version is `not-yet-verified`.
- [ ] **Step 2: Run `npx vitest run test/plan/verification.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement** `lib/plan/verification.ts` (spec 6.3).
- [ ] **Step 4: Run it again.** Expected: 8 passed.
- [ ] **Step 5: Commit** `feat: per-row verification`.

### Task 5: Plan engine

**Files:**
- Create: `lib/plan/engine.ts`, `lib/plan/select.ts`, `lib/plan/labels.ts`
- Test: `test/plan/engine.test.ts` (synthetic rules), `test/plan/headline.test.ts` (real seed)

**Interfaces:**
- Consumes: `VersionPair`, `rowVerification` (Task 4); domain types (Task 2).
- Produces:

```ts
export type Heading = 'you' | 'platform' | 'questions' | 'good-to-have';
export type Placement = 'provided' | 'not-applicable' | 'shared' | 'app-builder' | 'default-builder' | 'answered-applies'
  | 'redirect' | 'conflict' | 'open' | 'answered-not-applicable';
export interface Claim { toolId: string; toolName: string; value: CoverageValue; otherToolId?: string; otherToolName?: string;
  explanation?: string; builderPart?: string; source: string; verification: Verification }
export interface PlanItem { key: RequirementKey; profileId: string; id: string; family: string; title: string; plain?: PlainText;
  level: Level; heading: Heading; placement: Placement; claims: Claim[]; decisive: Claim[]; reason: string;
  status?: { status: TaskStatus; note?: string } | { applies: boolean; reason: string } }
export interface ToolHint { fromToolId: string; suggestToolId: string; count: number }
export interface Plan { items: PlanItem[]; counts: Record<Heading, number>; hints: ToolHint[] }
export type ProjectOverlay = Pick<Project, 'taskStatus' | 'questionAnswers'>;
export interface PlanInput { profiles: Profile[]; pickedTools: Tool[]; allTools: Tool[]; versions: VersionPair[]; project?: ProjectOverlay }
export interface PlanData { profiles: Profile[]; tools: Tool[]; versions: VersionPair[] }
export interface PlanState { profileId: string; toolIds: string[] }

export function buildPlan(input: PlanInput): Plan;                                        // engine.ts
export function selectPlanInput(data: PlanData, state: PlanState, project?: ProjectOverlay): PlanInput; // select.ts
```

  `selectPlanInput`:
  - drops unknown or duplicate tool IDs;
  - adds every profile a picked tool lists in `activatesProfiles`;
  - keeps only the versions of picked tools for active profiles.

  `counts.you`, `counts.platform` and `counts.questions` count Level 0/1 items only. `counts['good-to-have']` counts Level 2 items.

- `lib/plan/labels.ts` holds the exact copy:

| Export | Content |
|---|---|
| `HEADING_TITLES` | The four headings from Global Constraints |
| `VALUE_LABEL(value, toolName, otherToolName?)` | The labels table from Global Constraints |
| `BADGE_TEXT` | The badge table from Global Constraints |
| `GOOD_TO_HAVE_LABEL` | provided → "Handled for you"; not-applicable → "Doesn't apply"; every *you* placement → "Yours if you want it"; every *questions* placement → "Worth checking" |
| `HINT_TEXT(from, to, n)` | `${from} expects ${to} for ${n} requirements. Add ${to}?` |

`REASON` by placement. Join several tools with " and ".

| Placement | Reason |
|---|---|
| provided | `Handled by ${tools}.` |
| not-applicable | `Doesn't apply because you use ${tools}.` |
| shared | `Shared with ${tools}: you do your part, ${tools} does the rest.` |
| app-builder | `${tools} says this one is yours.` |
| default-builder | `No tool you picked covers this.` |
| answered-applies | `You said this applies to your app.` |
| redirect | `${tool} expects ${other} to handle this. Are you using ${other}, or handling it yourself?` |
| conflict | `Your tools disagree: ${naTools} says this doesn't apply, but ${otherTools} covers it.` |
| open | `Depends on your app, and no tool you picked covers it.` |
| answered-not-applicable | `You said this doesn't apply: ${reason}` |

- [ ] **Step 1: Write the failing synthetic tests** (`test/plan/engine.test.ts`, using the factories). Each is its own test, named after the spec rule:
  1. Provided beats Shared beats App Builder.
  2. N/A plus Provided gives `questions/conflict`, and `decisive` holds both.
  3. N/A plus App Builder gives `conflict`.
  4. N/A alone gives `platform/not-applicable`.
  5. A redirect to a picked tool is decided by that tool's claim.
  6. A redirect to an unpicked tool gives `questions/redirect`, with reason `appCentral expects DBaaS to handle this. Are you using DBaaS, or handling it yourself?`, and hints `[{fromToolId:'appcentral', suggestToolId:'dbaas', count:1}]`.
  7. A redirect to a picked tool that has no row falls through to the default.
  8. No claims with `ifUncovered: 'app-builder'` gives `you/default-builder`.
  9. No claims otherwise gives `questions/open`.
  10. A Level 2 item gets heading `good-to-have` and keeps its placement.
  11. A project "Applies" answer gives `you/answered-applies`, with the status from `taskStatus` (default `{status:'todo'}`).
  12. A project "Doesn't apply" answer gives `questions/answered-not-applicable`.
  13. A status on a `platform` item is not attached.
  14. *(Review Focus 3)* A picked tool with no version for the profile adds no claims and doesn't throw.
  15. *(Review Focus 4)* Project statuses and answers for keys not in any active profile are ignored.
  16. `selectPlanInput` drops unknown and duplicate tool IDs and adds `generative-ai` when `gencentral` is picked.
  17. Every active requirement appears exactly once.

- [ ] **Step 2: Write the failing headline tests** (`test/plan/headline.test.ts`, using `loadSeed()`, Level 0/1 only, spec 6.4)

```ts
const split = (plan: Plan) => {
  const l01 = plan.items.filter(i => i.level < 2);
  const by = (p: Placement[]) => l01.filter(i => p.includes(i.placement));
  return {
    providedVerified: by(['provided']).filter(i => i.decisive.every(c => c.verification === 'verified')).length,
    providedUnverified: by(['provided']).filter(i => i.decisive.some(c => c.verification === 'not-yet-verified')).length,
    na: by(['not-applicable']).length, you: by(['shared', 'app-builder', 'default-builder']).length,
    open: by(['open']).length, redirect: by(['redirect']).length, total: l01.length,
  };
};
test('appCentral + DBaaS + IGA', async () => expect(split(planFor(['appcentral', 'dbaas', 'iga'])))
  .toEqual({ providedVerified: 42, providedUnverified: 15, na: 9, you: 11, open: 9, redirect: 0, total: 86 }));
test('appCentral only', ...)   // { providedVerified: 42, providedUnverified: 0, na: 9, you: 11, open: 9, redirect: 15, total: 86 }
test('nothing picked', ...)    // { 0, 0, 0, you: 11, open: 75, redirect: 0, total: 86 }
test('the 9 open questions are pm-1..6, is-11, is-14, is-15', ...)
test('appCentral only hints DBaaS ×4 and IGA ×11', ...)
test('counts for appCentral + DBaaS + IGA: you 11, platform 66, questions 9, good-to-have 32', ...)
```

- [ ] **Step 3: Run `npx vitest run test/plan`.** Expected: the engine and headline tests FAIL.
- [ ] **Step 4: Implement** `buildPlan` (spec 6.2, rules 1–10, then the Level 2 and project overlays), `selectPlanInput` and `labels.ts`. In development (`process.env.NODE_ENV !== 'production'`), throw when an active requirement doesn't appear exactly once.
- [ ] **Step 5: Run `npx vitest run test/plan`.** Expected: all pass.
- [ ] **Step 6: Commit** `feat: plan engine with headline tests`.

### Task 6: Database, seeding and reset

**Files:**
- Create: `lib/data/db.ts`, `lib/data/seed.ts`, `lib/data/repos/plan-data.ts`, `scripts/seed.ts`, `app/api/reset/route.ts`
- Test: `test/int/seed.int.test.ts`

**Interfaces:**
- Consumes: `buildSeedDocuments` (Task 3); `PlanData` and `selectPlanInput` (Task 5).
- Produces:
  - `getDb(): Promise<Db>`: reads `MONGODB_URI` and `MONGODB_DB`, caches the client on `globalThis`, uses `serverSelectionTimeoutMS: 2000`.
  - `class DatabaseUnavailableError extends Error`, with the message "The database isn't running. Start it with `docker compose up -d`."
  - `withDb<T>(fn: (db: Db) => Promise<T>): Promise<T>`: maps connection failures to `DatabaseUnavailableError`.
  - `seedDatabase(db: Db, dataDir = 'data'): Promise<{ [collection: string]: number }>`: drops and inserts `catalogs`, `requirements`, `profiles`, `tools`, `toolVersions` and `projects`, and creates a unique index `{ toolId: 1, profileId: 1, version: 1 }` on `toolVersions`.
  - `loadPlanData(db: Db): Promise<PlanData>`: builds one `VersionPair` per (tool, profile). `current` is the highest version; `lastApproved` is the highest approved version.
  - `POST /api/reset`: runs `seedDatabase`, then responds `303` to `/start`.

- [ ] **Step 1: Write the failing integration tests**
  1. After `seedDatabase`, `loadPlanData` returns 2 profiles. The `appcentral` pair has `current.version === 1` and `lastApproved` equal to it; the `dbaas` pair has no `lastApproved`.
  2. `buildPlan(selectPlanInput(data, { profileId: 'low-risk-cloud', toolIds: ['appcentral','dbaas','iga'] }))` has counts you 11, platform 66, questions 9.
  3. Inserting a duplicate `(appcentral, low-risk-cloud, 1)` throws error code 11000.
  4. `withDb` against `MONGODB_URI=mongodb://localhost:1` rejects with `DatabaseUnavailableError`.
- [ ] **Step 2: Run `docker compose up -d && npm run test:int`.** Expected: FAIL.
- [ ] **Step 3: Implement** the modules above and `scripts/seed.ts`, which calls `seedDatabase(await getDb())`, prints the counts and exits.
- [ ] **Step 4: Run `npm run test:int`, then `npm run seed`.** Expected: tests pass; the seed prints `toolVersions: 3`.
- [ ] **Step 5: Commit** `feat: Mongo seeding, plan data loading and reset route`.

## Wednesday (Must)

### Task 7: Risk assessment

**Files:**
- Create: `lib/risk/assess.ts` (replaces the Task 2 type stub)
- Test: `test/risk/assess.test.ts`

**Interfaces:**
- Produces:

```ts
export type Classification = 'official-open' | 'official-closed' | 'restricted' | 'confidential-cloud-eligible' | 'confidential' | 's-class';
export type Sensitivity = 'non-sensitive' | 'sensitive-normal' | 'sensitive-high';
export type Impact = 'none' | 'slight' | 'moderate' | 'significant' | 'critical';
export type Downstream = 'minimal' | 'significant';
export interface RiskAnswers { classification: Classification; sensitivity: Sensitivity; impact: Impact; downstream: Downstream; cii: boolean; sii: boolean }
export interface RiskResult { level: 'low' | 'medium' | 'high'; appType: string; reasons: string[]; profileId: 'low-risk-cloud' | null }
export const RISK_SOURCE_URL = 'https://docs.standards.tech.gov.sg/risk-materiality-level/';
export const OPTION_LABELS: { classification: Record<Classification, string>; sensitivity: Record<Sensitivity, string>;
  impact: Record<Impact, string>; downstream: Record<Downstream, string> };
export function assessRisk(a: RiskAnswers): RiskResult;
```

Labels:

| Field | Labels |
|---|---|
| classification | Official (Open), Official (Closed), Restricted, Confidential (Cloud Eligible), Confidential, S-class |
| sensitivity | Non-Sensitive, Sensitive Normal, Sensitive High |
| impact | No impact, Slight, Moderate, Significant, Critical |
| downstream | None or minimal, Significant |

App types:

| Level | appType |
|---|---|
| low | Low-risk app on the cloud |
| medium | Medium-risk app on the cloud |
| high | High-risk app on the cloud |

Reasons: only the deciding level's triggers are listed.

| Trigger | Reason |
|---|---|
| High: impact critical | The worst impact is Critical. |
| High: CII | The system is CII. |
| High: S-class | The data is S-class. |
| Medium: impact moderate or significant | The worst impact is Moderate. / The worst impact is Significant. |
| Medium: SII | The system is SII. |
| Medium: confidential or confidential-cloud-eligible | The data is Confidential. / The data is Confidential (Cloud Eligible). |
| Medium: sensitive-high | The data is Sensitive High. |
| Medium: downstream significant | Systems that depend on it would be significantly affected. |
| Low | Data up to Restricted and Sensitive Normal, at most Slight impact, and minimal impact on other systems. |

- [ ] **Step 1: Write the failing tests**
  - One Low case: restricted, sensitive-normal, slight, minimal, no ticks. Expected: `profileId: 'low-risk-cloud'`.
  - One case per High trigger.
  - One case per Medium trigger.
  - High beats Medium when both apply; reasons list only the High triggers.
  - Boundary cases: slight is Low and moderate is Medium; SII alone is Medium; Sensitive High alone is Medium; Official (Open) with Non-Sensitive and no impact is Low.
- [ ] **Step 2: Run `npx vitest run test/risk`.** Expected: FAIL.
- [ ] **Step 3: Implement** `assessRisk`.
- [ ] **Step 4: Run it again.** Expected: pass.
- [ ] **Step 5: Commit** `feat: risk assessment from the user's table`.

### Task 8: URL state and "Tell us about your app"

**Files:**
- Create: `lib/plan/url-state.ts`, `app/start/page.tsx`, `app/start/start-form.tsx` (client)
- Modify: `app/page.tsx` (redirect to `/start`)
- Test: `test/plan/url-state.test.ts`

**Interfaces:**
- Consumes: `RiskAnswers`, `assessRisk`, `OPTION_LABELS`, `RISK_SOURCE_URL` (Task 7).
- Produces:
  - `planQuery(answers: RiskAnswers, toolIds: string[]): string`: the query string without `?`.
  - `parsePlanQuery(sp: Record<string, string | string[] | undefined>, knownToolIds: string[]): { answers: RiskAnswers; toolIds: string[] } | null`: uses zod.

  URL codes:

  | Key | Field | Codes |
  |---|---|---|
  | `c` | classification | `open`, `closed`, `restricted`, `conf-ce`, `conf`, `s-class` |
  | `s` | sensitivity | `ns`, `sn`, `sh` |
  | `i` | impact | `none`, `slight`, `moderate`, `significant`, `critical` |
  | `d` | downstream | `min`, `sig` |
  | `k` | ticks | comma list of `cii`, `sii` |
  | `t` | tools | comma list of tool IDs |

- [ ] **Step 1: Write the failing tests**
  1. A round trip returns the same answers and tools.
  2. `c=bogus` returns `null`.
  3. A missing `t` gives `[]`.
  4. *(Review Focus 1)* `t=appcentral,nope,appcentral` with known `['appcentral','dbaas']` gives `['appcentral']`.
  5. `planQuery` for the demo answers equals `c=restricted&s=sn&i=slight&d=min&k=&t=appcentral,dbaas,iga`.
- [ ] **Step 2: Run `npx vitest run test/plan/url-state.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement** `url-state.ts`, then the page.
  - **Form:** four radio groups and two checkboxes.
    - Questions: "What's the highest classification of data the app handles?", "How sensitive is it?", "If the app failed or leaked, what's the worst impact in any area?", "What's the impact on systems that depend on it?".
    - Tick boxes: "The system is CII", "The system is SII".
  - **On submit**, show `appType`, the reasons, and "Based on GovTech's risk materiality levels" linking to `RISK_SOURCE_URL`.
  - **Low:** a "See your build plan" link to `/plan?${planQuery(answers, [])}`.
  - **Medium or High:** "We don't support this type of app yet."
- [ ] **Step 4: Run the tests, then check in the browser** (`npm run dev`, http://localhost:3000/start).
  - The demo answers show "Low-risk app on the cloud".
  - Ticking CII shows "High-risk app on the cloud" with "The system is CII." and no plan link.
- [ ] **Step 5: Commit** `feat: risk questions screen and plan URL state`.

### Task 9: "Your build plan" screen

**Files:**
- Create: `app/plan/page.tsx` (server), `app/plan/plan-view.tsx` (client), `app/plan/tool-picker.tsx`, `app/plan/plan-item.tsx`, `app/plan/badge.tsx`

**Interfaces:**
- Consumes: `withDb`, `loadPlanData` (Task 6); `parsePlanQuery`, `planQuery` (Task 8); `assessRisk` (Task 7); `buildPlan`, `selectPlanInput`, `labels` (Task 5); `rowVerification` and `versionVerification` results via `Claim.verification`.
- Produces:
  - `<PlanView data: PlanData; answers: RiskAnswers; initialToolIds: string[]; project?: Project; onChangeTools?: (ids: string[]) => void />`. Task 18 reuses it with `project`.
  - Download links at `/api/export/build-plan?<query>` and `/api/export/ssp?<query>`.

The page:

- **Server component:** parses the URL. Invalid state, or an app type that isn't Low, redirects to `/start`. Otherwise it loads `PlanData` and renders `PlanView`. A `DatabaseUnavailableError` renders its message.
- **Picker:** grouped by section ("CPF tools", "Whole-of-government tools", "Code components"; empty sections hidden). Each tool shows "Sample" when `isSample` and the `versionVerification` badge. A tool with no version for the active profile, such as genCentral on Low-Risk Cloud, shows no badge. Toggling a tool recomputes the plan and updates the URL with `router.replace`, without reloading. Hints render as `HINT_TEXT` with an "Add <tool>" button.
- **Headings:** the four `HEADING_TITLES`, each with its count. Items show the plain title (falling back to the official title), "Why it matters" (`plain.why` or the rationale), the reason, the claims' badges, and the ID in small text.
  - "What your platform already does" groups items by tool, then "Doesn't apply because of your tools".
  - Good to have shows each item's `GOOD_TO_HAVE_LABEL`.
- **Top:** two download buttons, "Build plan for your agent" and "Security review spreadsheet".

- [ ] **Step 1: Implement** the components.
- [ ] **Step 2: Check in the browser** at `/plan?c=restricted&s=sn&i=slight&d=min&k=&t=appcentral,dbaas,iga`.
  - The counts read 11 / 66 / 9 / 32.
  - DP items show "Not yet verified".
  - Unticking DBaaS changes Questions to 13 and shows "appCentral expects DBaaS for 4 requirements. Add DBaaS?". Clicking "Add DBaaS" restores 9.
  - `curl -s "localhost:3000/plan?c=restricted&s=sn&i=slight&d=min&k=&t=appcentral" | grep -oE 'IM8|SSP|OSCAL|[Cc]ontrol\b' | sort -u` prints nothing.
- [ ] **Step 3: Commit** `feat: build plan screen with live counts`.

### Task 10: `BUILD-PLAN.md` export

**Files:**
- Create: `lib/export/build-plan-md.ts`, `app/api/export/build-plan/route.ts`, `lib/export/plan-request.ts`
- Modify: `app/plan/plan-view.tsx` (show `AGENT_SNIPPET` in a copyable block under the download button)
- Test: `test/export/build-plan-md.test.ts`

**Interfaces:**
- Consumes: `Plan` (Task 5); `versionVerification` (Task 4).
- Produces:
  - `interface BuildPlanMeta { title: string; appType: string; profileTitle: string; tools: { name: string; version: number; verification: Verification }[]; generatedAt: string }`
  - `renderBuildPlan(plan: Plan, meta: BuildPlanMeta): string`
  - `AGENT_SNIPPET: string`: exactly the spec 9.1 snippet.
  - `oneLine(text: string): string`: collapses whitespace and newlines to single spaces and strips leading `#` and `>` characters.
  - In `lib/export/plan-request.ts` (server): `resolvePlanRequest(sp: URLSearchParams): Promise<{ plan: Plan; data: PlanData; answers: RiskAnswers; toolIds: string[]; project?: Project; meta: BuildPlanMeta }>`. This is shared by every export route. `?project=<id>` support is added in Task 18.

- [ ] **Step 1: Write the failing tests** (real seed, appCentral + DBaaS + IGA)
  1. The document contains `## 1. What you need to do (11)`, `## 2. Ask a person first (9)`, `## 3. Don't build this: your platform already does it (66)`, `### appCentral` and `### Doesn't apply on your platform`.
  2. The lines for dp-1…dp-4 end with `(not yet verified)`.
  3. No Level 2 ID appears (`ck-1`, `lm-19`).
  4. A Markdown snapshot of the whole file (`toMatchSnapshot()`).
  5. A synthetic library tool with a shared as-1 row whose `builderPart` mentions "Zod": "Zod" is absent when the tool isn't picked and present when it is.
  6. *(Review Focus 2)* A task note of `"## Done\nsee PR 12"` produces no line starting with `## Done`.
- [ ] **Step 2: Run `npx vitest run test/export/build-plan-md.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement**, following the spec 9.1 skeleton exactly.
  - Section 1 holds the *you* items (Level 0/1).
  - Section 2 holds the *questions* items, using `plain.question` or the fallback `Does "<title>" apply to your app, and who handles it?`.
  - Section 3 holds the provided items grouped by tool name, then not-applicable items under `### Doesn't apply on your platform`.
  - The route returns `text/markdown` with `Content-Disposition: attachment; filename="BUILD-PLAN.md"`.
- [ ] **Step 4: Run the tests, then download from `/plan`.** Expected: pass; the file opens with the three sections.
- [ ] **Step 5: Commit** `feat: BUILD-PLAN.md export`.

### Task 11: Plain-language drafts

**Files:**
- Create: `data/plain-language/low-risk-cloud.json`, `data/plain-language/generative-ai.json`, `data/plain-language/REVIEW.md`
- Test: `test/data/plain-language.test.ts`

**Interfaces:**
- Consumes: the merge in `buildSeedDocuments` (Task 3).
- Produces: `{ "<id>": { "title", "task", "why", "question"? } }` for all 118 Low-Risk Cloud IDs and all 8 GenAI IDs.

Writing rules:
- `title`: 60 characters or fewer, sentence case.
- `task`: starts with a verb.
- `why`: one or two sentences, from Risk/Rationale.
- `question`: required for pm-1…pm-6, is-11, is-14, is-15 and all ga-*; ends with "?".
- Builder language only.

- [ ] **Step 1: Write the failing test.**
  1. Every profile ID has an entry.
  2. There are no extra IDs.
  3. `title`, `task` and `why` are non-empty strings.
  4. The required `question`s exist and end with "?".
  5. No field matches `/\b(IM8|SSP|OSCAL|control|agency)\b/i`.
- [ ] **Step 2: Run `npx vitest run test/data/plain-language.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Draft** all entries. Then write `REVIEW.md`: a table of the 20 builder-facing IDs (the 11 defaults plus the 9 questions) with columns ID, official title, plain title, task / question, why. It's for the user to review by Thursday midday.
- [ ] **Step 4: Run the test, then `npm run seed`.** The `/plan` items now show plain titles.
- [ ] **Step 5: Commit** `content: plain-language drafts for review`.

## Thursday (Must)

### Task 12: The user's extra CPF tools

Do this only when the user has sent the tools (due Wednesday night). Otherwise skip it and say so in the day's report.

**Files:**
- Modify: `data/seed/tools.json`
- Create: `data/seed/samples/<toolId>.json`, one `SeedVersionFile` per tool
- Test: extend `test/data/seed-documents.test.ts`

Each tool gets `isSample: true`, no `approval`, and source `Sample, not confirmed by the <tool name> team (supplied 2026-10-28)`. `buildSeedDocuments` loads every file in `data/seed/samples/`.

- [ ] **Step 1: Add a failing test:** every tool from `samples/` has `isSample` true and an unapproved v1.
- [ ] **Step 2: Add the JSON** from the user's list and implement the loading.
- [ ] **Step 3: Run `npm test`, then `npm run seed`.** Expected: pass; the tools appear in the picker with "Sample".
- [ ] **Step 4: Commit** `content: sample CPF tools from the user`.

### Task 13: Spreadsheet values

**Files:**
- Create: `lib/export/ssp-values.ts`
- Test: `test/export/ssp-values.test.ts`

**Interfaces:**
- Consumes: `PlanItem`, `Claim` (Task 5).
- Produces:
  - `type Implemented = 'Y' | 'N' | 'N/A' | 'Partial' | ''`
  - `sspValues(item: PlanItem): { implemented: Implemented; explanation: string }`
  - `STATUS_LABEL: Record<TaskStatus, string>`: To do / In progress / Done.

- [ ] **Step 1: Write one failing test per row of the spec 9.2 table,** with the exact strings. Examples:

```ts
expect(sspValues(provided('appCentral', 'Uses TLS 1.2+.', 'AEO TPC slide 12 (28 Oct 2026)')))
  .toEqual({ implemented: 'Y', explanation: 'Provided by appCentral: Uses TLS 1.2+. Source: AEO TPC slide 12 (28 Oct 2026).' });
expect(sspValues(builder('done', 'Zod on every route'))).toEqual({ implemented: 'Y',
  explanation: "App builder's responsibility. Status: Done (self-declared). Zod on every route." });
```

  Also test:
  - Shared with To do and In progress gives `Partial`; with Done, `Y`.
  - Builder To do / In progress / Done gives N / Partial / Y.
  - `answered-not-applicable` gives `N/A` and `Does not apply (self-declared): <reason>.`
  - `open`, `redirect` and `conflict` give `''` and `''`.
  - An unverified claim's text starts with `[Not yet verified] `.
  - Two provided claims are joined with `; `.
  - Inserted text ending in "." never produces `..`.
  - A Level 2 open item is blank.
- [ ] **Step 2: Run `npx vitest run test/export/ssp-values.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement** `sspValues`. For shared items, the builder's part is `builderPart`, falling back to `plain.task` and then the title.
- [ ] **Step 4: Run it again.** Expected: pass.
- [ ] **Step 5: Commit** `feat: spreadsheet Implemented and Explanation values`.

### Task 14: Spreadsheet export

**Files:**
- Create: `lib/export/ssp-xlsx.ts`, `lib/export/filename.ts`, `app/api/export/ssp/route.ts`
- Test: `test/export/ssp-xlsx.test.ts`

**Interfaces:**
- Consumes: `sspValues` (Task 13); `resolvePlanRequest` (Task 10).
- Produces:
  - `fillSspWorkbook(plan: Plan, opts: { templatePath: string }): Promise<Buffer>`. Tasks 19 and 24 add `genai` and `about` options.
  - `class MissingTemplateRowError extends Error`: the message names the ID.
  - `slugify(name: string): string`
  - `sspFileName(projectName?: string): string`: `low-risk-cloud-ssp.xlsx`, or `low-risk-cloud-ssp-<slug>.xlsx`.

- [ ] **Step 1: Write the failing tests** (real seed, appCentral + DBaaS + IGA). Fill the workbook, then read it back with exceljs.

| Row | H | I |
|---|---|---|
| as-4 | `Y` | starts `Provided by appCentral` |
| dp-1 | `Y` | starts `[Not yet verified] Provided by DBaaS` |
| as-1 | `N` | |
| is-1 | `N/A` | |
| pm-1 | `''` | `''` |

  Also test:
  - For all 118 rows, columns A–G equal the template's.
  - A plan item whose ID isn't in the template throws `MissingTemplateRowError` naming the ID.
  - `slugify("Member's app / v2")` is `member-s-app-v2`.
  - `sspFileName()` is `low-risk-cloud-ssp.xlsx`.
- [ ] **Step 2: Run `npx vitest run test/export/ssp-xlsx.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement.** Find rows by column A in rows 2–119, write H and I, and set wrap text on I. The route returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with the file name from `sspFileName`.
- [ ] **Step 4: Run the tests, then download from `/plan` and open the file once in Excel or Numbers.** Expected: the layout is unchanged; H and I are filled.
- [ ] **Step 5: Commit** `feat: pre-filled security review spreadsheet`.

### Task 15: App shell, role switcher and Reset demo data

**Files:**
- Create: `lib/role.ts`, `app/actions/role.ts`, `app/components/header.tsx`, `app/components/role-switcher.tsx` (client), `app/components/reset-button.tsx` (client)
- Modify: `app/layout.tsx`
- Test: `test/role.test.ts`

**Interfaces:**
- Produces:
  - `type Role = 'builder' | 'admin' | 'verifier'`
  - `ROLE_COOKIE = 'role'`
  - `parseRole(v?: string): Role`: defaults to `builder`.
  - `getRole(): Promise<Role>` (reads `cookies()`)
  - server action `setRole(role: Role)`
  - `<RoleGate need: Role>`: renders children, or "Switch to <role> to use this page."

The header has the app name, links (Build plan → `/start`; Admin; Verify; Saved projects, added in Task 18), the role switcher and Reset demo data. Reset confirms with "Reset all demo data? Saved projects and coverage edits will be lost." and then POSTs to `/api/reset`.

- [ ] **Step 1: Write the failing test:** `parseRole('admin')` is `admin`; `parseRole('x')` and `parseRole(undefined)` are `builder`.
- [ ] **Step 2: Run `npx vitest run test/role.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the test, then check in the browser.** Switching role persists across reloads. Reset returns to `/start` and restores the seeded data.
- [ ] **Step 5: Commit** `feat: header, role switcher and demo reset`.

### Task 16: Coverage editor and saving versions

**Files:**
- Create: `lib/admin/new-version.ts`, `lib/data/repos/tools.ts`, `lib/data/repos/tool-versions.ts`, `app/admin/page.tsx`, `app/admin/tools/[toolId]/page.tsx`, `app/admin/tools/[toolId]/coverage-editor.tsx` (client), `app/admin/actions.ts`
- Test: `test/admin/new-version.test.ts`, `test/int/tool-versions.int.test.ts`

**Interfaces:**
- Consumes: `RoleGate` (Task 15); `loadPlanData` (Task 6); `versionVerification` (Task 4); `VALUE_LABEL` (Task 5); `slugify` (Task 14).
- Produces:
  - `type DraftRow = { key: RequirementKey; value: CoverageValue | ''; otherToolId?: string; explanation?: string; builderPart?: string; source?: string }`
  - `validateNewVersion(rows: DraftRow[], versionSource: string): { ok: true; entries: CoverageEntry[] } | { ok: false; errors: { key?: RequirementKey; message: string }[] }`:
    - drops rows whose `value` is `''`, and trims strings;
    - error "Add a source for this version." when `versionSource` is blank;
    - error "Pick which tool handles this." for `other-tool` without `otherToolId`.
  - `createToolVersion(db, input: { toolId: string; profileId: string; source: string; changeNote?: string; entries: CoverageEntry[]; writtenAgainst?: string; createdByRole: 'admin' | 'seed'; importedFrom?: ToolVersion['importedFrom'] }): Promise<ToolVersion>`:
    - version = highest + 1, retrying once on error 11000;
    - `writtenAgainst` defaults to the profile's version.
  - `createTool(db, input: Omit<Tool, '_id'>): Promise<Tool>`: `_id` is `slugify(name)`; rejects a duplicate name.
  - Server actions `saveVersionAction(toolId, profileId, rows, source, changeNote)` and `createToolAction(formData)`.

The screens (spec section 8):

- **`/admin`:** a tools table (name, section, current version, badge, date) and a "New tool" form.
- **The editor:** one row per profile requirement, with the columns ID, official title, Who handles it (a select of the five labels, plus a tool select for `other-tool`), Explanation, App Builder's part, and Source.
  - Filters: family, level, and "rows with coverage only".
  - A profile picker appears when the tool has versions for more than one profile.
  - "Save new version" opens a dialog for Source (prefilled from the current version) and "What changed".

- [ ] **Step 1: Write the failing tests**
  - Unit: blank source gives the error; `other-tool` without a tool gives the error; `''` rows are dropped; strings are trimmed.
  - Integration: after seeding, `createToolVersion` for appcentral gives `version: 2` with no approval. Two concurrent calls give versions 2 and 3 without throwing.
- [ ] **Step 2: Run `npx vitest run test/admin && npm run test:int`.** Expected: FAIL.
- [ ] **Step 3: Implement** the modules and screens.
- [ ] **Step 4: Run the tests, then check in the browser** (role admin). Edit as-4's explanation and save with "What changed: clarified TLS". On `/plan`, only as-4 shows "Not yet verified", and appCentral's picker badge shows "Not yet verified".
- [ ] **Step 5: Commit** `feat: coverage editor with versioned saves`.

### Task 17: Verifier screen

**Files:**
- Create: `lib/verify/diff.ts`, `app/verify/page.tsx`, `app/verify/[toolId]/page.tsx`, `app/verify/actions.ts`
- Modify: `lib/data/repos/tool-versions.ts`
- Test: `test/verify/diff.test.ts`, `test/int/approve.int.test.ts`

**Interfaces:**
- Consumes: `sameCoverage` (Task 4); repos (Task 16).
- Produces:
  - `diffVersions(current: ToolVersion, lastApproved?: ToolVersion): { added: CoverageEntry[]; changed: { before: CoverageEntry; after: CoverageEntry }[]; removed: CoverageEntry[] }`
  - `approveCurrentVersion(db, versionId: string, by: string): Promise<ToolVersion>`: throws `StaleVersionError` ("A newer version exists") unless `versionId` is the highest version for its tool and profile. Sets `approval: { at, by, kind: 'verifier' }`.
  - `listAwaitingApproval(db): Promise<{ tool: Tool; current: ToolVersion }[]>`
  - Server action `approveAction(versionId)`, called with `by: 'Verifier'`.

`/verify` lists the tools awaiting approval. `/verify/[toolId]` shows the "What changed" note, the added, changed and removed rows side by side (using the `VALUE_LABEL`s), and Approve.

- [ ] **Step 1: Write the failing tests**
  - `diffVersions`: one added, one changed, one removed. A never-approved tool lists every row as added.
  - Integration: create v2, then approving v1 throws `StaleVersionError`. Approving v2 sets the approval, and `loadPlanData` then gives `lastApproved.version === 2`.
- [ ] **Step 2: Run `npx vitest run test/verify && npm run test:int`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests, then rehearse demo moment 5 in the browser:** edit as-4 as admin, approve as verifier, and check that as-4's badge is back to "Verified" on `/plan`.
- [ ] **Step 5: Commit** `feat: verifier approval`.

## Friday (Should, in this order)

### Task 18: Saved projects and the "two weeks later" project

**Files:**
- Create: `lib/data/repos/projects.ts`, `app/projects/page.tsx`, `app/projects/[id]/page.tsx`, `app/projects/actions.ts`, `app/plan/save-dialog.tsx`, `data/seed/projects.json`
- Modify: `app/plan/plan-view.tsx` and `app/plan/plan-item.tsx` (status controls when `project` is set), `lib/export/plan-request.ts` (`?project=<id>`), `lib/data/seed-documents.ts`, `app/components/header.tsx`
- Test: `test/int/projects.int.test.ts`; extend `test/data/seed-documents.test.ts`

**Interfaces:**
- Consumes: `PlanView` (Task 9); `resolvePlanRequest` (Task 10); `sspFileName` (Task 14).
- Produces:
  - `createProject(db, { name, ownerName, riskAnswers, toolIds }): Promise<Project>` (`_id` from `crypto.randomUUID()`)
  - `getProject(db, id)`, `listProjects(db)`
  - `setTaskStatus(db, id, key, { status, note? })`
  - `setQuestionAnswer(db, id, key, { applies, reason } | null)`
  - `setProjectTools(db, id, toolIds)`
  - Exports accept `?project=<id>`: they use the project's answers, tools and statuses, and the file name gets the project's slug.

The screens and seed:

- **Controls on `/projects/[id]`:**
  - *you* items: To do / In progress / Done, plus a note.
  - *questions* items: Applies / Doesn't apply, plus a reason.
  - Changes autosave.
- **`/projects`:** lists name, owner and last updated.
- **The seed project** uses the demo answers and appCentral + DBaaS + IGA. Name "Sample project (two weeks in)", owner "Sample builder".

  | Item | Seeded state |
  |---|---|
  | as-1, as-2, as-3, as-7, sc-4, sc-6, st-5 | Done |
  | as-9, st-4 | In progress |
  | cs-3, cs-4 | To do |
  | is-11, is-14, is-15 | Doesn't apply (reasons end "(sample answer)") |
  | pm-1…pm-6 | Applies; pm-3 and pm-6 Done |

- [ ] **Step 1: Write the failing tests**
  - Seed: the project has 7 Done among the 11 default tasks.
  - Integration: create, set as-1 to Done, and reload. `buildPlan` then gives as-1 `status.status === 'done'`.
  - *(Review Focus 4)* A project saved with `toolIds: ['appcentral','deleted-tool']` and a status for `im8-reform:zz-1` loads and plans without throwing.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement** the repos, screens, save dialog and export support.
- [ ] **Step 4: Run the tests, then rehearse demo moment 4:** open the seed project and download the spreadsheet. as-1 is `Y`, as-9 `Partial`, cs-3 `N`, is-14 `N/A`. Then report the resulting numbers (tasks done of total) so the user can update the scope note's "7 of 11" line.
- [ ] **Step 5: Commit** `feat: saved projects with time-skip sample`.

### Task 19: GenAI requirements in the plan and spreadsheet

**Files:**
- Modify: `lib/export/ssp-xlsx.ts`
- Test: `test/plan/genai.test.ts`; extend `test/export/ssp-xlsx.test.ts`

**Interfaces:**
- Consumes: the `activatesProfiles` handling in `selectPlanInput` (Task 5).
- Produces: the `fillSspWorkbook` option `genai?: { profile: Profile }`. When it's given, the export adds a worksheet `genai`:
  - header row: ID, Title, Statement, Recommendations, Risk/Rationale, Profile Level, References, Implemented, Explanation;
  - one row per GenAI entry, with values from `sspValues`.

- [ ] **Step 1: Write the failing tests**
  - Picking appCentral + genCentral adds 8 `genai:ga-*` items in `questions/open`, and `counts.questions` rises by 8.
  - The workbook has a `genai` sheet with 9 rows (the header plus 8), with Profile Level `0` for ga-1 and `1` for ga-8.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** The ssp route passes `genai` when the plan contains any `genai:` item.
- [ ] **Step 4: Run them.** Expected: pass.
- [ ] **Step 5: Commit** `feat: GenAI requirements in plan and spreadsheet`.

### Task 20: Component Guide importer, with WebSG and Isomer seeded

**Files:**
- Create: `lib/import/parse-guide.ts`, `lib/import/suggest.ts`, `lib/import/plan-import.ts`, `app/admin/import/page.tsx`, `app/admin/import/import-form.tsx` (client), `app/admin/import/actions.ts`, `data/seed/guides.json`
- Modify: `lib/data/seed-documents.ts`
- Test: `test/import/suggest.test.ts`, `test/import/guides.test.ts`

**Interfaces:**
- Consumes: `cellText` (Task 2); `createToolVersion`, `createTool` (Task 16).
- Produces:
  - `parseGuide(data: Buffer | ArrayBuffer, fileName: string): Promise<ParsedGuide>`
  - `interface ParsedGuide { fileName: string; sheetName: string; headerRow: number; preamble: string[]; rows: GuideRow[] }`
  - `interface GuideRow { id: string; owner: string; agencyInputs?: string; explanation?: string }`
  - `class GuideParseError extends Error { code: 'not-a-workbook' | 'no-header' }`
  - `suggestValue(owner: string, agencyInputs?: string): CoverageValue | null`: the spec section 10, step 7 table. Matching is case-insensitive and whitespace-normalised. "Mentions the agency" means `/\bagency\b/i` plus other text.
  - `previewImport(guide: ParsedGuide, profile: Profile): ImportPreview`
  - `interface ImportPreview { unknownIds: string[]; missingKeys: RequirementKey[]; writtenAgainst: string; pairs: { pairKey: string; owner: string; agencyInputs?: string; count: number; suggested: CoverageValue | null }[] }`
  - `buildImportEntries(guide: ParsedGuide, profile: Profile, mapping: Record<string, CoverageValue>): CoverageEntry[]`: throws when a pair is unmapped.
    - `originalText` is the owner text.
    - Explanation goes to `builderPart` for `app-builder` rows and to `explanation` otherwise.

Parsing rules:

- **Sheet and header:** the guide is the first worksheet with a cell equal to "ID" in its first 10 rows. The header row is that row.
- **Columns:** matched by lowercase alphanumerics: `whoisresponsible`, `foragencyinputs`, `explanation`, `id`.
- **Rows:** only those whose ID matches `/^[a-z]{2,3}-\d+$/` are kept.
- **`writtenAgainst`:** the preamble cells joined with " | ". An Excel date serial after a cell containing "Published Date" becomes `YYYY-MM-DD`. If there is no preamble, use `"Unknown"`.

`guides.json` seeds two tools. Both have section `wog`, `oscalType` `service`, `isSample` false, and approval `{ by: 'GovTech (published Component Guide)', kind: 'govtech-published' }`.

| Tool | File | Description | Source |
|---|---|---|---|
| `websg` / WebSG | `WebSG-LowRiskCloud_2026-06-22.xlsx` | GovTech website builder | WebSG Component Guide, Low-Risk Cloud (published 2026-07-28) |
| `isomer` / Isomer | `Isomer-low-risk-cloud-ssp_06Oct2025_Final.xlsx` | GovTech website builder | Isomer Component Guide, Low-Risk Cloud (baseline 2025-09-17, file dated 6 Oct 2025) |

Seeding applies the suggested mapping.

- [ ] **Step 1: Write the failing tests**
  - `suggestValue`:

    | Owner text | Agency inputs | Expected |
    |---|---|---|
    | `Agency` | | `app-builder` |
    | `N/A` | | `not-applicable` |
    | `WebSG team and agency` | `For agencies to independently assess` | `shared` |
    | `Primarily WebSG team, can be both WebSG team and agency if agency were to conduct their own` | `Not applicable` | `provided` |
    | `WOGAD or Techpass Team` | | `provided` |
    | `Both Agency and Xtremax` | | `shared` |
    | `Xtremax` | | `provided` |

  - Guides: the spec section 10 table. For each file, the counts after the suggested mapping:

    | File | Provided | App Builder | Shared | N/A | Missing keys |
    |---|---|---|---|---|---|
    | WebSG | 99 | 14 | 4 | 0 | `['im8-reform:is-15']` |
    | Isomer | 99 | 15 | 3 | 0 | `['im8-reform:is-15']` |
    | CWP | 81 | 3 | 19 | 5 | 10 keys: ac-13, ac-14, as-13, as-14, as-15, ck-1, ck-2, is-7, is-15, lm-19 |

    The FormSG and WebSG DSS files each give 92 `unknownIds`.
  - Isomer's `writtenAgainst` contains `2025-09-17`; WebSG's contains `2026-07-28`.
  - *(Review Focus 5)* Random bytes reject with `code 'not-a-workbook'`. WebSG's file parses from sheet `low-cloud-WebSG`, not `Change or comment`.
  - `buildImportEntries` with a pair left out throws.
- [ ] **Step 2: Run `npx vitest run test/import`.** Expected: FAIL.
- [ ] **Step 3: Implement** the modules, then `/admin/import`:
  1. Upload, then choose an existing or new tool and the profile.
  2. Preview:
     - When there are unknown IDs, show "This guide doesn't match Low-Risk Cloud: N requirement IDs aren't in it (first five…)." and offer no create button.
     - Otherwise show "This guide predates N requirements: …" and a mapping table with a select per pair.
  3. "Create version" makes an unapproved version with `importedFrom`.

  Then seed WebSG and Isomer through `guides.json`.
- [ ] **Step 4: Run the tests and `npm run seed`, then check `/plan`.** WebSG and Isomer appear under "Whole-of-government tools" with "Published by GovTech". Importing the CWP file through `/admin/import` creates an unverified version.
- [ ] **Step 5: Commit** `feat: Component Guide importer; seed WebSG and Isomer`.

### Task 21: Requirement detail view

**Files:**
- Create: `app/plan/item-detail.tsx`
- Modify: `app/plan/plan-item.tsx`

Clicking an item opens a side panel:

- "Official wording": the statement, recommendations, rationale and references from the `ProfileEntry`;
- each claim: tool, `VALUE_LABEL`, explanation, App Builder's part, source and badge.

Builder-screen wording rules still apply: say "Official wording", not "IM8".

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Check in the browser.** as-1 shows the official statement and appCentral's claim "App Builder" with source "AEO TPC slide 12 (28 Oct 2026)". The panel closes with Escape.
- [ ] **Step 3: Commit** `feat: requirement detail view`.

### Task 22: OSCAL downloads

**Files:**
- Create: `lib/export/oscal.ts`, `app/api/export/oscal/route.ts`, `test/helpers/oscal-validate.ts`, `test/fixtures/oscal/oscal_component_schema.json`, `test/fixtures/oscal/oscal_ssp_schema.json`
- Modify: `app/plan/plan-view.tsx`
- Test: `test/export/oscal.test.ts`

**Interfaces:**
- Consumes: `Plan` (Task 5); `VersionPair` (Task 4); `rowVerification`; `resolvePlanRequest` (Task 10).
- Produces:
  - `OSCAL_NS = 'urn:cpfb-build-plan'`
  - `OSCAL_UUID_NAMESPACE = '6b0c1f1e-3c5a-4d1e-9a51-2f4f9c8e7d10'` (UUIDv5 names are built from tool, version and requirement IDs)
  - `buildComponentDefinition(input: { tools: { tool: Tool; pair: VersionPair }[]; profile: Profile; generatedAt: string }): Record<string, unknown>`
  - `buildSsp(input: { plan: Plan; profile: Profile; tools: { tool: Tool; pair: VersionPair }[]; answers: RiskAnswers; project?: { id: string; name: string }; generatedAt: string }): Record<string, unknown>`
  - `GET /api/export/oscal?kind=component-definition|ssp&<plan query>`: returns `application/json` named `component-definition.json` or `ssp.json`.

- [ ] **Step 1: Copy the schemas.** Copy `/private/tmp/claude-503/-Users-tate-Desktop-flashpoint/abc42631-977f-4e02-bf7e-ced157a4ce75/scratchpad/oscal/comp.json` and `ssp.json` to the two fixture paths. If the scratchpad is gone, download `oscal_component_schema.json` and `oscal_ssp_schema.json` from https://github.com/usnistgov/OSCAL/releases/tag/v1.1.2.
- [ ] **Step 2: Write the failing tests** (`oscal-validate.ts`: `new Ajv({ strict: false, allErrors: true })` with ajv-formats)
  1. Both documents for the demo plan pass their schema.
  2. Building twice with the same `generatedAt` gives identical JSON.
  3. as-4 has a by-component for appCentral with state `implemented`.
  4. as-1 has only this-system, with state `planned`.
  5. pm-1 has no `by-components` and remarks starting "Needs assessment:".
  6. Every custom prop uses `ns: 'urn:cpfb-build-plan'`.
  7. The back-matter resource description contains "locally derived".
- [ ] **Step 3: Run `npx vitest run test/export/oscal.test.ts`.** Expected: FAIL.
- [ ] **Step 4: Implement** per spec 9.3. On `/plan`, add a small "For security reviewers: machine-readable files" disclosure with the two downloads (no "OSCAL" in the visible text).
- [ ] **Step 5: Run it again.** Expected: pass. If ajv rejects a schema pattern, record the pattern and the workaround in the test helper.
- [ ] **Step 6: Commit** `feat: OSCAL component definition and SSP downloads`.

### Task 23: Libraries as tools

**Files:**
- Create: `data/seed/libraries.json`
- Modify: `data/seed/tools.json`
- Test: extend `test/data/seed-documents.test.ts` and `test/export/build-plan-md.test.ts`

Both libraries have section `code`, `oscalType` `software`, `isSample` true, no approval, and source `Sample, not confirmed by a CPFB team`.

| Tool | Row | builderPart | explanation |
|---|---|---|---|
| `zod` / Zod | as-1 shared | Define a Zod schema for every input and parse it before use. | Zod checks data against a schema you define. |
| `prisma` / Prisma | as-2 shared | Use Prisma's query API instead of building SQL strings, and don't use `$queryRawUnsafe`. | Prisma's query API sends parameterised queries. |

- [ ] **Step 1: Write the failing tests**
  - With the real seed and appCentral + Zod, as-1 is `you/shared`, and `BUILD-PLAN.md` contains "Define a Zod schema".
  - With appCentral alone, it contains no "Zod".
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Add the JSON.** The picker's "Code components" section now appears.
- [ ] **Step 4: Run them.** Expected: pass.
- [ ] **Step 5: Commit** `content: Zod and Prisma as sample code components`.

### Task 24: Versions in exports

**Files:**
- Create: `lib/export/about.ts`
- Modify: `lib/export/ssp-xlsx.ts`, `lib/export/build-plan-md.ts`, `lib/export/plan-request.ts`
- Test: extend `test/export/ssp-xlsx.test.ts` and `test/export/build-plan-md.test.ts`

**Interfaces:**
- Produces:
  - `interface AboutInfo { generatedAt: string; projectName?: string; appType: string; profile: { title: string; version: string }; tools: { name: string; version: number; verification: Verification }[] }`
  - `buildAboutInfo(meta: BuildPlanMeta, profile: Profile, projectName?: string): AboutInfo`
  - The `fillSspWorkbook` option `about?: AboutInfo` writes a worksheet "About this file":
    - one label/value row per field;
    - one row per tool, like `appCentral | v1 | Verified`;
    - two fixed rows: the locally derived label from Global Constraints, and "Statuses are self-declared by the app builder."
  - The `BUILD-PLAN.md` tools line includes versions, e.g. `appCentral v1 (verified)`.

- [ ] **Step 1: Write the failing tests**
  - The workbook has a sheet "About this file" containing the row `appCentral | v1 | Verified` and both fixed lines.
  - The Markdown header contains `appCentral v1 (verified)`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Pass `about` from the ssp route.
- [ ] **Step 4: Run them.** Expected: pass.
- [ ] **Step 5: Commit** `feat: tool and profile versions in exports`.

### Task 25: Demo path smoke test and run-through

**Files:**
- Create: `playwright.config.ts`, `e2e/demo.spec.ts`, `docs/run-through.md`

- [ ] **Step 1: Install Playwright.** Run `npm install -D @playwright/test@1.64.1 && npx playwright install chromium`. Add the script `"e2e": "playwright test"`. Configure `webServer` to run `npm run build && npm start` on port 3000.
- [ ] **Step 2: Write the test**
  1. POST `/api/reset`.
  2. On `/start`, choose Restricted, Sensitive Normal, Slight and None or minimal, and submit. Expect "Low-risk app on the cloud".
  3. Click "See your build plan", then pick appCentral, DBaaS and IGA. Expect "What you need to do" with count 11.
  4. Untick DBaaS. Expect the text "appCentral expects DBaaS for 4 requirements".
  5. Download the build plan. Expect it to contain `## 1. What you need to do (11)`.
  6. Download the spreadsheet. Expect a file named `low-risk-cloud-ssp.xlsx`.
- [ ] **Step 3: Run `npm run e2e`.** Expected: 1 passed.
- [ ] **Step 4: Write `docs/run-through.md`:** the five demo moments from the scope note, each with the clicks and the numbers to expect (11 / 66 / 9 / 32; 13 after unticking DBaaS; the moment 4 cells from Task 18; the moment 5 badge flip from Task 17). Then do one full run-through and note anything that differed.
- [ ] **Step 5: Commit** `test: demo path smoke test and run-through script`.
