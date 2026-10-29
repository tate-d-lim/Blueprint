# Fill a tool's coverage with a coding agent

Date: 2026-10-29. Status: design approved in chat, spec waiting for review.

## Goal

An admin adds or updates what a tool covers. Today they fill about 86 rows by hand in the coverage editor, or import a GovTech Component Guide spreadsheet (most tools do not have one). This feature lets the admin's own coding agent do the first pass:

1. The admin downloads a brief for the tool and one profile.
2. The admin gives the brief to a coding agent that has the tool's code and docs. The agent writes an OSCAL component definition.
3. The admin uploads that file. The coverage editor fills in from it.
4. The admin looks it over, fills any row the agent left blank, and submits.
5. A verifier approves the new version, as for every other version.

**Success:** for a tool with no coverage yet, the admin reaches a submitted version with one download, one upload and one click, plus one choice for each row the agent left blank.

## Decisions made in chat

| Question | Decision |
|---|---|
| What "submit" does | It is the existing save. It creates a new, unverified version that a verifier approves. |
| Form of the brief | One Markdown file with the instructions, the requirement table and an empty OSCAL JSON template. |
| Review | The agent fills every row and the admin submits from the filled-in editor. No "unsure" filter, no tick on each row. |
| Blank rows | After an agent upload, a blank row blocks submit until the admin chooses an answer. |
| Where the draft lives | Only in the browser. Nothing is saved before submit (approach 1; a saved draft is out of scope). |

## Out of scope

- A draft saved in the database, so the admin can stop and come back.
- Running the agent from the app. The app never calls a model.
- More than one profile in one file. The admin downloads one brief for each profile.
- Changes to the spreadsheet import (`/admin/import`).
- Changes to the blank-row rule in the manual editor. There, a blank row still means "this tool says nothing about it".

## Part 1: the brief

**Route:** `GET /api/admin/tools/[toolId]/agent-brief?profile=<profileId>`. Admin role only (same check as the admin actions). The response is `text/markdown` with `Content-Disposition: attachment; filename="BUILD-COVERAGE.md"`.

**Renderer:** `lib/export/coverage-brief-md.ts`, a pure function `renderCoverageBrief({ tool, profile, otherTools, generatedAt })` that returns a string. It sits next to `build-plan-md.ts`.

**Sections, in order:**

1. **Title and scope.** "What <tool> covers in <profile title>", the profile version, and the date.
2. **What to do.** Short numbered steps for the agent:
   - Read this repository and its docs.
   - For every requirement in the table, choose one answer, write one or two plain sentences, and give the evidence: a file path, or a doc URL.
   - Fill every row. If you cannot tell, choose the closest answer and say why in the description. Do not leave a row out.
   - Write the result to `<tool-id>-coverage.oscal.json` and give it to the admin.
3. **The five answers.** Each answer is described from the tool's point of view:
   - `provided`: the tool does all of it, so the app team does nothing.
   - `shared`: the tool does part of it. Put the app team's part in `builder-part`.
   - `app-builder`: the tool does none of it, so the app team does all of it.
   - `not-applicable`: it cannot apply to an app built on this tool.
   - `other-tool`: another tool handles it. Put that tool's id in `handled-by`. The brief lists the valid ids (`otherTools`).

   This file is for the tool's own team, so it may use the standard's own words. The builder-language rule applies to builder screens only.
4. **Requirement table.** One row for each requirement in profile order. Columns: ID, family, title, plain task (`plain.task`), why it matters (`plain.why`). If there is no plain text, the column shows the original title.
5. **Template.** A fenced JSON block (see below), with one `implemented-requirement` for each requirement in the table.
6. **Check before you hand it over.** A short list: every row has a `responsibility`, `shared` rows have `builder-part`, `other-tool` rows have `handled-by`, and the JSON parses.

**Template shape.** It is the same shape that `buildComponentDefinition` in `lib/export/oscal.ts` writes, with the same `urn:cpfb-build-plan` namespace, so our export and the agent's file read the same way:

```json
{
  "component-definition": {
    "uuid": "<fixed uuid from tool + profile>",
    "metadata": { "title": "...", "last-modified": "...", "version": "...", "oscal-version": "1.1.2" },
    "components": [{
      "uuid": "<fixed uuid from tool id>",
      "type": "service",
      "title": "<tool name>",
      "description": "<tool description>",
      "control-implementations": [{
        "uuid": "...",
        "source": "#<profile resource uuid>",
        "description": "What <tool> covers in <profile>.",
        "implemented-requirements": [{
          "uuid": "...",
          "control-id": "as-3",
          "description": "",
          "props": [
            { "name": "responsibility", "ns": "urn:cpfb-build-plan", "value": "" },
            { "name": "evidence", "ns": "urn:cpfb-build-plan", "value": "" }
          ]
        }]
      }]
    }],
    "back-matter": { "resources": [ { "uuid": "...", "title": "...", "description": "..." } ] }
  }
}
```

`builder-part` and `handled-by` are optional props and are described in section 3 of the brief. They are not in each template row, so the template stays short.

## Part 2: upload, fill-in and submit

### Parser

`lib/import/parse-agent-oscal.ts`, a pure function:

```ts
parseAgentOscal(text: string, profile: Profile, toolIds: string[]):
  | { ok: true; rows: DraftRow[]; filled: number; blank: RequirementKey[] }
  | { ok: false; error: string }
```

It **refuses** the file, with a plain-language error, when:

