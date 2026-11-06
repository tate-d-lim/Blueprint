# OSCAL shared responsibility, pipeline-ready — design

Date: 2026-11-06. Status: approved in chat (items A to E), written spec waiting for review.

## Why

Blueprint's OSCAL files pass the NIST 1.1.2 schema, but most of their meaning is in our own props. Other OSCAL tools cannot read who does what. The long-term goal is a chain where a certified component says what it provides and what the builder must do, a pipeline checks the builder's part, and the result comes back as OSCAL:

```
component definition ──▶ SSP ──▶ checks run in the pipeline ──▶ Assessment Results (──▶ POA&M)
(platform team,          (Blueprint)  (SHIP-HATS: scans, SBOM,       (converter, later)
 verifier approves)                    component rules)
```

For the hackathon (demo 2026-11-17) we build only the Blueprint part. The data gets the shape the pipeline needs, so the pipeline can connect later without a model change.

## Scope

| | Item | Build now |
|---|---|---|
| A | OSCAL shared-responsibility model in the SSP and component definition | Yes |
| B | GenAI requirements in both OSCAL files | Yes |
| C | Check IDs on coverage rows, exported in the oscal-compass format | Data, seed, export, read-only on the verifier page |
| D | Evidence kind on builder statuses | Yes (only `self-declared` is used) |
| E | SHIP-HATS as a sample tool with pipeline checks | Yes, labelled "Sample, not yet verified" |
| F | Assessment Results import, POA&M, GitLab report converter | No. Described in "Later" only |

Stays the same: builder screens (except that SHIP-HATS shows in the tool picker), `BUILD-PLAN.md`, the security review spreadsheet, the coverage brief and the agent upload.

## A. Shared responsibility

### OSCAL objects used (NIST 1.1.2, checked against `test/fixtures/oscal/`)

- SSP by-component: `export { description?, provided[], responsibilities[] }`, `inherited[]`, `satisfied[]`. Each item needs `uuid` and `description`. `responsibilities[].provided-uuid`, `inherited[].provided-uuid` and `satisfied[].responsibility-uuid` are optional links.
- `responsible-roles[] { role-id, party-uuids? }` on each of those items.
- `system-implementation.leveraged-authorizations[] { uuid, title, party-uuid, date-authorized }`. All four are required.
- Component definition implemented-requirement: only `responsible-roles` (no export).

### Metadata

Both files get `metadata.roles`:
- `provider`: "Tool provider". The team that runs a tool and says what it covers.
- `customer`: "App builder". The team that builds the app on the tools.

The SSP also gets `metadata.parties` (type `organization`):
- One party for each picked tool, named after the tool.
- One party for the app team, named "App builder".

### SSP mapping, by plan placement

`P` is a provided item and `R` is a responsibility item, both in the tool's by-component. The tool's by-component keeps `implementation-status: implemented`.

| Placement | Tool by-component | This-system by-component |
|---|---|---|
| `provided` | `export.provided` P (role provider) | `inherited` → P (role provider). State `implemented` |
| `shared` | `export.provided` P + `export.responsibilities` R with `provided-uuid` P (role customer) | `inherited` → P, and `satisfied` → R (role customer). State from the task status |
| `app-builder` (the tool says "yours") | `export.responsibilities` R (role customer) | `satisfied` → R. State from the task status |
| `default-builder`, `answered-applies` | none | As now: one by-component, no links |
| `not-applicable`, `answered-not-applicable`, `not-for-app` | As now | As now |
| `open`, `redirect`, `conflict` | As now: remarks only | As now |

When several tools decide one item, each tool gets its own P or R. This-system gets one `inherited` or `satisfied` entry for each.

Text:
- P description: the tool's claim text, as today (`claimText`).
- R description: the tool's builder part. Use the claim's `builderPart`. If there is none, use the plain-language task, then the requirement title.
- `satisfied` description: what the builder says. It holds the status label, the task note, and the words "(self-declared)". The task note is already in the SSP today. It moves here from the by-component description.
- P and R keep the `verification` and `source` props.

UUIDs stay v5 over stable names: `provided|{scope}|{toolId}|{key}`, `responsibility|{scope}|{toolId}|{key}`, `inherited|…`, `satisfied|…`. For a saved project with the same tools, each export gives the same UUIDs. Then pipeline results can point at them later.

### Leveraged authorizations (default a)

