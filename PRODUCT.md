# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **App Builders** at CPFB (the CPF Board) who are about to build an app on CPF's shared platform tools. They are developers and tech leads, not security specialists. They use /start and /projects. They arrive on day 0 and come back two weeks later to check off controls and send the app for review.
- **Platform admins**, the people who run a CPF tool (for example appCentral, DBaaS, IGA). They use /admin to say which security requirements their tool covers, and import GovTech's published Component Guides.
- **Verifiers**, who use /verify to approve a new version of a tool's coverage before builders see it as "Verified".

Admins and verifiers are weighted equally with builders for design care (confirmed by the user on 2026-10-28), though builders reach their screens most often.

## Product Purpose

The security plan (SSP) is the plan. A builder answers a few risk questions, sees the plan drawn as a hotel (what their app needs), and saves it. On the saved project they pick the CPF tools the app uses, and every control is either done or not done: a tool does its controls for them, and they check off the rest. They give a coding agent the SSP file with a short prompt ("Prompt your agent"), and download a pre-filled Low-Risk Cloud security review spreadsheet. Success: the builder knows what is theirs on day 0, and the review paperwork is mostly filled in by the time the app is built.

## Positioning

"Know what's yours on day 0, prompt your agent with the SSP, and your SSP fills itself in." The coverage claims come from the platform teams themselves (admin-edited, verifier-approved, versioned, with a source on every claim), so a builder can trust "your platform already does this" instead of re-checking it.

## Operating Context

- Singapore public-sector security requirements: the IM8 Low-Risk Cloud profile (118 requirements) and the Generative AI catalog (8). Seeded numbers on the demo project: 42 verified plus 15 not-yet-verified provided, 9 not applicable, 11 the builder's, 9 questions (86 that must or should be done).
- Demo moments (docs/run-through.md): tell us about your app, pick your tools, prompt your agent with the SSP, send it for review two weeks later, the platform-team cut-away. Presented 2026-11-17 at a hackathon venue, possibly on unreliable Wi-Fi.
- Runs locally on 127.0.0.1 with MongoDB in Docker; no remote, no accounts. A role switcher in the header (Builder, Admin, Verifier) stands in for sign-in.

## Capabilities and Constraints

- Desktop only: nobody uses the app on a phone (user, 2026-10-28).
- Next.js 16 App Router, TypeScript, Tailwind 4, MongoDB. Business logic is pure and shared by client and server. The redesign changes presentation only: behaviour, data, routes and exports stay as they are.
- Builder-language rule (the user feels strongly): builder screens (/start, /plan, /projects) must not show "IM8", "SSP", "OSCAL", "control" or "agency" in our own copy. Say "App Builder", never "Agency". Official wording may appear in the detail panel and in exports. GovTech's own wording stays out of builder lists.
- Verification vocabulary is part of the product: Verified, Not yet verified, Published by GovTech; per-row, per-version. A tool version is never auto-approved.
- Tests find controls by accessible name and role (212 unit, 27 integration, 4 Playwright). A redesign must keep names and roles stable or update the tests deliberately.
- Undecided: the full name of "SII" on /start (the user has not yet confirmed it). CII is Critical Information Infrastructure.

## Brand Commitments

- **Blueprint world (user, 2026-10-28), replacing SGDS.** The app looks like an architect's drawing set: white drafting paper with a faint blue grid and dark blue ink; deep blueprint blue only in the title block, the floor plan and approval stamps. Every page is a drawing sheet with a title block. The name "Blueprint" carries the metaphor: plan before you build.
- **Own controls, no SGDS.** The Singapore Government Design System components were removed at the user's request; every control is plain HTML styled from one shared token set, and design choices must be consistent across every screen.
- **The hotel as the overview.** One part per family of controls. A part fills as controls are done, by the tools or by the builder; open questions are marked. On a new plan the hotel has the full width (step 4). On a saved project it sits beside the checklist (Plan tab), and a click on a part opens the Hotel tab close up. The warm light is only for parts the tools did completely, with every claim verified.
- **A saved project has two tabs and no steps.** Plan: the hotel beside the checklist, with a header that always shows how far it has got. Hotel: the whole hotel, with zoom-ins and the text of each control. Controls are ticked in the checklist only.
- No official Singapore Government masthead and no GovTech or agency logos: this is a local prototype, not a live .gov.sg service (confirmed by the user on 2026-10-28).
- Voice: plain, direct, second person. "App Builder", never "Agency".

## Evidence on Hand

- Seeded data in `data/seed/` and a sample project ("Sample project (two weeks in)") with 17 tasks, so every screen can be shown with real content.
- The existing screens in `app/` as the incumbent behaviour. No screenshots, user research, or usage data exist; none should be invented.

## Product Principles

1. Lead with what the builder must do; show what the platform already covers as evidence, not as the headline.
2. Every claim shows who says so and whether a verifier has approved it.
3. Plain words on builder screens; official wording one click away.
4. The same plan must be readable by a person and by a coding agent.
5. Nothing is silently hidden or auto-approved: unsaved, unverified and failed states are visible.

## Accessibility & Inclusion

Native HTML controls carry the keyboard and screen-reader behaviour; keep visible focus rings and WCAG AA contrast. Every control keeps a stable accessible name (the Playwright tests depend on it).
