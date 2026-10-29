# Agent Coverage Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin downloads a brief for their coding agent, uploads the OSCAL component definition the agent writes, reviews the filled-in coverage editor, and submits a version for the verifier.

**Architecture:** Two pure functions do the work: `renderCoverageBrief` (brief out) and `parseAgentOscal` (file in, `DraftRow[]` out). Thin glue connects them to the app: an admin-only route for the download, a server action for the upload, and a panel in the existing coverage editor. Save reuses `saveVersionAction`. A new `requireAll` flag blocks blank rows for an agent draft, on the server and in the UI.

**Tech Stack:** Next 16 App Router (read `node_modules/next/dist/docs/` before writing a route or action), React 19, Tailwind 4, MongoDB, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-agent-coverage-import-design.md`

## Global Constraints

- Admin-facing copy may use the standard's words. The builder-language rule (no IM8, SSP, OSCAL, control or agency) applies to builder screens only, so nothing in this plan touches builder screens.
- Use "App Builder", never "Agency".
- Desktop only. Use the existing UI kit (`app/ui/*`: `Button`, `Field`, `Note`, `Panel`, `Stamp`, `Tag`, `inputClass`, `selectClass`) and its tokens. Add no new colours or components to the kit.
- Upload limit: 2 MB. The brief file name is `BUILD-COVERAGE.md`. The default version source is `Coding agent: <file name>`.
- The OSCAL namespace is `urn:cpfb-build-plan` (`OSCAL_NS` in `lib/export/oscal.ts`).
- Never commit `low-risk-cloud-ssp.xlsx`, `pnpm-lock.yaml` or `pnpm-workspace.yaml`. Stage files by name, never with `git add -A`.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Checks for each task: `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`. For Task 4, also run `npm run e2e`.

## Review Focus

1. **The agent changes the case or spacing of an answer** (`" Provided "`, `"APP-BUILDER"`). The admin expects it to be accepted. → Parser: trim and lower-case `responsibility` before checking it. Test in Task 2.
2. **The agent wraps the JSON in a ```json fence, or the file has a BOM.** The brief shows the template inside a fence, so this is likely. → Parser: strip a leading BOM and one surrounding code fence before `JSON.parse`. Test in Task 2.
3. **The agent drops `ns` from its props, or uses another namespace.** → Parser: read props by `name` only. Test in Task 2.
4. **The agent writes control IDs in upper case** (`AS-3`). → Parser: match IDs case-insensitively. Test in Task 2.
5. **A builder or verifier opens the brief URL directly.** → Route returns 403 with a plain message. Test in Task 4 (e2e).

---

### Task 1: The brief (renderer and download route)

**Files:**
- Modify: `lib/export/oscal.ts`: export the private helpers `uuid`, `prop`, `metadata` and `profileResource` (no behaviour change).
- Create: `lib/export/coverage-brief-md.ts`
- Create: `app/api/admin/tools/[toolId]/agent-brief/route.ts`
- Test: `test/export/coverage-brief-md.test.ts`

**Interfaces:**
- Produces:
  - `coverageTemplate(input: { tool: Tool; profile: Profile; generatedAt: string }): Record<string, unknown>`: the empty component definition. Each `implemented-requirement` is `{ uuid, 'control-id': entry.id, description: '', props: [prop('responsibility',''), prop('evidence','')] }`, in profile order. The UUIDs come from `uuid()` with the names `coverage-template|<toolId>|<profileId>`, `component|<toolId>`, `implementation|<toolId>|<profileId>|agent` and `requirement|<toolId>|agent|<key>`.
  - `renderCoverageBrief(input: { tool: Tool; profile: Profile; otherTools: Tool[]; generatedAt: string }): string`
  - `ANSWERS: { value: CoverageValue; meaning: string }[]` (the five answers in spec order, exported so Task 2 can use the same list)

- [ ] **Step 1: Write the failing tests** in `test/export/coverage-brief-md.test.ts`, using `makeProfile('low', [{id:'as-3', plain:{title:'Lock it',task:'Do X',why:'Because'}}, {id:'ac-7'}])`, `makeTool('probe', {name:'Probe'})` and `otherTools=[makeTool('dbaas',{name:'DBaaS'})]`:
  - `'the brief lists every requirement once in the table'`: `md.match(/^\| as-3 \|/m)` has length 1, and so does `ac-7`. The ac-7 row shows `Title ac-7` because it has no plain text.
  - `'the template is one fenced JSON block that parses'`: extract the block between `` ```json `` and `` ``` ``, then `JSON.parse` it. Its `implemented-requirements` map to the `control-id`s `['as-3','ac-7']`.
  - `'the template has an empty answer and evidence on every row'`: each row's props by name give `responsibility: ''` and `evidence: ''`.
  - `'the brief names all five answers and the other tool ids'`: the text contains `` `provided` ``, `` `shared` ``, `` `app-builder` ``, `` `not-applicable` ``, `` `other-tool` `` and `` `dbaas` ``.
  - `'the brief names the output file'`: contains `probe-coverage.oscal.json`.
  - `'the template is the same on every call for the same inputs'`: `coverageTemplate` deep-equals itself across two calls.

- [ ] **Step 2: Run** `npx vitest run test/export/coverage-brief-md.test.ts`. Expected: FAIL (the module is not found).

- [ ] **Step 3: Implement** `coverage-brief-md.ts`. Use the six sections in spec Part 1, in that order. Table columns: `| ID | Room | Requirement | What to do | Why it matters |`. Use `roomName(family)` from `lib/plan/floor-plan` for the room. Escape `|` in cells as `\|`. The plain task and why fall back to the entry `title` and `rationale`. Insert the template with `JSON.stringify(template, null, 2)` inside a `` ```json `` fence.

- [ ] **Step 4: Run** the test file again. Expected: PASS. Also run `npx vitest run test/export/oscal.test.ts`. Expected: PASS, so the exported helpers changed nothing.

- [ ] **Step 5: Implement the route** `GET /api/admin/tools/[toolId]/agent-brief?profile=<id>`:
  - If `getRole()` is not `'admin'`, return 403 with the body `Switch to admin to download this.`.
  - Load the data with `withDb(loadPlanData)`. An unknown tool or profile gives 404 `No such tool or profile.`.
  - `otherTools` is every tool except this one.
  - Return `text/markdown; charset=utf-8` with `Content-Disposition: attachment; filename="BUILD-COVERAGE.md"`.
  - Copy the response style from `app/api/export/build-plan/route.ts`.

- [ ] **Step 6: Check** with `npx tsc --noEmit && npx eslint .`. Expected: no errors.

- [ ] **Step 7: Commit** `lib/export/oscal.ts lib/export/coverage-brief-md.ts "app/api/admin/tools/[toolId]/agent-brief/route.ts" test/export/coverage-brief-md.test.ts` with the message `feat: coverage brief for a tool's coding agent`.

---

### Task 2: Reading the agent's file

**Files:**
- Create: `lib/import/parse-agent-oscal.ts`
- Modify: `app/admin/actions.ts` (add `readAgentFileAction`)
- Test: `test/import/parse-agent-oscal.test.ts`

**Interfaces:**
- Consumes: `coverageTemplate` and `ANSWERS` from Task 1. `DraftRow` from `lib/admin/new-version`.
- Produces:
  - `type AgentParseResult = { ok: true; rows: DraftRow[]; filled: number; blank: RequirementKey[] } | { ok: false; error: string }`
  - `parseAgentOscal(text: string, profile: Profile, toolId: string, otherToolIds: string[]): AgentParseResult`. Ruling: the spec's signature has only `toolIds`. `toolId` is added so the parser can refuse a file that says this tool is "another tool".
  - `readAgentFileAction(toolId: string, profileId: string, formData: FormData): Promise<AgentParseResult & { fileName?: string }>` (the file is in the `file` field)

- [ ] **Step 1: Write the failing tests.** Fixture helper: `fill(template, answers: Record<id, {r?, d?, bp?, ho?, ev?}>)` sets the props and the description on a `coverageTemplate` from Task 1, then returns `JSON.stringify`. Profile: as-3, ac-7, is-14 (is-14 has no answer). Tests:
  - `'the empty template gives every row blank, in profile order'`: `rows.map(r=>r.value)` equals `['','','']`, `filled` is 0, and `blank` holds all three keys.
  - `'maps each field to the editor row'`: as-3 `{r:'shared', d:'Does A', bp:'You do B', ev:'src/auth.ts'}` gives `{key, value:'shared', explanation:'Does A', builderPart:'You do B', source:'src/auth.ts'}`. ac-7 `{r:'other-tool', ho:'dbaas'}` gives `otherToolId:'dbaas'`.
  - `'an app-builder description becomes the builder part'`: `{r:'app-builder', d:'Add a lockout'}` gives `builderPart:'Add a lockout'` and no `explanation`.
  - `'a missing requirement comes back blank and listed'`: remove is-14 from the file. Its row is `value:''` and `blank` equals `[key('is-14')]`.
  - Refusals, one test for each, with the exact error text from the spec "Errors" table:
    - `'not json'`: `"This file isn't JSON. Upload the file your agent wrote."`
    - `'{}'`: `"This file has no component definition. Check that the agent followed the brief."`
    - two components: `"This file describes 2 tools. Upload one tool at a time."`
    - an unknown ID `zz-1`: `"1 requirement IDs aren't in low: zz-1"`
    - a duplicate as-3: `"as-3 appears twice."`
    - `r:'mostly'`: `'as-3 has the answer "mostly", which isn\'t one of the five answers in the brief.'`
    - `ho:'nope'` and `ho:'probe'` (itself): `'as-3 says another tool handles it, but "nope" isn\'t a tool here.'`
  - Review Focus tests:
    - `' Provided '` maps to `provided`
    - `﻿` plus a `` ```json\n...\n``` `` wrapper parses
    - props with no `ns` are read
    - `control-id: 'AS-3'` matches as-3

- [ ] **Step 2: Run** `npx vitest run test/import/parse-agent-oscal.test.ts`. Expected: FAIL (the module is not found).

- [ ] **Step 3: Implement `parseAgentOscal`.** Walk `components[0]['control-implementations'][*]['implemented-requirements'][*]`. Trim every string and drop empty ones. Build one `DraftRow` for each `profile.entries` entry, in order.

- [ ] **Step 4: Run** the test file again. Expected: PASS.

- [ ] **Step 5: Implement `readAgentFileAction`** in `app/admin/actions.ts`:
  - Call `requireAdmin()`.
  - If the file is missing, empty or larger than `2 * 1024 * 1024` bytes, return `{ ok:false, error:'Choose a JSON file under 2 MB.' }`.
  - Load the profile and tools with `withDb(loadPlanData)`.
  - Return `{ ...parseAgentOscal(await file.text(), profile, toolId, otherIds), fileName: file.name }`.
  - It writes nothing.

- [ ] **Step 6: Check** with `npx tsc --noEmit && npx eslint .`. Expected: no errors.

- [ ] **Step 7: Commit** the three files with the message `feat: read a coding agent's OSCAL coverage file`.

---

### Task 3: Blank rows block submit; versions record the agent

**Files:**
- Modify: `lib/admin/new-version.ts` (`validateNewVersion`)
- Modify: `lib/domain/types.ts:131` (`importedFrom`)
- Modify: `app/admin/actions.ts` (`saveVersionAction`)
- Modify: `app/verify/[toolId]/page.tsx` (one line)
- Test: `test/admin/new-version.test.ts`

**Interfaces:**
- Produces:
  - `validateNewVersion(rows: DraftRow[], versionSource: string, opts?: { requireAll?: boolean }): NewVersionResult`
  - `ToolVersion.importedFrom?: { fileName: string; missingKeys: RequirementKey[]; by?: 'coding-agent' }`
  - `saveVersionAction(toolId, profileId, rows, source, changeNote?: string, fromAgentFile?: string): Promise<SaveResult>`

- [ ] **Step 1: Write the failing tests** in `test/admin/new-version.test.ts`:
  - `'with requireAll, a blank row is an error on that row'`: `validateNewVersion([row('as-1',{value:''}), row('as-2')], 's', {requireAll:true})` equals `{ok:false, errors:[{key:key('as-1'), message:'Choose an answer for this requirement.'}]}`.
  - `'without requireAll, blank rows are still dropped'`: the existing behaviour, but with an explicit `{}` third argument.

- [ ] **Step 2: Run** `npx vitest run test/admin/new-version.test.ts`. Expected: the first test FAILS (`ok:true`).

- [ ] **Step 3: Implement** `requireAll` in `validateNewVersion`. Push the error, then `continue`.

- [ ] **Step 4: Run** the test file again. Expected: PASS.

- [ ] **Step 5: Wire it up:**
  - In `saveVersionAction`, pass `{ requireAll: !!fromAgentFile }`. When `fromAgentFile` is set, add `importedFrom: { fileName: fromAgentFile, missingKeys: [], by: 'coding-agent' }` to `createToolVersion`.
  - Add `by?` to the type.
  - On the verifier page, under the `PageHeader`, add a `<Note>`. It shows only when `current.importedFrom?.by === 'coding-agent'`: `A coding agent filled this in from {fileName}. The admin reviewed it.`.

- [ ] **Step 6: Check** with `npx vitest run && npx tsc --noEmit && npx eslint .`. Expected: all pass.

- [ ] **Step 7: Commit** the five files with the message `feat: agent drafts need every row answered before submit`.

---

### Task 4: The editor panel, the end-to-end test and the run-through

**Files:**
- Create: `app/admin/tools/[toolId]/agent-fill.tsx`
- Modify: `app/admin/tools/[toolId]/coverage-editor.tsx`
- Create: `e2e/agent-coverage.spec.ts`
- Modify: `docs/run-through.md`

**Interfaces:**
- Consumes: `readAgentFileAction` (Task 2), `saveVersionAction(..., fromAgentFile)` (Task 3), and the route from Task 1.
- Produces: `AgentFill({ toolId, profileId, onFilled }: { toolId: string; profileId: string; onFilled: (r: { rows: DraftRow[]; fileName: string; filled: number; blank: RequirementKey[] }) => void })`

- [ ] **Step 1: Write the failing e2e test** `'an admin fills a new tool from a coding agent file and submits it for approval'`:
  1. `request.post('/api/reset')`.
  2. As Admin, create the tool `Agent Probe` with the existing form, so you land in its editor.
  3. Download the brief with `page.request.get(<href of the "Download the brief" link>)`. Expect status 200 and a `content-disposition` that contains `BUILD-COVERAGE.md`.
  4. Pull the JSON block out of the brief. Set every `responsibility` to `app-builder`, except the first row, which stays empty.
  5. Upload it with `setInputFiles({ name: 'agent-probe-coverage.oscal.json', mimeType: 'application/json', buffer })`, then click "Fill in the editor".
  6. Expect the text `Fill the 1 blank row before you submit.`. Click "Save new version" and expect the "Save" button to be disabled.
  7. Click "Show blank rows". Open the one row and choose "Who handles it" → the App Builder option. Save, and expect `Saved version 1. It is not yet verified`.
  8. As Verifier, open the version from `/verify`. Expect `A coding agent filled this in from agent-probe-coverage.oscal.json.`.
  9. Review Focus 5: as Builder, `page.request.get(<brief url>)` returns status 403.

  Ruling: the spec's fixture file is built inside the test from the downloaded brief, so it can never drift from the profile.

- [ ] **Step 2: Run** `npx playwright test e2e/agent-coverage.spec.ts`, or `npm run e2e` if the config needs a production build. Expected: FAIL (no "Download the brief" link).

- [ ] **Step 3: Implement `AgentFill`.** It is a `Panel` titled `Fill in with your coding agent` and contains:
  - one sentence: `Give the brief to a coding agent that can read this tool's code and docs. Upload the file it writes to fill in every row below.`
  - a `TextLink` `Download the brief` to `/api/admin/tools/${toolId}/agent-brief?profile=${profileId}`
  - a `.json` file input labelled `The agent's file (.json)`, in the same style as `import-form.tsx`
  - a `Button` `Fill in the editor`

  When the result is an error, show `<Note tone="error">` with the error and do not call `onFilled`.

- [ ] **Step 4: Change `CoverageEditor`:**
  - New state: `agentFile: string | null` and `blankOnly: boolean`.
  - `onFilled` replaces `rows` with a new `Map` from `rows`, sets `agentFile`, sets `source` to `Coding agent: ${fileName}`, and clears errors and `savedVersion`.
  - When `agentFile` is set, `blankKeys` is the requirements whose row value is `''`.
  - The note above the list says `Filled in from {file}: {filled} of {total} rows.`. When blanks exist, it adds `Fill the {n} blank row{s} before you submit.` and a secondary `Button size="sm"` `Show blank rows`, which sets `blankOnly`.
  - Add a checkbox `Blank rows only` next to `Rows with coverage only`, shown only when `agentFile` is set.
  - A blank row in an agent draft shows `<Stamp tone="pending">Needs an answer</Stamp>` in the aside and `<Note tone="error">The agent left this blank. Choose an answer.</Note>` in the body.
  - `Save` is `disabled={pending || blankKeys.length > 0}`. `save` passes `agentFile ?? undefined` as `fromAgentFile`.
  - `changed()` compares with `initial` as today, so rows from the agent show "Changed" against the current version.

- [ ] **Step 5: Run** the e2e test again. Expected: PASS. Then run the full `npm run e2e`. Expected: all pass (12 + 1).

- [ ] **Step 6: Check by eye.** Restart the preview (preview_stop, then preview_start, because Turbopack serves stale code). Open a tool's editor as Admin, upload a file with blanks, and take a screenshot of the note and one blank row.

- [ ] **Step 7: Update `docs/run-through.md`.** Add an optional admin moment, "A new tool in two minutes": download the brief, show a prepared agent file, upload it, fill one blank row, save, approve.

- [ ] **Step 8: Run the full checks** `npx vitest run && npm run test:int && npx tsc --noEmit && npx eslint .`. Expected: all pass.

- [ ] **Step 9: Commit** the four files with the message `feat: fill a tool's coverage from a coding agent file`.
