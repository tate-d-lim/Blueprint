# OSCAL Shared Responsibility, Pipeline-Ready — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The SSP and the component definition use the OSCAL shared-responsibility model, include GenAI, and carry check IDs and an evidence kind, so a SHIP-HATS pipeline can connect later.

**Architecture:** Coverage rows get an optional `checks` list, which goes through seed → versions → plan claims. `lib/export/oscal.ts` changes from "one profile, one by-component per tool" to "many profiles, provided / responsibilities / inherited / satisfied with UUID links". The route passes every profile in use. Nothing runs the checks.

**Tech Stack:** TypeScript, Next.js 16 route handlers, Vitest, ajv with the NIST OSCAL 1.1.2 schemas in `test/fixtures/oscal/`, `uuid` v5.

**Spec:** `docs/superpowers/specs/2026-11-06-oscal-shared-responsibility-design.md`

## Global Constraints

- OSCAL version stays `1.1.2`. Both documents must pass `oscalValidator('component')` / `oscalValidator('ssp')` with zero errors.
- UUIDs stay v5 through `uuid(name)` in `lib/export/oscal.ts`. The same inputs give the same JSON.
- Our props use `OSCAL_NS = 'urn:cpfb-build-plan'`. oscal-compass props use `COMPASS_NS = 'http://oscal-compass.github.io/compliance-trestle/schemas/oscal/cd'`. The C2P Kyverno sample uses `…/cd/ibmcloud`, and C2P matches these props by name. Record this in a code comment.
- The only core-namespace prop (no `ns`) is `leveraged-authorization-uuid`.
- Keep the `responsibility` prop on component-definition rows. `parse-agent-oscal.ts` and `coverage-brief-md.ts` do not change.
- No change to `BUILD-PLAN.md` output, the spreadsheet, or builder screens. Exception: SHIP-HATS shows in the tool picker because it is seed data.
- Sample text is fixed by the spec (section E and the Zod/Prisma checks). Copy it exactly.
- Run the tests with `npm test`. Run the integration tests with `npm run test:int` (Mongo on 127.0.0.1:27017). Run `npx tsc --noEmit` and `npm run lint` before each commit.

## Review Focus

1. **A picked tool with no coverage for any profile in use** (genCentral). Today the route drops it from the SSP. Expected: it is still an SSP component, with no by-components and no leveraged authorization. It is not in the component definition. → test in Task 5.
2. **Two tools decide one shared item.** Note: appCentral + SHIP-HATS on sd-4 is not such a case (provided outranks shared; only appCentral decides). Use two tools that both say `shared`. Expected: two P/R pairs, and this-system has two `inherited` and two `satisfied` entries, each linking to its own tool. → test in Task 6.
3. **A shared claim with no `builderPart` and no plain task.** Expected: the R description falls back to the requirement title and is never empty. An empty `description` fails the schema. → test in Task 6.
4. **The current version is not approved, but an older one is.** Expected: no leveraged authorization. The rule uses `pair.current.approval`, not `lastApproved`. → test in Task 5.
5. **A new version saved from the editor or the agent upload.** Expected: the rows keep their checks. A row that is now blank keeps none. → test in Task 1.

---

### Task 1: Checks and evidence in the domain and in version saving

**Files:**
- Modify: `lib/domain/types.ts` (add types; `CoverageEntry.checks`; `Project.taskStatus` value type)
- Modify: `lib/plan/verification.ts` (`sameCoverage`)
- Modify: `lib/admin/new-version.ts` (`DraftRow.checks`, `carryChecks`, `validateNewVersion`)
- Modify: `app/admin/actions.ts:32` (apply `carryChecks` next to `carrySources`)
- Modify: `lib/plan/engine.ts` (`Claim.checks`, set at line ~177; `ItemStatus` uses `TaskState`)
- Test: `test/plan/verification.test.ts`, `test/admin/new-version.test.ts`, `test/admin/carry-sources.test.ts`, `test/plan/engine.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type CheckKind = 'code-rule' | 'sbom' | 'pipeline';
  export interface CoverageCheck { id: string; description: string; kind: CheckKind }
  export type EvidenceKind = 'self-declared' | 'machine-checked';
  export interface TaskState { status: TaskStatus; note?: string; evidence?: EvidenceKind }
  // CoverageEntry.checks?: CoverageCheck[];  Project.taskStatus: Record<RequirementKey, TaskState>
  // DraftRow.checks?: CoverageCheck[];  Claim.checks?: CoverageCheck[]
  export function carryChecks(rows: DraftRow[], previous?: ToolVersion): DraftRow[];
  ```

