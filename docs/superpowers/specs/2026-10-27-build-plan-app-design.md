# Build plan app: technical design

Written 2026-10-27 by the App planning session, after a design review with the user. It describes how to build the app.

[2026-10-27-demo-scope-design.md](2026-10-27-demo-scope-design.md) remains the authority on what the demo must prove and on what is Must, Should and Cut. Where the two documents disagree on scope, the scope note wins.

## 1. Summary

App builders answer a few risk questions and pick the CPF tools they will use. They then get a build plan: what they need to do, what their platform already does, what they still need to find out, and what is good to have. From it they download:

- a `BUILD-PLAN.md` for their coding agent, and
- the real Low-Risk Cloud security review spreadsheet, pre-filled.

Platform admins record what each tool covers, and a verifier approves it. Underneath, everything is stored as plain records and turned into OSCAL 1.1.2 on export.

Constraints:

- Demo on 2026-11-17; Friday 2026-10-30 is a target.
- Everything runs locally, including the live demo.
- There is no login; a role switcher stands in for it.
- Builder screens use builder language only (see the scope note's language rule).

## 2. Decisions made while writing this spec

These fill gaps the design review left open. Check them when you review this spec.

1. **Badges are per row, not per tool.** A coverage row counts as verified when it is identical to the same row in the tool's last approved version. If an admin edits one row, only that row shows "Not yet verified". This lets demo moment 5 flip a single badge.
2. **"Not applicable" against any other claim goes to Questions to answer.** This applies whether the other claim is Provided, Shared or App Builder, not only Provided.
3. **Level 2 requirements all sit under Good to have, with a sub-label** ("Handled for you", "Yours if you want it", and so on). The three main headings and their counts cover Levels 0 and 1 only, so the 86 headline holds. `BUILD-PLAN.md` leaves Level 2 out.
4. **Answering "Applies" turns a question into a task.** The item moves to What you need to do with status To do. Answering "Doesn't apply" keeps it under Questions as answered and exports N/A with the reason.
5. **Shared items export Partial until the builder marks their part Done.** Done exports Y.
6. **appCentral's seed rows follow slide 12 literally:**
   - 42 Provided.
   - 9 Not applicable (IS, no hosts).
   - 11 App Builder.
   - 4 Handled by another tool: DBaaS (DP).
   - 11 Handled by another tool: IGA (AC).
   - Nothing for PM 1–6, is-11, is-14 and is-15.

   The per-requirement default ("if no tool covers this, it's the App Builder's") is seeded with the same 11, so they stay with the builder even when appCentral isn't picked.
7. **OSCAL files point to the Low-Risk Cloud profile through a back-matter resource** that says the profile is locally derived. They do not link to GovTech's published profile JSON, which lacks as-15 and is-15.
8. **Picking genCentral turns on the GenAI requirements.** This is done through a flag on the tool. genCentral has no coverage, so with nothing else covering them, all 8 GenAI requirements land in Questions.

## 3. Concepts

| Term | Meaning | Example |
|---|---|---|
| Catalog | The full list of requirements and their official wording | IM8 Reform (149 controls in `im8-lite-catalog.xlsx`), GenAI (8) |
| Profile | A selection from a catalog for one type of system: which requirements, at which level, with what wording and parameter defaults | Low-Risk Cloud (118 from IM8 Reform), Generative AI (8) |
| Requirement key | `catalogId:requirementId`, used everywhere so catalogs can't collide | `im8-reform:as-1`, `genai:ga-3` |
| Tool | Anything a builder can pick: a platform, a central service, a library | appCentral, DBaaS, IGA, WebSG, Zod |
| Tool version | One saved, numbered set of coverage rows for one tool and one profile. Each save makes a new one | appCentral v1 for Low-Risk Cloud |
| Coverage row | What one tool version says about one requirement | as-4: Provided by appCentral |
| Plan | The result of sorting a profile's requirements for a set of picked tools | |
| Project | A saved plan: risk answers, picks, and the builder's statuses | |

**Coverage values.** These are GovTech's Component Guide values, with "App Builder" in place of "Agency", plus one extra (Q38).

| Stored value | Admin and export label | Builder sees |
|---|---|---|
| `provided` | Provided by <tool> | What your platform already does → Handled for you |
| `shared` | Shared (<tool> + App Builder) | What you need to do, with the platform's part shown |
| `app-builder` | App Builder | What you need to do, with the tool's tip |
| `not-applicable` | Not applicable | What your platform already does → Doesn't apply because of your tools |
| `other-tool` | Handled by another tool: <tool> | Decided by that other tool if picked; otherwise Questions to answer |

## 4. Architecture

```
Browser                                   Next.js server                      MongoDB (Docker)
───────                                   ──────────────                      ────────────────
/start  (risk questions)
   │ answers in the URL
   ▼
/plan  ── plan engine (client) ◀── profile + picked tools' versions ◀── repos ◀── catalogs, profiles,
   │       live counts                                                            tools, toolVersions,
   │ "Save this plan"                                                             projects
   ▼
/projects/[id] ── statuses (server actions) ──────────────────────────▶ projects
   │
   └── downloads ──▶ route handlers ── plan engine (server) ──▶ BUILD-PLAN.md, spreadsheet, OSCAL

/admin, /admin/import ── server actions ──▶ new tool version (not yet verified)
/verify             ── server actions ──▶ approve latest version
```

Stack:

- Next.js with the App Router and TypeScript. Pin the current stable version at setup.
- MongoDB in Docker Compose, using the official driver with no ODM.
- exceljs for spreadsheets.
- zod for parsing URL state and form input.
- ajv and ajv-formats for OSCAL schema checks in tests.
- Vitest for tests.
- Tailwind for styling.
- Node: the installed v25 should work. If tooling misbehaves, switch to the current LTS.

Module layout:

```
app/
  start/page.tsx                 Tell us about your app
  plan/page.tsx                  Your build plan (unsaved, state in URL)
  projects/page.tsx              Saved projects list
  projects/[id]/page.tsx         Saved plan with statuses
  admin/page.tsx                 Tools list
  admin/tools/[toolId]/page.tsx  Coverage editor
  admin/import/page.tsx          Import a Component Guide (Should)
  verify/page.tsx                Versions waiting for approval
  verify/[toolId]/page.tsx       Changes since last approval + Approve
  api/export/build-plan/route.ts
  api/export/ssp/route.ts
  api/export/oscal/route.ts      (Should)
  api/reset/route.ts
lib/
  domain/types.ts                Shared types (no imports from data/ or next/)
  risk/assess.ts                 Pure: answers → app type and reasons
  plan/engine.ts                 Pure: buildPlan()
  plan/verification.ts           Pure: per-row verified status
  export/ssp-values.ts           Pure: plan item → Implemented + Explanation
  export/build-plan-md.ts        Pure: plan → Markdown
  export/ssp-xlsx.ts             Server: fills the template with exceljs
  export/oscal.ts                Pure: plan and tool versions → OSCAL objects (Should)
  import/parse-guide.ts          Component Guide workbook → rows (Should)
  import/suggest.ts              Pure: owner text → suggested coverage value (Should)
  data/db.ts                     Mongo client (single instance)
  data/repos/*.ts                One file per collection
  data/load-sources.ts           Reads the source files into records (used by seed)
  role.ts                        Role cookie helpers
scripts/seed.ts                  Drop and reload everything; also behind "Reset demo data"
data/source/                     im8-reform.json, im8-lite-catalog.xlsx, low-risk-cloud-ssp.xlsx, gen-ai-catalog.xlsx
data/guides/                     The GovTech Component Guide files
data/seed/                       Hand-entered JSON (see 5.3)
data/plain-language/             low-risk-cloud.json, generative-ai.json
test/                            Vitest tests and fixtures, including the NIST OSCAL 1.1.2 schemas
docker-compose.yml
```

The pure modules in `lib/` have no database or framework imports. The browser and the server run the same plan engine, so the live counts and the downloads always agree.

## 5. Data

### 5.1 Source files

| File | Loads into | Notes |
|---|---|---|
| `im8-lite-catalog.xlsx` | Catalog `im8-reform`: 149 requirements with title, statement, recommendations, rationale, references, last modified | Newest catalog wording |
| `im8-reform.json` | Family titles (OSCAL groups), e.g. "as" → Application Security | Used only for names. The JSON is older (137 controls) |
| `low-risk-cloud-ssp.xlsx` | Profile `low-risk-cloud`: 118 entries with level and the profile's own wording. Also the export template | Authoritative for Low-Risk Cloud. Its statements differ from the lite catalog in 26 rows, and the profile wording wins. Parameters appear inline, e.g. `[pm-2_prm_1: default = System Owner]`. Header in row 1, data in rows 2–119, columns A–I |
| `gen-ai-catalog.xlsx` | Catalog `genai` (8) and profile `generative-ai`: ga-1..4 at Level 0, ga-5..8 at Level 1 | Should |
| `data/guides/*.xlsx` | WebSG and Isomer tool versions, through the importer | Should. CWP and FormSG DSS are test files only |

The loader rejects the seed when a profile entry names a requirement its catalog doesn't have. It never drops or rewords a requirement silently.

The catalog and profiles are labelled "Locally derived from GovTech files received 2026-10-22; not an official GovTech release". The Low-Risk Cloud profile's version is `2026-10-22 (local copy)`.

### 5.2 Collections

```ts
type RequirementKey = `${string}:${string}`;            // "im8-reform:as-1"

catalogs      { _id: "im8-reform", title, version, sourceFile, derived: true }

requirements  { _id: RequirementKey, catalogId, id: "as-1", family: "as",
                title, statement, recommendations, rationale, references, lastModified? }

profiles      { _id: "low-risk-cloud", title: "Low-Risk Cloud",
                plainTitle: "Low-risk app on the cloud", version, sourceFile,
                entries: [{ key: RequirementKey, level: 0 | 1 | 2,
                            statement, recommendations, rationale, references,   // profile wording
                            ifUncovered: "app-builder" | "ask",                  // the per-requirement default
                            plain?: { title, task, why } }] }                    // plain-language overlay

tools         { _id: "appcentral", name, description,
                section: "cpf" | "wog" | "code",        // CPF tools / Whole-of-government tools / Code components
                oscalType: "service" | "software",
                isSample: boolean,                      // labelled "Sample" in the picker
                activatesProfiles?: ["generative-ai"] } // genCentral

toolVersions  { _id, toolId, profileId, version: number,           // unique (toolId, profileId, version)
                writtenAgainst: string,                 // profile version or guide baseline, e.g. "Baseline 2025-09-17"
                source: string,                         // required, e.g. "AEO TPC slide 12 (28 Oct 2026)"
                changeNote?: string,                    // "What changed"
                createdAt, createdByRole: "admin" | "seed",
                approval?: { at, by: string, kind: "verifier" | "govtech-published" },
                importedFrom?: { fileName, missingKeys: RequirementKey[] },
                entries: [{ key: RequirementKey,
                            value: "provided" | "shared" | "app-builder" | "not-applicable" | "other-tool",
                            otherToolId?: string,       // required when value is "other-tool"
                            explanation?: string,       // how the tool handles it (encouraged, not required)
                            builderPart?: string,       // the builder's part, for shared and app-builder
                            source?: string,            // overrides the version's source
                            originalText?: string }] }  // imported "Who is responsible?" text

projects      { _id, name, ownerName, riskAnswers, toolIds: string[],
                taskStatus: { [key]: { status: "todo" | "in-progress" | "done", note? } },
                questionAnswers: { [key]: { applies: boolean, reason } },
                createdAt, updatedAt }
```

A tool's **current version** for a profile is the one with the highest version number. Builders always see the current version, and unverified rows carry a badge (per-row rule in 6.3).

The plain-language overlay lives in `data/plain-language/*.json` as `{ "as-1": { "title", "task", "why" } }`, and the seed copies it into the profile entries. If an entry is missing, the screens fall back to the official title and the Risk/Rationale text, so the app works before the drafts are finished. Claude drafts all 118 entries. The user reviews the 20 that builders act on, by Thursday midday.

### 5.3 Seed data

All seed data lives in `data/seed/` as JSON, so the user can read and correct it.

| Seed | Content | Status |
|---|---|---|
| `defaults.json` | `ifUncovered: "app-builder"` for as-1, 2, 3, 7, 9; sc-4, 6; st-4, 5; cs-3, 4. Everything else is `"ask"` | Labelled starting values |
| `appcentral-slide12.json` | appCentral v1, as listed in decision 6. Families: AS platform 4, 5, 6, 8, 11, 15 / builder 1, 2, 3, 7, 9; SC platform 1, 3, 5 / builder 4, 6; ST platform 1, 2, 3 / builder 4, 5; CS platform 7, 9, 10 / builder 3, 4; all Level 0/1 NS, BR, LM, SD provided; IS 1–7, 9, 10 not applicable ("appCentral does not have hosts (EC2)"); DP → DBaaS; AC → IGA | Approved, by "AEO TPC slide 12 (28 Oct 2026)" |
| `dbaas-iga-slide12.json` | DBaaS v1: dp-1..4 provided. IGA v1: ac-1..9, 12, 14 provided. Source: "AEO TPC slide 12 (appCentral's view; not confirmed by the team)" | Not yet verified |
| `extra-tools.json` | The 3–5 CPF tools the user sends on Wednesday, plus genCentral (no rows, activates GenAI) | Sample, not yet verified |
| `libraries.json` | Zod (as-1 shared: "Define a Zod schema for every input and parse before use") and Prisma (as-2 shared). In the "Code components" section | Should. Sample, not yet verified |
| WebSG, Isomer | Imported from `data/guides/` with the suggested mappings (section 10). Sources: "WebSG Component Guide, Low-Risk Cloud (published 2026-07-28)" and "Isomer Component Guide, Low-Risk Cloud (baseline 2025-09-17, file dated 6 Oct 2025)" | Should. Approved, kind `govtech-published` |
| `projects.json` | The two-weeks-later project: the same risk answers and picks as the live demo, most tasks Done, all questions answered | Should. The scope note's "7 of 11" is rechecked against this seed |

## 6. Plan engine

### 6.1 Input and output

```ts
buildPlan({
  profiles: Profile[],                  // low-risk-cloud, plus generative-ai if a picked tool activates it
  pickedTools: Tool[],
  versions: { current: ToolVersion, lastApproved?: ToolVersion }[],   // per picked tool and profile
  project?: Pick<Project, "taskStatus" | "questionAnswers">,
}): Plan

type Heading = "you" | "platform" | "questions" | "good-to-have";
type Placement =
  | "provided" | "not-applicable"                                  // platform
  | "shared" | "app-builder" | "default-builder" | "answered-applies"  // you
  | "redirect" | "conflict" | "open" | "answered-not-applicable";  // questions

type PlanItem = {
  key: RequirementKey; level: 0 | 1 | 2;
  heading: Heading; placement: Placement;
  claims: Claim[];          // every picked tool's row for this requirement, kept even when outranked
  decisive: Claim[];        // the claims that set the placement
  reason: string;           // one plain sentence, e.g. "appCentral expects DBaaS to handle this."
  status?: { status, note? } | { applies, reason };
};
type Claim = { toolId, toolName, value, otherToolId?, explanation?, builderPart?, source,
               verification: "verified" | "govtech-published" | "not-yet-verified" };
type Plan = { items: PlanItem[]; counts: Record<Heading, number>; hints: ToolHint[] };
type ToolHint = { fromToolId, suggestToolId, count };   // "appCentral expects DBaaS for 4 requirements. Add DBaaS?"
```

### 6.2 Sorting rules

The rules run once per requirement in the active profiles, top to bottom. The first rule that matches wins.

1. **Collect claims:** each picked tool's current-version row for this requirement.
2. **Resolve redirects.** An `other-tool` claim pointing to a picked tool is set aside, and that tool's own claim decides. One pointing to a tool that isn't picked becomes an *open redirect*.
3. **Conflict.** A `not-applicable` claim together with any `provided`, `shared` or `app-builder` claim gives **questions / conflict**. Both statements are shown.
4. Any `provided` gives **platform / provided**.
5. Any `not-applicable` gives **platform / not-applicable**.
6. Any `shared` gives **you / shared**. The task is the builder's part, and the platform's part is shown.
7. Any `app-builder` gives **you / app-builder**. The tool's tip is shown.
8. Any open redirect gives **questions / redirect**, with the reason "<tool> expects <other tool> to handle this. Are you using <other tool>, or handling it yourself?". It also adds a tool hint.
9. `ifUncovered` is `app-builder`: **you / default-builder** ("No tool you picked covers this").
10. Otherwise: **questions / open** ("Depends on your app, and no tool you picked covers it").

After sorting:

- **Level 2:** the heading becomes `good-to-have` and the placement stays as a sub-label.
- **Project overlay:**
  - A `questions` item answered "Applies" becomes **you / answered-applies**, with its own status.
  - A `questions` item answered "Doesn't apply" becomes **questions / answered-not-applicable**.
  - Statuses are keyed by requirement and kept when an item moves. They are shown only where they apply.

Rules 4–7 put the strongest coverage first: provided, then not applicable, then shared, then App Builder.

Invariant: every active requirement appears exactly once. The engine throws in development if not, and tests check it.

### 6.3 Verification per row

For a claim from tool T:

- **verified:** T has an approved version, and this row matches the same requirement's row in T's last approved version. The comparison covers value, other tool, explanation and builder's part.
- **govtech-published:** the same, but the approval kind is `govtech-published`. The badge reads "Published by GovTech".
- **not-yet-verified:** anything else. That includes a tool that has never been approved, and any row that is new or changed since the last approval.

An item shows "Not yet verified" when any of its decisive claims is unverified. Tools marked as samples also show a "Sample" tag in the picker.

### 6.4 Headline tests

These use the seeded Low-Risk Cloud data and count Level 0/1 only:

| Picked | Platform: provided | Platform: N/A | You | Questions | Total |
|---|---|---|---|---|---|
| appCentral, DBaaS, IGA | 57 (42 verified + 15 not yet verified) | 9 | 11 | 9 (open: pm-1..6, is-11, is-14, is-15) | 86 |
| appCentral only | 42 | 9 | 11 | 24 (9 open + 15 redirect) | 86 |
| Nothing | 0 | 0 | 11 (default-builder) | 75 | 86 |

## 7. Builder screens

**`/start`: Tell us about your app.** Four questions plus two tick boxes, laid out as one short form:

| Question | Options |
|---|---|
| What's the highest classification of data the app handles? | The classification values from the user's risk table, including Official (Open), Official (Closed), Restricted, Confidential (Cloud Eligible), Confidential, S-class |
| How sensitive is it? | Non-Sensitive, Sensitive Normal, Sensitive High |
| If the app failed or leaked, what's the worst impact in any area? | No impact, Slight, Moderate, Significant, Critical |
| What's the impact on systems that depend on it? | None or minimal, Significant |
| Tick boxes | The system is CII / The system is SII |

`assessRisk()` applies the user's table:

- **High:** Critical, CII or S-class.
- **Medium (otherwise):** Moderate or Significant, SII, either Confidential, Sensitive High, or significant downstream impact.
- **Low:** everything else.

The result shows the app type in plain words, lists each answer that decided it, and cites https://docs.standards.tech.gov.sg/risk-materiality-level/. Low continues to `/plan` as "Low-risk app on the cloud". Medium and High show the type, the reason, and "not yet supported". Cloud is assumed.

**`/plan`: Your build plan.**

- **URL state:** answers and picks live in the URL, e.g. `/plan?c=restricted&s=sn&i=slight&d=min&t=appcentral,dbaas,iga`, parsed with zod. Invalid state sends the builder back to `/start`.
- **Left: the tool picker.** Tools are grouped by section (CPF tools, Whole-of-government tools, and Code components as a Should). Each shows its badge and any hints, e.g. "appCentral expects DBaaS for 4 requirements. Add DBaaS?".
- **Right: the four headings with live counts.** Each item shows its plain title, why it matters, the reason it's there, and its badges. The control ID is secondary.
- **Top:** the downloads ("Build plan for your agent" and "Security review spreadsheet") and "Save this plan".
- **Detail view (Should):** the official statement, recommendations, rationale, references, and every claim with its source.

**`/projects` and `/projects/[id]`: saved projects (top Should).**

- "Save this plan" asks for a project name and an owner name, with no login and one shared list.
- The project page is the plan page with controls on each item:
  - Tasks: To do / In progress / Done, plus a note.
  - Questions: Applies / Doesn't apply, plus a reason.
- Changes autosave through server actions. Picks can be changed on the project page.
- Each time a project opens, it is re-sorted from the current coverage, so a verifier's approval reaches existing projects straight away.
- No version history.

## 8. Admin and verifier

**Role switcher.** A header control sets a `role` cookie: builder, admin or verifier. Admin and verifier pages ask you to switch roles if the cookie doesn't match. This is not security. The header also has **Reset demo data**, which asks for confirmation, re-runs the seed, and returns to `/start`.

**`/admin`** lists the tools with their current version, the badge state and the date. It also has "New tool" (name, description, section, sample flag) and "Import a Component Guide" (Should).

**`/admin/tools/[toolId]`** is the coverage editor for one tool and profile. A profile picker appears when a tool has versions for more than one profile. The editor shows one table row per profile requirement:

- ID and official title
- Who handles it (the five values; Handled by another tool also asks which tool)
- Explanation
- App Builder's part (for Shared and App Builder)
- Source (defaults to the version's source)

Filters: family, level, and "rows with coverage only". Edits stay local until **Save new version**, which asks for the version's source (required) and an optional "What changed" note. Saving creates version n+1, which is not yet verified. The save is rejected if any row lacks a source or an `other-tool` row has no tool.

**`/verify`** lists the tools whose current version isn't approved. **`/verify/[toolId]`** shows:

- the "What changed" note
- the rows added, changed or removed since the last approved version, side by side
- **Approve**

Approve applies only to the current version. If a newer version appeared meanwhile, the approval is refused with "A newer version exists".

## 9. Exports

Every export runs the same `buildPlan()` on the server. Without a saved project, every task counts as To do and every question as unanswered.

### 9.1 `BUILD-PLAN.md`

The file is stack-neutral, in plain language, with control IDs as secondary detail. It names a library only when that library was picked: the library's builder's part supplies the wording.

```md
# Build plan: <project name, or "Your app">

App type: Low-risk app on the cloud (IM8 Low-Risk Cloud).
Tools: appCentral (verified), DBaaS (not yet verified), IGA (not yet verified).
Generated <date> by the CPFB build plan app. IDs in brackets are IM8 requirement IDs.

## How to use this plan
- Section 1 is required work. When you finish an item, mention its ID in the commit or PR description.
- Before building anything section 2 asks about, ask the person you're working with.
- Never build what section 3 lists. Use the platform's feature instead.

## 1. What you need to do (11)
### Check every input before using it (as-1)
Why it matters: <plain why>
What to do: <builder's part, or the plain task>
Platform's part: <for shared items>
Status: To do

## 2. Ask a person first (9)
- **<plain question>** (pm-1). Why we ask: <reason>

## 3. Don't build this: your platform already does it (66)
### appCentral
- <plain title> (as-4): <explanation>
### Doesn't apply on your platform
- <plain title> (is-1): appCentral does not have hosts (EC2).
```

Items that aren't verified carry "(not yet verified)". Level 2 items are left out.

The download page also shows a snippet to paste into `AGENTS.md` or `CLAUDE.md`:

```md
## Security build plan
Read BUILD-PLAN.md before writing code. Treat section 1 as required work, ask me before building
anything in section 2, and never build what section 3 lists; use the named platform instead.
```

### 9.2 Security review spreadsheet

exceljs opens `data/source/low-risk-cloud-ssp.xlsx`, finds each row by the ID in column A, and writes only **H (Implemented)** and **I (Explanation)**. Every other cell, style and width stays as it was. Saved as `low-risk-cloud-ssp.xlsx`, or `low-risk-cloud-ssp-<project-slug>.xlsx` for a project.

| Placement | Builder status | Implemented | Explanation |
|---|---|---|---|
| provided | | Y | `Provided by <tool>: <explanation>. Source: <source>.` |
| not-applicable | | N/A | `Not applicable when using <tool>: <explanation>. Source: <source>.` |
| shared | To do, In progress | Partial | `Shared. <tool>: <explanation>. App builder: <part>. Status: <status> (self-declared). <note>. Source: <source>.` |
| shared | Done | Y | as above |
| app-builder, default-builder, answered-applies | To do / In progress / Done | N / Partial / Y | `App builder's responsibility. <tip>. Status: <status> (self-declared). <note>.` |
| answered-not-applicable | | N/A | `Does not apply (self-declared): <reason>.` |
| open, redirect, conflict | | blank | blank |

- When there are several claims, they are joined with "; ".
- `[Not yet verified] ` goes before the text of any unverified claim.
- Level 2 rows follow the same table.
- GenAI (Should) adds a `genai` worksheet with the template's columns, built from `gen-ai-catalog.xlsx`.
- Versions in exports (Should) adds an "About this file" worksheet with:
  - the generation date
  - the project and app type
  - the profile and its version
  - each tool, with its version and verification state
  - the locally-derived note
  - "statuses are self-declared"

### 9.3 OSCAL (Should)

`lib/export/oscal.ts` builds plain objects. A test validates them against the NIST OSCAL 1.1.2 JSON schemas, which are kept in `test/fixtures/oscal/`. There are two JSON downloads: one component definition holding a component for each picked tool, and one SSP.

UUIDs are UUIDv5 values derived from stable inputs (tool, version and requirement), so the same data always produces the same file. Custom props use the namespace `urn:cpfb-build-plan`.

**Component definition:**

- One `defined-component`: type `service` for platforms, `software` for libraries.
- `control-implementations[0].source` is `#<uuid>` of a back-matter resource describing the locally derived Low-Risk Cloud profile.
- Each coverage row becomes an `implemented-requirement` with:
  - `description`: the explanation, or "Provided by <tool>" when there is none
  - props `responsibility` (the stored value), `verification` and `source`
  - prop `handled-by` for redirects
  - `remarks`: the builder's part

**SSP:**

- `import-profile.href` points to the same back-matter resource.
- `system-characteristics`:
  - the project's ID and name
  - one information type describing the classification and sensitivity answers
  - `status: under-development`
  - an authorization boundary described as the app built on the picked tools
- `system-implementation`: an "App builder" user, a `this-system` component, and one component per picked tool.
- One `implemented-requirement` per active requirement, with `by-components`:

| Placement | `by-components` |
|---|---|
| provided | tool: `implemented` |
| not-applicable | tool: `not-applicable` |
| shared | tool: `implemented`, plus this-system: `planned`, `partial` or `implemented` by status |
| builder placements | this-system only, with the same status mapping |
| questions | none, with remarks "Needs assessment: <reason>" |

## 10. Component Guide importer (Should)

On `/admin/import`, the admin uploads an `.xlsx` file and picks a tool (existing or new) and a profile. The importer then works like this:

1. **Find the header row:** the first row with a cell equal to "ID". Guides put it at row 1, 2 or 4, with preamble above and summary or legend rows below.
2. **Match columns by normalised name.** "Who is responsible?" and "Who is Responsible?" are the same column; "Explanation" and "For Agency Inputs" are optional. The guide's own copies of the Title and Statement are ignored, because the profile's wording is used.
3. **Keep only rows whose ID looks like a requirement ID.**
4. **Reject the import when any ID is not in the chosen profile,** and list those IDs. The FormSG and WebSG DSS guides are rejected for Low-Risk Cloud. Reject it too when no header row is found.
5. **Record the requirements the guide predates** (profile IDs missing from the file) in `importedFrom.missingKeys`. Show them as "This guide predates N requirements: …". Missing rows get no coverage; they never count as provided.
6. **Read responsibility only from "Who is responsible?".** In "For Agency Inputs", "Not applicable" means *the agency doesn't need to do anything*, not *the requirement doesn't apply*. That column is only used as a hint in step 7.
7. **Show each distinct (owner text, agency-inputs text) pair once,** with a suggested value the admin can change (`lib/import/suggest.ts`):

   | Owner text | Suggested value |
   |---|---|
   | "Agency" | App Builder |
   | "N/A" or "Not applicable" | Not applicable |
   | Mentions the agency and someone else | Shared, unless agency inputs says "Not applicable", in which case Provided |
   | Anything else (the product team, a vendor, another team such as "WOGAD or Techpass Team") | Provided |

8. **Create the version.** The original owner text goes in `originalText`. The guide's Explanation goes in `builderPart` for App Builder rows and in `explanation` otherwise. The preamble (for example "Baseline SSP Published Date") becomes `writtenAgainst` when it's present. The new version is not yet verified.

Expected results from the real files (these are tests):

| File | Rows | Provided | App Builder | Shared | N/A | Notes |
|---|---|---|---|---|---|---|
| WebSG Low-Risk Cloud | 117 | 99 | 14 | 4 | 0 | Matches WebSG's own summary (99 / 18). Predates is-15 |
| Isomer Low-Risk Cloud | 117 | 99 | 15 | 3 | 0 | Matches Isomer's own summary (99 / 18). Predates is-15 |
| CWP v1.2 | 108 | 81 | 3 | 19 | 5 | Predates 10 requirements. Test file only |
| FormSG DSS, WebSG DSS | 92 | | | | | Rejected: no IDs are in Low-Risk Cloud |

Exporting a tool as a Component Guide is roadmap.

## 11. Error handling

| Situation | Behaviour |
|---|---|
| MongoDB isn't running | Pages show "The database isn't running. Start it with `docker compose up -d`." |
| Seed or source data names an unknown requirement | The seed fails, naming the file and ID |
| Plan invariant broken | Throws in development; tests cover it |
| A template row is missing for a requirement | The spreadsheet export fails and names the ID; a test checks that all 118 are found |
| Invalid URL state | Back to `/start` |
| Admin save without a source, or an `other-tool` row without a tool | Save rejected with the row highlighted |
| Approving a version that is no longer current | Refused with "A newer version exists" |
| Two saves at once | A unique index on (toolId, profileId, version); retry once with the next number |
| Import rejected | A message listing the unknown IDs, or saying no header row was found |

## 12. Testing

Vitest, using the real files in `data/`.

- **Plan engine:**
  - the three headline cases in 6.4
  - each sorting rule on its own: conflict, redirect to a picked or unpicked tool, shared, App Builder, default, Level 2, "Applies" and "Doesn't apply"
  - the invariant
- **Verification:** an unchanged row is verified; an edited row isn't; a removed row disappears; GovTech-published rows get their own badge.
- **Risk:** one case per row of the user's table, plus boundary cases (Slight vs Moderate, SII alone, Sensitive High alone).
- **Spreadsheet:**
  - every row of the value table in 9.2
  - a round trip: fill the template, read it back, check H and I, and check that columns A–G are byte-for-byte unchanged
- **`BUILD-PLAN.md`:** a snapshot for the main demo case, plus a check that a library is named only when it was picked.
- **Importer:** the table in section 10.
- **OSCAL:** generated documents for the demo case pass the NIST schemas, using ajv with `strict: false` and ajv-formats. The schemas use Unicode regex classes, so check ajv's `unicodeRegExp` setting at setup.
- **Demo path (Should):** one Playwright smoke test of start → plan → toggle DBaaS → download both files. Besides that, a full manual run-through on Friday.

## 13. Build order

| Day | Work | Tier |
|---|---|---|
| Tue | Scaffold, Docker Compose, move the source files into `data/`, loaders and seed, plan engine with the 6.4 tests | Must |
| Wed | `/start` with `assessRisk()`, `/plan` with the picker, headings, counts and badges, `BUILD-PLAN.md`, plain-language drafts. *The user sends the extra tools* | Must |
| Thu | Spreadsheet export, coverage editor, save version, verifier, role switcher, Reset demo data. *The user reviews the 20 plain-language items* | Must |
| Fri | Saved projects with the time-skip seed, then in order: GenAI → importer with the WebSG and Isomer seed → detail view → OSCAL → libraries → versions in exports. One run-through | Should |
| After Fri | Anything that slipped. The user records the agent clip, writes the slides and rehearses | |

## 14. Not in this build

- Login and appCentral deployment.
- Other app types' requirement lists, and DSS (Q39: roadmap).
- Bulk editing by family and a conditions field. Conditional guide rows ("for static sites…, for dynamic sites…") are kept as text in the explanation instead.
- Project version history and the mapping-change banner.
- Exporting Component Guides.
- An agent checking finished code against the plan (roadmap slide).

## 15. Risks and open items

- **The extra CPF tools arrive Wednesday night.** Until then, the picker shows appCentral, DBaaS, IGA and genCentral.
- **The risk table's source page needs a TechPass sign-in,** so the five impact-area names are unknown. The single worst-impact question doesn't need them. If the user provides the names, the help text can list them.
- **Option labels on `/start`** (the classification list, and what CII and SII stand for) come from the user's table. Confirm the exact wording when reviewing the screen on Wednesday.
- **exceljs can drop features it doesn't support** when it rewrites a workbook. The round-trip test catches changes to cell content but not to visual details, so open the exported file in Excel once on Thursday.
- **The demo numbers** (86, 11, 9, "7 of 11") must be rechecked against the seed before they go on a slide.
