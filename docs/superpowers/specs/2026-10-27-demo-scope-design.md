# Demo scope: the build plan app

Agreed 2026-10-27 in a scoping chat. Written for the App planning session, which owns the technical design. This note covers what the demo must prove and what to build by Fri 30 Oct. It does not cover how to build it.

Update 2026-10-27 (App planning session, agreed with the user): Friday is a target, not a hard code freeze; work continues until 17 Nov. A thin version of saved projects is back in as the top Should item, with a time skip in demo moment 4.

Technical design (how to build it): [2026-10-27-build-plan-app-design.md](2026-10-27-build-plan-app-design.md).

Update 2026-10-27, later (App planning session, agreed with the user after reviewing GovTech's Component Guides for FormSG, WebSG, Isomer and CWP): coverage uses GovTech's four values, with "App Builder" in place of "Agency", plus "Handled by another tool" (as slide 12 says of DBaaS and IGA); DSS is a separate catalog and stays on the roadmap; spreadsheet values are Y / N / N/A plus Partial; Component Guide import is a Should; WebSG's and Isomer's published Low-Risk Cloud guides are seeded as "Published by GovTech".

## Problem statement

> How might we help app builders understand their security and compliance requirements early, so that they can plan their vibe-coded applications and leverage available tools with confidence?

The app must answer this first. OSCAL is how it works underneath, not what we are selling.

## What the app is

- **A build plan for app builders, not an SSP generator.** Pitch line: *"Know what's yours on day 0, hand it to your agent, and your SSP fills itself in."*
- **A builder who has never heard of IM8 or an SSP can use it from start to finish.**
- The SSP spreadsheet is the last step, proof that security gets what they already accept. It is not the centre of the app.

## Language rule

Builder screens use builder language. IM8, SSP and OSCAL terms belong to the backend, the exports and the admin/verifier screens.

- Main headings: **What you need to do**, **What your platform already does**, **Questions to answer**, **Good to have**.
- Every builder item explains *why it matters*. Use the Risk/Rationale column of `low-risk-cloud-ssp.xlsx`.
- Control IDs (e.g. `as-1`) appear only as secondary detail.

| Builder sees | Backend term |
|---|---|
| Security requirement / something to do | IM8 control |
| Your app type (e.g. "low-risk app on the cloud") | Profile (Low-Risk Cloud), risk level |
| Tool, platform, building block | Component (OSCAL component definition) |
| What your platform already does | Control implemented by a platform component |
| What you need to do | Builder responsibility |
| Questions to answer | Needs assessment |
| Good to have | Level 2 controls |
| Build plan | Markdown checklist for the coding agent |
| Security review spreadsheet | SSP (`low-risk-cloud-ssp.xlsx`, pre-filled) |
| Verified / not yet verified | Mapping verification status |

## Audience and format

- At most 7 minutes, slides plus a live demo, on 17 Nov.
- A mixed panel (leadership) that includes CPFB platform teams.
- Each group needs a moment: builders see clarity, security sees pre-filled rows they can trust, platform teams see their tool taking work off builders.

| Time | Section | Content |
|---|---|---|
| 0:00–1:00 | Problem (slide) | Today: build first, fill in the 118-row spreadsheet late, security reviews it, an agent checks the code inconsistently |
| 1:00–5:00 | Demo | The five moments below |
| 5:00–6:15 | Why it scales (slide) | Platform teams publish once and a verifier approves. Uses the same open standard (OSCAL) that GovTech publishes IM8 in. Roadmap: agents check code against verified components |
| 6:15–7:00 | Ask | Platform teams describe and verify what their tools cover; pilot with real builders |

## Demo story

One builder, one app idea, start to finish.

1. **Tell us about your app** (about 30s). Three or four questions from the user's risk table (data classification, sensitivity, impact, downstream impact). The app type is shown in plain words with the reason. *Proves: understand early.*
2. **Pick your tools** (about 75s). Pick appCentral, DBaaS and IGA, plus genCentral if the app uses AI. Counts update as tools are toggled. Unverified claims carry a "not yet verified" badge. *Proves: understand early; plan.*
3. **Hand it to your agent** (about 45s). Download the build plan, then play a pre-recorded clip of a coding agent using it. *Proves: plan and build.*
4. **Send it for review** (about 60s). Skip ahead two weeks: open a saved project where the builder has marked 7 of 11 tasks done and answered the questions. Download the pre-filled security review spreadsheet: platform rows already answered with sources, and the builder's rows now say Yes or Partial. *Proves: confidence; "your SSP fills itself in".*
5. **Platform cut-away** (about 30s). A platform team updates what its tool covers, the verifier approves it, and the badge flips for builders. *Proves: confidence; gives platform teams their moment.*

## What each part of the problem must prove

| Part | What it proves | Demo moments |
|---|---|---|
| Understand early | A builder knows what's theirs before writing code | 1, 2 |
| Plan and build | The tools you pick change your plan, and your agent builds from it | 2, 3 |
| Leverage tools with confidence | Platform claims can be trusted, and the output is what reviewers already accept | 4, 5 |

## Feature tiers for Friday

- **Must:** without it, a demo moment breaks.
- **Should:** makes a moment stronger. Drop these first if Friday slips.
- **Cut:** a roadmap slide or work after Friday.

### Must

- Risk questions leading to an app type, with the reason shown.
- Tool picker: appCentral, DBaaS, IGA, plus the CPF tools the user supplies. Unverified ones are labelled.
- Builder view with the four headings from the language rule, in builder language, with "why this matters" for each item.
- Counts that update as tools are toggled.
- Seed data: the Low-Risk Cloud catalog, appCentral's mapping from AEO TPC slide 12, DBaaS and IGA claims from the same slide marked not yet verified.
- Build plan download (Markdown for coding agents). It covers: what you need to do as concrete tasks, questions to answer, and a **"don't build this, your platform already does"** section (e.g. no custom login; use IGA/SSO).
- Pre-filled security review spreadsheet using the agreed rules (Y / N / N/A as in GovTech's own review drafts, plus Partial for shared and in-progress items; source in Explanation).
- Verified / not yet verified badge wherever a platform claim appears.
- Small admin page: edit one tool's coverage per requirement, plus a verifier Approve button. "Who handles it" uses GovTech's Component Guide values, renamed for CPFB: Provided by <tool> / Shared (<tool> + App Builder) / App Builder / Not applicable, plus Handled by another tool: <tool>, with an explanation (the builder's part, for Shared) and a source. We say "App Builder", never "Agency": to GovTech, CPFB is the agency; to CPFB's builders, our platform teams play GovTech's role.
- Role switcher (builder / admin / verifier) for the demo.

### Should

- **Saved projects, thin version (top Should).** "Save this plan" with a project name and an owner name typed in (no login, one shared project list). Each "What you need to do" item is To do / In progress / Done, exported as N / Partial / Y and labelled self-declared, with an optional note that goes into Explanation. Each "Questions to answer" item is Applies / Doesn't apply with a reason; "Doesn't apply" exports as N/A. A pre-loaded project supports the time skip in moment 4. No version history.
- GenAI requirements (ga-1 to ga-8) join the list when genCentral is picked.
- **Import a Component Guide** (GovTech's spreadsheet format). Upload creates a new not-yet-verified version of the tool. Unknown requirement IDs or a catalog/profile mismatch are rejected (the FormSG DSS guide must be rejected for Low-Risk Cloud). Use it to seed WebSG's and Isomer's published Low-Risk Cloud guides in a "Whole-of-government tools" section, labelled "Published by GovTech". Exporting a tool as a Component Guide is roadmap.
- Detail view per requirement: full statement, recommendation, who covers it, source.
- Libraries as tools (e.g. Zod), labelled samples, so the build plan can name them.
- OSCAL downloads (component definition, SSP JSON), as evidence for the "why it scales" slide.
- The tool and catalog versions an export used, written into the spreadsheet and JSON.

### Cut from Friday's build

- Project version history and login. (Saved projects themselves moved back to Should on 2026-10-27.)
- Requirement lists for the other app types. The risk questions may still name them as "not yet supported".
- Bulk edit by requirement family, the conditions field, the mapping-change banner with Apply, appCentral header login.
- An agent checking the finished code against the plan (roadmap slide).

## Data and numbers

Low-Risk Cloud has 118 requirements: 86 must-have or should-have (Level 0/1) and 32 good-to-have (Level 2).

With appCentral, DBaaS and IGA picked, the 86 split as:

| Group | Count | Status |
|---|---|---|
| Handled by appCentral | 42 | Verified (slide 12) |
| Not applicable on appCentral (IS, no hosts) | 9 | Verified (slide 12) |
| Handled by DBaaS (DP) and IGA (AC) | 15 | Not yet verified: the slide says so, but those teams have not confirmed it |
| What you need to do | 11 | AS 1, 2, 3, 7, 9; SC 4, 6; ST 4, 5; CS 3, 4 |
| Questions to answer | 9 | PM 1–6 (case by case); is-11, is-14, is-15 |

Headline: **86 requirements become 11 that are yours and 9 to check, known before any code is written.** Recheck these counts against the seeded data before they go on a slide.

GovTech's Component Guides (FormSG, WebSG, Isomer, CWP; received 2026-10-27) are the official, by-hand version of this app: each central product publishes a spreadsheet per catalog saying what it handles and what the agency must do, and agencies merge them into their SSP themselves. Useful numbers for the "why it scales" slide:

- WebSG and Isomer each leave 18 of 117 Low-Risk Cloud requirements to the agency (their own summary rows).
- In FormSG's review draft, GovTech reviewers questioned 31 of 92 rows and 9 answers changed before publishing: verification is real work.
- CWP's guide gives the same app-code requirements to the app team (input validation, parameterised queries, sanitisation, access scope, CSP, penetration testing and fixing findings) that slide 12 gives appCentral builders: 7 of the 11.

Tools beyond appCentral: the user will supply more CPF tools as components so the demo is not centred on appCentral. Each is listed as "not yet verified" until its team confirms what it covers. The brief forbids inventing which controls a CPFB platform satisfies, so any coverage shown for these tools must be labelled as a sample.

## Open items

- The user supplies the extra CPF tools.
- The slide says *who* covers each requirement, not *how*. Platform rows will read "Handled by appCentral (source: AEO TPC slide 12)". Asking platform teams to write the "how" is part of the closing ask.
- Recheck the headline numbers once the seed data is in.
- Record the coding agent clip after Friday.
- Optional before Friday: ask one or two builders who don't use appCentral, "What do you wish you'd known on day 0?"