- [ ] **Step 1: Write the failing tests**
  - `verification.test.ts` › `sameCoverage treats a changed, added or removed check as a change`: two entries equal except `checks` → `false`. Same checks in a different order → `true`. `undefined` vs `[]` → `true`.
  - `carry-sources.test.ts` › `carryChecks keeps the previous row's checks on rows that still have a value`: previous as-1 has `[{ id: 'zod-schema-on-every-route', kind: 'code-rule', description: 'x' }]`. Row as-1 with value `shared` gets them. Row as-1 with value `''` gets none. With no previous version, rows come back unchanged.
  - `new-version.test.ts` › `validateNewVersion copies a non-empty checks list to the entry`: `checks: []` → the entry has no `checks` key.
  - `engine.test.ts` › `claims carry the row's checks`: a version entry with one check → `item.claims[0].checks` equals it.

- [ ] **Step 2: Run them to see them fail**
  Run: `npx vitest run test/plan/verification.test.ts test/admin test/plan/engine.test.ts`
  Expected: FAIL (`carryChecks` is not exported, and the checks are ignored).

- [ ] **Step 3: Implement**
  - Types as above. `ItemStatus` in `engine.ts` becomes `TaskState | { applies: boolean; reason: string }`.
  - `sameCoverage`: also compare the checks, sorted by `id`, on `id|kind|description`.
  - `carryChecks`: for each row with a value, if the previous version has the same key with checks, and the row has no `checks` of its own, set `row.checks` to them.
  - In `app/admin/actions.ts`, call it as `carryChecks(carrySources(rows, previous), previous)`. Read `previous` once.

- [ ] **Step 4: Run the tests to see them pass**
  Run: `npm test`
  Expected: all PASS.

- [ ] **Step 5: Commit**
  `git commit -m "feat: coverage rows can carry checks, kept across versions"`

---

### Task 2: Seed checks, the SHIP-HATS sample, and checks on the verifier page

**Files:**
- Modify: `lib/data/seed-documents.ts` (`SeedVersionFile.groups[].checks`, `expandSeedVersion` copies it; add `ship-hats.json` to `versionFiles`)
- Modify: `data/seed/libraries.json` (Zod and Prisma checks)
- Modify: `data/seed/tools.json` (SHIP-HATS tool)
- Create: `data/seed/ship-hats.json`
- Modify: `app/verify/[toolId]/page.tsx:36-39` (`describe` adds checks)
- Modify: `test/int/approve.int.test.ts:19` (the waiting list now also has `ship-hats`)
- Test: `test/data/seed-documents.test.ts`

**Interfaces:**
- Consumes: `CoverageCheck` (Task 1).
- Produces: seed tool `ship-hats` with version 1 for `low-risk-cloud` and no approval. `zod` as-1 and `prisma` as-2 rows each have one check.

