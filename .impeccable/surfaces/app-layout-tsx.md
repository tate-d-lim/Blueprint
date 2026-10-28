---
version: 1
slug: "app-layout-tsx"
primary_target: "app/layout.tsx"
related_targets: ["app/start/page.tsx","app/plan/page.tsx","app/projects/page.tsx","app/admin/page.tsx","app/verify/page.tsx"]
---

# Surface brief: whole app as a blueprint drawing set

## Scope and visitor mode

Every route: /start, /plan, /projects, /projects/[id], /admin (editor, import), /verify. Mode: Operate. Desktop only. Builders get the most traffic; admins and verifiers get equal design care.

## Audience, task, constraints

- Builders answer four risk questions, pick tools, read a plan sorted into four headings, tick off tasks, and download two files.
- Admins edit which requirements a tool covers; verifiers approve the newest version.
- Pinned by the user (2026-10-28): blueprint world; white paper, blue ink; every page a drawing sheet with a title block; own controls instead of SGDS; one consistent token set; floor plan of families as overview and filter on /plan and saved projects.
- Presentation and the floor plan only: routes, data, exports and the builder-language rule stay.

## Chosen direction and memorable moment

The floor plan. Tick appCentral on a new plan and its rooms turn from dashed outlines into built rooms; on a saved project, the builder's rooms fill as tasks are done; click a room and the plan below narrows to it.

## Unresolved

- Full name of SII on /start (user has not confirmed).

## Direction contract

THESIS: An architect's drawing set for a security plan: before you build, see which rooms your platform has already built and which are yours. It refuses the generic dashboard of cards, chips and progress bars.

OWN-WORLD: White drafting paper with a faint blue grid on a pale blue-grey drafting table; dark navy ink for text and lines; deep blueprint blue (#1D4E89) only for the title block, built rooms, done work, approval stamps and the one primary action; redline red (#B8322A) only for what needs attention. Barlow for reading, Barlow Semi Condensed for headings and lettering. Drawing conventions carry meaning: hatch = built by your tools, solid = done, diagonal hatch = in progress, dashed = to do, red cloud = open question. Square 2px corners, ruled 1px lines, no shadows except dialogs. Uppercase lettering only inside the title block.

STORY: A builder sees on day 0 that half the building already stands, finds their rooms, and two weeks later watches them fill in.

FIRST VIEWPORT: The title block across the top of the sheet: Build plan lettering, the sheet tabs (New plan, Saved projects, and Admin or Verify), the project and owner cells on a saved project, and "Viewing as" with Reset demo data. Below it on /plan: the heading and the two downloads, then the floor plan full width with its legend and the room filter line, then the tool picker at left and the four sections at right.

FORM: Drawing sheet with title block, floor plan as the signature; position 1 of 1, pinned by the user. seed: none (direction pinned by user).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
