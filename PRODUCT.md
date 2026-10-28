# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **App Builders** at CPFB (the CPF Board) who are about to build an app on CPF's shared platform tools. They are developers and tech leads, not security specialists. They use /start, /plan and /projects. They arrive on day 0 and come back two weeks later to tick off tasks and send the app for review.
- **Platform admins**, the people who run a CPF tool (for example appCentral, DBaaS, IGA). They use /admin to say which security requirements their tool covers, and import GovTech's published Component Guides.
- **Verifiers**, who use /verify to approve a new version of a tool's coverage before builders see it as "Verified".

Admins and verifiers are weighted equally with builders for design care (confirmed by the user on 2026-10-28), though builders reach their screens most often.

## Product Purpose

A build plan for app builders, not a security-plan generator. A builder answers a few risk questions, picks the CPF tools the app will use, and sees every requirement sorted under four plain headings: what they need to do, what their platform already does, questions to answer first, and good to have. They download `BUILD-PLAN.md` to hand to a coding agent and a pre-filled Low-Risk Cloud security review spreadsheet. Success: the builder knows what is theirs on day 0, and the review paperwork is mostly filled in by the time the app is built.

## Positioning

"Know what's yours on day 0, hand it to your agent, and your SSP fills itself in." The coverage claims come from the platform teams themselves (admin-edited, verifier-approved, versioned, with a source on every claim), so a builder can trust "your platform already does this" instead of re-checking it.

## Operating Context

- Singapore public-sector security requirements: the IM8 Low-Risk Cloud profile (118 requirements) and the Generative AI catalog (8). Seeded numbers on the demo project: 42 verified plus 15 not-yet-verified provided, 9 not applicable, 11 the builder's, 9 questions (86 that must or should be done).
- Demo moments (docs/run-through.md): tell us about your app, pick your tools, hand it to your agent, send it for review two weeks later, the platform-team cut-away. Presented 2026-11-17 at a hackathon venue, possibly on unreliable Wi-Fi.
- Runs locally on 127.0.0.1 with MongoDB in Docker; no remote, no accounts. A role switcher in the header (Builder, Admin, Verifier) stands in for sign-in.

## Capabilities and Constraints

- Next.js 16 App Router, TypeScript, Tailwind 4, MongoDB. Business logic is pure and shared by client and server. The redesign changes presentation only: behaviour, data, routes and exports stay as they are.
- Builder-language rule (the user feels strongly): builder screens (/start, /plan, /projects) must not show "IM8", "SSP", "OSCAL", "control" or "agency" in our own copy. Say "App Builder", never "Agency". Official wording may appear in the detail panel and in exports. GovTech's own wording stays out of builder lists.
- Verification vocabulary is part of the product: Verified, Not yet verified, Published by GovTech; per-row, per-version. A tool version is never auto-approved.
- Tests find controls by accessible name and role (212 unit, 27 integration, 4 Playwright). A redesign must keep names and roles stable or update the tests deliberately.
- Undecided: the full name of "SII" on /start (the user has not yet confirmed it). CII is Critical Information Infrastructure.

## Brand Commitments

- **Use the Singapore Government Design System (SGDS v3, https://designsystem.tech.gov.sg/) and its components for the whole app.** The user pinned this on 2026-10-28.
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

SGDS components are built to government accessibility standards; keep their keyboard and screen-reader behaviour intact and do not restyle away focus rings or contrast. Every control keeps a stable accessible name (the Playwright tests depend on it).