Seed values (exact):
- Zod as-1: `{ "id": "zod-schema-on-every-route", "kind": "code-rule", "description": "Every route handler parses its input with a Zod schema before use." }`
- Prisma as-2: `{ "id": "no-query-raw-unsafe", "kind": "code-rule", "description": "No call to $queryRawUnsafe or $executeRawUnsafe." }`
- Tool: `{ "_id": "ship-hats", "name": "SHIP-HATS (compliance level 4)", "description": "GovTech CI/CD pipeline with the compliance framework at level 4", "section": "wog", "oscalType": "service", "isSample": true }`
- Version: `source` "Sample from the SHIP-HATS docs, not confirmed by a CPFB team". `writtenAgainst` "SHIP-HATS docs, read 2026-11-06". Every row is `shared`. The rows (explanation / builderPart / check IDs) are in the spec, section E table.
- Check `ship-hats-compliance-template`: "The project's pipeline includes the SHIP-HATS compliance template." (`pipeline`)
- Check `cf-level-4`: "The project's CI/CD variable CF_LEVEL is 4, or is not set (default 4)." (`pipeline`)
- Write one seed group for each row of the spec table (five groups). Then each row keeps its own explanation.

- [ ] **Step 1: Write the failing tests**
  `seed-documents.test.ts`:
  - `zod and prisma rows carry their sample check`: assert the exact check objects above.
  - `ship-hats has five shared rows with pipeline checks and no approval`: the keys are sc-5, sc-7, sc-8, sd-4, sd-5. Every value is `shared`. Every row has ≥1 check of kind `pipeline`. `approval` is undefined. The tool `isSample` is true.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run test/data/seed-documents.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** the seed type, the copy in `expandSeedVersion`, the JSON files, and the `versionFiles` entry. In `describe` on the verifier page, append `Checks: {id} ({kind}), …` when the row has checks.

- [ ] **Step 4: Verify**
  Run: `npm test && npm run test:int`
  Expected: PASS (after the edit to `approve.int.test.ts`: `['dbaas', 'iga', 'prisma', 'ship-hats', 'zod']`).
  Then click "Reset demo data" in the running app (port 3000). Open `/verify/ship-hats` and confirm that the five rows show "Checks: …".

- [ ] **Step 5: Commit**
  `git commit -m "feat: seed checks for Zod and Prisma, add SHIP-HATS sample tool"`

---

### Task 3: Component definition — many profiles, roles, check rule sets

**Files:**
- Modify: `lib/export/oscal.ts` (`buildComponentDefinition`, new constants and helpers)
- Test: `test/export/oscal.test.ts`

**Interfaces:**
- Consumes: `CoverageEntry.checks` (Task 1).
- Produces (used by Tasks 4–7):
  ```ts
  export const COMPASS_NS: string;
  export type ToolWithVersions = { tool: Tool; pairs: VersionPair[] };   // pairs: one per profile the tool covers
  export const ROLES: Json[];  // [{ id: 'provider', title: 'Tool provider' }, { id: 'customer', title: 'App builder' }]
  export function profilesResource(profiles: Profile[]): Json;  // one profile → exactly profileResource(profile)
  export function ruleSetProps(checks: CoverageCheck[], start: number): Json[];
  export function buildComponentDefinition(input: { tools: ToolWithVersions[]; profiles: Profile[]; generatedAt: string }): Json;
  ```

Rules:
- `metadata.roles = ROLES`.
- Each tool with ≥1 pair is a component. A tool with zero pairs is left out.
- One `control-implementation` for each pair whose `profileId` is in `profiles`. Its `source` is `#<profileResource(thatProfile).uuid>`. Back-matter holds one resource for each profile used.
- The component props `profile-version` / `coverage-version` / `coverage-source` come from the first pair (in `profiles` order).
- Each row's `responsible-roles`: provided → `[{role-id:'provider'}]`; app-builder → `[{role-id:'customer'}]`; shared → both; not-applicable / other-tool → none.
- Rule sets: for each unique check (by `id`) across the tool's rows, numbered from 0 in row order. Props (`COMPASS_NS`, `remarks: rule_set_n`): `Rule_Id`=id, `Rule_Description`=description, `Check_Id`=id, `Check_Description`=description. Plus `prop('check-kind', kind)` with the same `remarks`. Each row with checks gets a `Rule_Id` prop (`COMPASS_NS`, no remarks) for each check.
- The `uuid` of the component definition keeps its current formula but covers all pairs: `${t.tool._id}@${pair.profileId}:${pair.current.version}`.