Only for a tool whose **current** coverage version is approved (`verified` or `govtech-published`):
- `uuid`: v5 over `leveraged|{scope}|{toolId}|v{version}`.
- `title`: "{tool} coverage, version {n}".
- `party-uuid`: the tool's party.
- `date-authorized`: the approval date (`approval.at`, first 10 characters).

The tool's SSP component also gets the prop `leveraged-authorization-uuid` with that UUID. Check the prop against the schema in the test. If the schema rejects it in the core namespace, put it in our namespace.

Tools that are not yet verified stay plain components, with no leveraged authorization.

### Our own props (default b)

Keep `responsibility` (our namespace) on each component-definition row, next to the roles. The roles cannot say `not-applicable` or `other-tool`. Also `lib/import/parse-agent-oscal.ts` and `lib/export/coverage-brief-md.ts` read and write this prop, and the agent round trip must not change.

### Component definition

`responsible-roles` on each implemented-requirement:
- `provided` → provider.
- `app-builder` → customer.
- `shared` → provider and customer. The builder part stays in `remarks`.
- `not-applicable`, `other-tool` → no roles.

## B. GenAI in OSCAL

- The OSCAL route uses the same rule as the spreadsheet route: GenAI is in when the plan has items with `profileId === 'generative-ai'`.
- `buildSsp` takes a list of profiles. It keeps the items of every profile in the list. Control IDs do not clash (`ga-*` and the IM8 IDs).
- `import-profile` points to one back-matter resource. Its title names the profiles in use, for example "Low-Risk Cloud + Generative AI (locally derived)". Its description keeps the `LOCALLY_DERIVED` wording.
- `buildComponentDefinition` takes each tool with all its version pairs. It writes one `control-implementation` for each profile where the tool has coverage. Each control-implementation has its own back-matter resource.
- If a tool has no coverage for a profile, that profile gets no control-implementation for the tool. Today genCentral has no coverage, so its GenAI items are this-system only, or remarks for the open ones.

## C. Check IDs on coverage rows

### Data

```ts
export type CheckKind = 'code-rule' | 'sbom' | 'pipeline';
export interface CoverageCheck {
  id: string;          // stable, lower-kebab, unique within the tool, e.g. "zod-schema-on-every-route"
  description: string; // one sentence: what passes
  kind: CheckKind;
}
// CoverageEntry gains: checks?: CoverageCheck[]
```

Rules:
- A check is only a link to a test that runs somewhere else. Blueprint does not run checks. A check never changes a placement or a status.
- `sameCoverage` also compares checks (same IDs, kinds and descriptions; order does not matter). A changed check makes the row "not yet verified" again, and the verifier page shows it as changed.
- New versions keep the checks. Next to `carrySources`, a `carryChecks(rows, previous)` copies the previous row's checks to each row that still has a value. Apply it where `carrySources` is applied (`app/admin/actions.ts`). `DraftRow` gets `checks?`. The editor has no input for checks yet.
- `validateNewVersion` copies `checks` to the entry when the list is not empty.

### Export (oscal-compass format)

So that C2P and the oscal-compass tools can read our component definitions:
- Component `props`: one rule set for each check: `Rule_Id`, `Rule_Description`, `Check_Id`, `Check_Description`. The props of one set share `remarks: "rule_set_{n}"`. `Rule_Id` and `Check_Id` both take the check ID. We have one ID for each check, and C2P needs both.
- Implemented-requirement `props`: `Rule_Id` for each check on that row.
- Our namespace: `check-kind` for each rule set, with the same `remarks`.
- Namespace for the oscal-compass props: before coding, take it from a current C2P or trestle sample component definition, and record the source in the code comment.

In the SSP, the checks attach to the builder's part:
- On a `shared` or `app-builder` row: `Rule_Id` props on the tool's R item and on the this-system `satisfied` item.
- On a `provided` row: `Rule_Id` props on P.

### Seed

`data/seed/libraries.json` groups accept `checks`. `seed-documents.ts` copies them into the entries.
- Zod, as-1: `zod-schema-on-every-route`, `code-rule`, "Every route handler parses its input with a Zod schema before use."
- Prisma, as-2: `no-query-raw-unsafe`, `code-rule`, "No call to `$queryRawUnsafe` or `$executeRawUnsafe`."

### Screens

The verifier page (`app/verify/[toolId]/page.tsx`) shows each row's checks in `describe`: "Checks: {id} ({kind})". No other screen changes.

## D. Evidence kind

```ts
export type EvidenceKind = 'self-declared' | 'machine-checked';
// Project.taskStatus values gain: evidence?: EvidenceKind   (absent = 'self-declared')
```