- the text is not JSON, or it has no `component-definition`
- there is not exactly one component
- a `control-id` is not in the profile ("3 requirement IDs aren't in <profile>: x, y, z")
- the same `control-id` occurs twice
- a `responsibility` value is set but is not one of the five answers
- `handled-by` names a tool id that the app does not have, or names this tool

It **does not refuse** a file only because a requirement is missing or its `responsibility` is empty. Those rows come back blank and are listed in `blank`.

**Mapping to `DraftRow`** (one for each profile requirement, in profile order):

| File | DraftRow |
|---|---|
| `responsibility` prop | `value` (`''` if missing or empty) |
| `description` | `builderPart` when the value is `app-builder`, else `explanation` |
| `builder-part` prop | `builderPart` (used for `shared`) |
| `handled-by` prop | `otherToolId` |
| `evidence` prop | `source` |

The parser trims every text and drops empty strings.

### Server action

`readAgentFileAction(toolId, profileId, formData)` in `app/admin/actions.ts`. It checks the admin role, loads the profile and tool ids, reads the file (refuses more than 2 MB, and refuses an empty file), and returns the parser result plus `fileName`. It writes nothing.

### Editor

`app/admin/tools/[toolId]/coverage-editor.tsx` gets a panel above the filters, titled "Fill in with your coding agent":

- A link "Download the brief" to the route in part 1, for the current profile.
- A file input "Upload the agent's file (.json)" and a button "Fill in the editor".

After a successful upload:

- Every row is replaced by the parsed rows. A second upload replaces them again. If the admin leaves the page, the draft is gone.
- The version source becomes `Coding agent: <file name>` (the admin can change it).
- A note at the top: "Filled in from <file>: 84 of 86 rows." When rows are blank, it adds "Fill the 2 blank rows before you submit." and a "Show blank rows" button. That button sets a new "Blank only" filter.
- Each blank row shows an error outline and "The agent left this blank. Choose an answer." The message goes when the admin chooses a value.
- The save button is off while any row is blank. Its label stays as it is today.

A failed upload shows the parser error in a `Note tone="error"` and leaves the editor as it was.

### Save rule

`validateNewVersion(rows, source, { requireAll })` gets an optional third argument. When `requireAll` is true, each blank row gives the error `{ key, message: "Choose an answer for this requirement." }`. `saveVersionAction` gets an optional `fromAgentFile?: string`. When it is set, the action passes `requireAll: true`, so the server also enforces the rule. It then stores `importedFrom: { fileName, missingKeys: [], by: 'coding-agent' }` on the version.

`ToolVersion.importedFrom` gets an optional `by?: 'coding-agent'`. Old versions are unchanged.

### Verifier

`/verify/[toolId]` shows one line when `importedFrom.by === 'coding-agent'`: "A coding agent filled this in from <file>. The admin reviewed it." Nothing else in the verifier changes.

## Errors

| Case | What the admin sees |
|---|---|
| Not JSON | "This file isn't JSON. Upload the file your agent wrote." |
| No component definition | "This file has no component definition. Check that the agent followed the brief." |
| Wrong component count | "This file describes <n> tools. Upload one tool at a time." |
| Unknown IDs | "<n> requirement IDs aren't in <profile>: …" (first five) |
| Duplicate ID | "<id> appears twice." |
| Bad answer | "<id> has the answer "<value>", which isn't one of the five answers in the brief." |
| Bad other tool | "<id> says another tool handles it, but "<value>" isn't a tool here." |
| Too big or empty | "Choose a JSON file under 2 MB." |

## Testing

- `test/import/parse-agent-oscal.test.ts`: every refusal in the table above. The full mapping, including that `app-builder` puts the description into `builderPart`. Missing and empty rows come back blank and are listed. The rows are in profile order.
- `test/export/coverage-brief-md.test.ts`: the brief has every requirement ID once in the table and once in the template. The template is valid JSON. When the template is parsed with no answers, every row comes back blank (a round trip with the parser).
- `test/admin/new-version.test.ts`: `requireAll` blocks a blank row. Without it, blank rows are still skipped (no change to the manual editor).
- `e2e/agent-coverage.spec.ts`: as admin, open a tool, download the brief (check the status and the file name), and upload a fixture file with one blank row. Check that the note says 1 blank and that save is off. Choose an answer, then save. Open `/verify` and check that the new version is listed with the coding-agent line.
- Fixture: `e2e/fixtures/agent-coverage.oscal.json`, made from the brief template for a seeded tool that has no Low-risk cloud version yet (or the first seeded tool, if every tool has one), with every row answered except one. `createToolVersion` already stores `importedFrom`, so the repo needs no change.

## Files

New:
- `lib/export/coverage-brief-md.ts`
- `lib/import/parse-agent-oscal.ts`
- `app/api/admin/tools/[toolId]/agent-brief/route.ts`
- `app/admin/tools/[toolId]/agent-fill.tsx` (the panel, used by the editor)
- the tests and the fixture listed above

Changed:
- `lib/admin/new-version.ts` (`requireAll`)
- `app/admin/actions.ts` (`readAgentFileAction`, `saveVersionAction` gets `fromAgentFile`)
- `app/admin/tools/[toolId]/coverage-editor.tsx` (state for the agent draft, the blank-row outline and filter, the save button rule)
- `lib/domain/types.ts` (`importedFrom.by`)
- `app/verify/[toolId]/page.tsx` (the coding-agent line)
- `docs/run-through.md` (an optional demo step)