- [ ] **Step 1: Update the helper and write the failing tests**
  In `oscal.test.ts`, change `build()` to `build(toolIds, profileIds = ['low-risk-cloud'])`. It gives `tools` as `ToolWithVersions[]` (all pairs for the picked tools) and `profiles` as listed. New tests:
  - `component definition: rows carry provider/customer roles by value`: appCentral as-4 (provided) → `['provider']`. A shared row → `['provider','customer']`. dp-1 appCentral (other-tool) → no `responsible-roles`.
  - `component definition: metadata declares the provider and customer roles`.
  - `component definition: Zod's check becomes an oscal-compass rule set`: with `['appcentral','zod']`, the Zod component props have `Rule_Id`/`Check_Id` = `zod-schema-on-every-route` with `remarks: 'rule_set_0'` and ns `COMPASS_NS`. The as-1 row has a `Rule_Id` prop.
  - `component definition: a tool with no coverage is left out`: `['appcentral','gencentral']`, profiles low-risk-cloud + generative-ai → titles `['appCentral']`.
  - Change the existing `every custom prop is in the app's namespace`: every prop's ns is `OSCAL_NS` or `COMPASS_NS`, or it has no ns and its name is `leveraged-authorization-uuid`.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run test/export/oscal.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** as in the rules above. In `app/api/export/oscal/route.ts`, change only the call shape so it compiles (Task 7 does the full route work): `tools` with `pairs` for `low-risk-cloud`, and `profiles: [profile]`.

- [ ] **Step 4: Verify**
  Run: `npm test && npx tsc --noEmit`
  Expected: PASS, including the schema test.

- [ ] **Step 5: Commit**
  `git commit -m "feat: component definition has roles, check rule sets, one implementation per profile"`

---

### Task 4: SSP — profiles, roles, parties

**Files:**
- Modify: `lib/export/oscal.ts` (`buildSsp` input and the metadata / system-implementation parts)
- Test: `test/export/oscal.test.ts`

**Interfaces:**
- Consumes: `ToolWithVersions`, `ROLES`, `profilesResource` (Task 3).
- Produces:
  ```ts
  export function buildSsp(input: {
    plan: Plan; profiles: Profile[]; tools: ToolWithVersions[]; answers: RiskAnswers;
    project?: { id: string; name: string }; generatedAt: string;
  }): Json;
  // party UUIDs: uuid(`party|${scope}|${toolId}`) for each tool, uuid(`party|${scope}|builder`) for the app team
  ```

Rules:
- Keep the plan items whose `profileId` is in `profiles`. Keep the plan order.
- `import-profile.href` = `#<profilesResource(profiles).uuid>`. Back-matter = `[profilesResource(profiles)]`. With two profiles, the title is `Low-Risk Cloud + Generative AI (locally derived)`, and the description starts with the `LOCALLY_DERIVED` text from `lib/plan/labels.ts`.
- `metadata.roles = ROLES`. `metadata.parties`: one `{ uuid, type: 'organization', name: tool.name }` for each tool (in input order), then `{ uuid, type: 'organization', name: 'App builder' }`.
- Every input tool is an SSP component, also with zero pairs. `coverage-version` prop only when it has a pair. The scope string stays `${projectId ?? 'unsaved'}|${toolIds}`.

- [ ] **Step 1: Write the failing tests**
  - `ssp: GenAI requirements are in when the generative-ai profile is passed`: `build(['appcentral','gencentral'], ['low-risk-cloud','generative-ai'])` → some requirement has a `control-id` that starts with `ga-`. With profiles `['low-risk-cloud']` → none. Both pass the schema.
  - `ssp: one combined profile resource names both profiles`.
  - `ssp: parties are one per tool plus the app builder`: names `['appCentral','DBaaS','IGA','App builder']`.
  - `ssp: a picked tool with no coverage is still a component` (Review Focus 1): genCentral is in `system-implementation.components`.
  - Update the old calls to `buildSsp({ … profiles: [profile] … })`. The existing tests stay green.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run test/export/oscal.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement.** Update the call shape in the route (still low-risk-cloud only).