- Nothing writes `machine-checked` yet. The later Assessment Results import sets it.
- The SSP writes the prop `evidence-kind` (our namespace) on each `satisfied` item. It also writes the prop on the this-system by-component for `default-builder` and `answered-applies`.
- The "(self-declared)" text comes from the evidence kind, not from a fixed string.

## E. SHIP-HATS as a sample tool

Source: the SHIP-HATS documentation for pipeline templates and the compliance framework (developer.tech.gov.sg, read 2026-11-06). Compliance level 4 adds static scans, DAST, a deploy gate, signing and verification of artefacts, SLSA L1/L2 provenance and signed SBOMs.

Tool: `_id: "ship-hats"`, name "SHIP-HATS (compliance level 4)", section `wog`, `oscalType: service`, `isSample: true`. Its coverage version has source "Sample from the SHIP-HATS docs, not confirmed by a CPFB team". It has no approval.

Rows. Each one is `shared`, because the builder must include the template and keep the level:

| Row | Tool part (explanation) | Builder part | Check (`pipeline`) |
|---|---|---|---|
| sc-5 Build and release process | Pipeline templates make build records and SLSA provenance | Use the SHIP-HATS compliance template for every release | `ship-hats-compliance-template` |
| sc-7 Artefact signing | Level 3+ signs artefacts during the build | Keep `CF_LEVEL` at 3 or higher | `cf-level-4` |
| sc-8 Signature verification | Level 3+ verifies signatures before deployment | Keep `CF_LEVEL` at 3 or higher | `cf-level-4` |
| sd-4 Static analysis | Level 1+ runs SAST in the pipeline | Fix or risk-accept true positives | `cf-level-4` |
| sd-5 Dependency scanning | Level 1+ runs dependency scans | Fix or risk-accept findings in time | `cf-level-4` |

Check descriptions:
- `ship-hats-compliance-template`: "The project's pipeline includes the SHIP-HATS compliance template."
- `cf-level-4`: "The project's CI/CD variable CF_LEVEL is 4, or is not set (default 4)."

appCentral already says `provided` for sc-5, sd-4 and sd-5. If a builder picks both tools, both claims are decisive, and the SSP gets one P from each tool. This is not a conflict in the engine. The security team must review the mapping before anyone relies on it. The "not yet verified" label says this.

## Later (not built)

- **Assessment Results import.** A SHIP-HATS template job ("Blueprint check") runs the component rules and reads the scan reports. It sends OSCAL Assessment Results to Blueprint. Each result points at a `Rule_Id` and at the SSP's `satisfied` UUID. Blueprint then sets `evidence: machine-checked` and the status.
- **POA&M** for failed checks and open items. This is the end point for "send it for review".
- **Converter** from GitLab security reports to Assessment Results, our own or as a C2P plugin.
- **Editor field** for checks, checks in the coverage brief, and checks in `BUILD-PLAN.md`.

## Tests

In `test/export/oscal.test.ts` and the existing unit tests:
1. The SSP and the component definition pass the NIST 1.1.2 schemas for: the demo plan, the saved sample project, a plan with genCentral (GenAI on), and a plan with SHIP-HATS and Zod.
2. Each `inherited.provided-uuid`, `responsibilities.provided-uuid` and `satisfied.responsibility-uuid` points to an item in the same file.
3. Each `responsible-roles.role-id` is in `metadata.roles`. Each `party-uuids` entry and each leveraged `party-uuid` is in `metadata.parties`.
4. A leveraged authorization exists only for tools whose current version is approved.
5. Each `Rule_Id` on an SSP item is also a `Rule_Id` in the component definition for the same tool.
6. Placement table: one case for each row of the mapping table above.
7. `sameCoverage` and `carryChecks`: a change in a check is a change, and an unchanged row keeps its checks.
8. GenAI: with genCentral picked, the SSP contains `ga-*` requirements. Without it, it does not.
9. The agent round trip test does not change.
10. Snapshots change on purpose, and the commit says so.

## Risks

- **UUID stability.** The scope includes the tool IDs. Thus when a tool is added to or removed from a project, all UUIDs change. This is acceptable for now. The Assessment Results import must match by project and requirement, not by UUID alone.
- **oscal-compass format drift.** The prop names are a convention, not part of the NIST schema. We take them from a current sample and record the source.
- **Sample mappings.** SHIP-HATS, Zod and Prisma rows are samples. The labels and the "not yet verified" badge must stay.
