---
version: 1
slug: "app-layout-tsx"
primary_target: "app/layout.tsx"
related_targets: ["app/start/page.tsx","app/plan/page.tsx","app/projects/page.tsx","app/admin/page.tsx","app/verify/page.tsx"]
---

# Surface brief: whole-app redesign on SGDS

## Scope and visitor mode

Every route: /start, /plan, /projects, /projects/[id], /admin (editor, import), /verify. Mode: Operate. Builders get the most traffic; admins and verifiers get equal design care (user, 2026-10-28).

## Audience, task, constraints

- Builders answer four risk questions, pick tools, read a plan sorted into four headings, tick off tasks, and download two files.
- Admins edit which requirements a tool covers; verifiers approve the newest version.
- Pinned by the user: use the Singapore Government Design System (SGDS v3) and its components for the whole app. No masthead, no GovTech or agency logos. Day theme only. Inter is self-hosted so the demo works offline.
- Presentation only: routes, data, behaviour, exports and the builder-language rule stay. Controls keep stable accessible names; e2e tests change deliberately where a native control becomes an SGDS one.
- Build rules: components from `@govtechsg/sgds-web-component/react`, utilities only as `sgds:` classes, no unprefixed Tailwind, no custom control where an SGDS one exists.

## Chosen direction and memorable moment

SGDS as shipped: the Application shell (operational) and Form page templates. The memorable moment is the plan itself: tick a tool and the four counts and every badge change at once.

## Unresolved

- Full name of SII on /start (user has not confirmed). CII is Critical Information Infrastructure.

## Direction contract

THESIS: A working government-service app made only of SGDS parts, where the ownership split is the screen: what is yours is the loud primary action, what the platform already does is quiet, verified evidence. It refuses the generic indigo-chip dashboard it replaces.

OWN-WORLD: SGDS day theme as shipped. A white main navigation with a purple active underline, Inter, a gray alternate ground under white surfaces, SGDS primary purple for actions, semantic success, warning, info and neutral for verification states. Only SGDS spacing, radius and type tokens; nothing drawn by hand that a component already is.

STORY: A builder sees on day 0 what is theirs to build, trusts what the platform covers because each claim carries its source and verification, and leaves with a plan an agent can follow.

FIRST VIEWPORT: White main nav across the top: brand left in semibold, New plan and Saved projects, then three quiet outline role buttons and Reset demo data right. On /plan below it: the h1 "Your build plan", the app type, a primary "Build plan for your agent" button and an outline "Security review spreadsheet" button, then one compact two-row accordion (the agent snippet to copy, the machine-readable files; the snippet is part of the demo), then "What you need to do" with its count. On wide screens the tool picker (an SGDS card with a checkbox, description and verification badge per tool) sits in a left column beside all of that; on phones it comes after the buttons and before the sections.

FORM: Application shell (operational) with the Form page template for /start and the admin editor; position 1 of 1, pinned by the user. seed: none (direction pinned by user).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