- [ ] **Step 4: Verify**
  Run: `npm test && npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git commit -m "feat: SSP covers every profile in use and names roles and parties"`

---

### Task 5: SSP — leveraged authorizations

**Files:**
- Modify: `lib/export/oscal.ts`
- Test: `test/export/oscal.test.ts`

**Interfaces:**
- Consumes: the party UUIDs (Task 4), `versionVerification` from `lib/plan/verification.ts`.
- Produces: `system-implementation.leveraged-authorizations` (left out when empty). Each tool component that has one gets the prop `{ name: 'leveraged-authorization-uuid', value }` with no `ns`.

Rules:
- One entry for each pair where `pair.current.approval` exists:
  - `uuid`: `uuid(\`leveraged|${scope}|${toolId}|${profileId}|v${version}\`)`
  - `title`: `${tool.name} coverage for ${profile.title}, version ${version}`
  - `party-uuid`: the tool's party.
  - `date-authorized`: `approval.at.slice(0, 10)`.

- [ ] **Step 1: Write the failing tests**
  - `ssp: an approved tool version is a leveraged authorization`: appCentral (seed-approved) → one entry. Its `party-uuid` is appCentral's party. `date-authorized` matches `/^\d{4}-\d{2}-\d{2}$/`. The component has the matching prop.
  - `ssp: an unapproved current version is not leveraged, even if an older one was` (Review Focus 4): use factories. Build a pair with `lastApproved` approved and `current` without approval → no entry.
  - The schema test still passes.

- [ ] **Step 2–4:** Run (fail) → implement → run `npm test` (pass).

- [ ] **Step 5: Commit**
  `git commit -m "feat: approved tool versions are leveraged authorizations in the SSP"`

---

### Task 6: SSP — provided, responsibilities, inherited, satisfied, checks, evidence

**Files:**
- Modify: `lib/export/oscal.ts` (the `switch` in `buildSsp`)
- Modify: `lib/export/ssp-values.ts` only if a helper must be exported for the builder text. Do not change `sspValues` output: the spreadsheet must not change.
- Test: `test/export/oscal.test.ts`

**Interfaces:**
- Consumes: `Claim.checks`, `TaskState.evidence` (Task 1); parties (Task 4); `COMPASS_NS` (Task 3).
- Produces: the by-component shapes in the spec, section A, mapping table.

Rules (from the spec, section A):
- UUID names: `provided|${scope}|${toolId}|${key}`, `responsibility|…`, `inherited|${scope}|${toolId}|${key}`, `satisfied|${scope}|${toolId}|${key}`.
- P: `{ uuid, description: claimText(c, lead), props: [verification, source, …Rule_Id for a provided row], 'responsible-roles': [{ 'role-id': 'provider', 'party-uuids': [toolParty] }] }`. Keep the `verification` and `source` as props (`OSCAL_NS`), from the claim.
- R: `{ uuid, 'provided-uuid'?: P (shared only), description: c.builderPart ?? item.plain?.task ?? item.title, props: Rule_Id per check, 'responsible-roles': [{ 'role-id': 'customer', 'party-uuids': [builderParty] }] }`.
- Tool by-component: `export: { provided?: [P], responsibilities?: [R] }`. Its state stays `implemented`. Its `description` is the claim text, as today.
- This-system by-component (one for the item): `inherited: [{ uuid, 'provided-uuid': P, description: 'Inherited from {tool}', 'responsible-roles': provider }]`, `satisfied: [{ uuid, 'responsibility-uuid': R, description, props: [Rule_Id…, evidence-kind], 'responsible-roles': customer }]`.
  - The state for `provided` is `implemented`. For `shared` / `app-builder` it comes from the task status (`STATE_BY_STATUS`).
  - The description is `sspValues(item).explanation` (it already includes status, note and "self-declared").
- The `satisfied` description: `"{STATUS_LABEL[status]} ({evidence label}).{ note}"`. The evidence label is "self-declared" or "machine-checked". It comes from `TaskState.evidence ?? 'self-declared'`.
- The by-component `description` keeps the `sspValues` text, so it matches the spreadsheet word for word. Only the `satisfied` description and the `evidence-kind` prop come from `TaskState.evidence`.
- `default-builder` / `answered-applies`: as today, plus `props: [prop('evidence-kind', …)]` on the this-system by-component.
- Every other placement: no change.

- [ ] **Step 1: Write the failing tests**
  - `ssp: a provided item is inherited from the tool's provided export`: as-4 → appCentral by-component has `export.provided[0]` with role `provider`. This-system has `inherited[0]['provided-uuid']` equal to it. The state is `implemented`.
  - `ssp: a shared item has provided + responsibility on the tool and inherited + satisfied on this-system`: as-1 with `['appcentral','zod']`. The responsibility's `provided-uuid` = P. `satisfied['responsibility-uuid']` = R. Both have `Rule_Id` `zod-schema-on-every-route`. `satisfied` has `evidence-kind` `self-declared`.
  - `ssp: two tools on one shared item give two links each` (Review Focus 2): `['appcentral','ship-hats']`, sd-4 → this-system `inherited` length 2 and `satisfied` length 2, each pointing at a different tool's items.
  - `ssp: every link resolves inside the file`: walk the SSP; collect all `export.provided[].uuid` and `export.responsibilities[].uuid`; every `provided-uuid` and `responsibility-uuid` is in that set. Run for `['appcentral','dbaas','iga']`, `['appcentral','zod','prisma','ship-hats']` and the GenAI set.
  - `ssp: every role and party reference resolves`: every `role-id` is in `metadata.roles`, and every `party-uuids` entry is in `metadata.parties`.
  - `ssp: every Rule_Id in the SSP is a rule in that tool's component definition`.
  - `ssp: a responsibility never has an empty description` (Review Focus 3): factory claim with no `builderPart` and an item with no `plain` → R description = the item title.
  - Update the old tests that read `by-components` to the new shape. The as-1 test becomes "the builder's own item": use a requirement with placement `default-builder`.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run test/export/oscal.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Verify**
  Run: `npm test && npx tsc --noEmit && npm run lint`
  Expected: PASS. `test/export/ssp-xlsx.test.ts` and `ssp-values.test.ts` do not change.

- [ ] **Step 5: Commit**
  `git commit -m "feat: SSP uses OSCAL provided, inherited and satisfied with check IDs"`

---

### Task 7: Route — profiles in use, all pairs; check from the running app

**Files:**
- Modify: `app/api/export/oscal/route.ts`
- Test: manual download check (route handlers have no unit tests in this repo)

**Interfaces:**
- Consumes: `buildSsp`, `buildComponentDefinition` (Tasks 3–6).

Rules:
- `profiles` = `low-risk-cloud`, plus `generative-ai` when `plan.items.some(i => i.profileId === 'generative-ai')` (the same rule as `app/api/export/ssp/route.ts:12`).
- `tools` = the picked tools in `toolIds` order. Each tool has `pairs` = `data.versions` for that tool whose `profileId` is in `profiles`, in `profiles` order. Keep the tools with zero pairs.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Download and validate from the running app.** Write a scratchpad script that fetches both kinds from `http://127.0.0.1:3000/api/export/oscal` for:
  - (a) `?project=sample-two-weeks-in`
  - (b) a plan URL with `appcentral,zod,prisma,ship-hats`
  - (c) a plan URL with `appcentral,gencentral`

  Run each file through the two schemas (reuse `test/helpers/oscal-validate.ts` from a small vitest file in the scratchpad, or ajv directly).
  Expected: 6 files, 0 schema errors. (c) has `ga-*` requirements and lists genCentral as an SSP component.
- [ ] **Step 3: Full check**
  Run: `npx tsc --noEmit && npm run lint && npm test && npm run test:int`
  Expected: all PASS.
- [ ] **Step 4: Commit**
  `git commit -m "feat: OSCAL route exports every profile in use"`
