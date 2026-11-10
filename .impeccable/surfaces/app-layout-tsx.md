---
version: 1
slug: "app-layout-tsx"
primary_target: "app/layout.tsx"
related_targets: ["app/start/page.tsx","app/start/verdict/page.tsx","app/start/app/page.tsx","app/start/needs/page.tsx","app/projects/[id]/tools/page.tsx","app/projects/[id]/page.tsx","app/projects/page.tsx","app/admin/page.tsx","app/verify/page.tsx"]
---

# Surface brief: builder journey with the hotel (light Blueprint)

Replaces the 2026-10-28 drawing-sheet brief (approved by the user, 2026-11-10). Spec: `docs/superpowers/specs/2026-11-06-builder-journey-design.md`.

## Scope and visitor mode

- Mode: Operate. Desktop only, 1280×800 and 1440×900.
- Builder journey: steps 1 to 3 (`/start`, `/start/verdict`, `/start/app`), step 4 (`/start/needs`), step 5 (`/projects/[id]/tools`), and the go at the top of step 6 (`/projects/[id]`).
- The tokens (ground, ink, type, corners) change for the whole app, so the admin and verifier screens get them now and keep their layout until sub-project 2 (user, 2026-11-10).
- Not here: the full step 6 redesign, the admin and verifier layouts.

## Audience, task, constraints

- A CPFB officer who builds a small app with a coding agent, not a security specialist. They arrive after the risk questions and ask: what does my app need, and how much of it do the tools do?
- Step 4: see everything the app needs as one hotel, then save. Step 5: each tick builds part of the hotel. Step 6: the go, and the one build plan download.
- Proof is the real seed counts and the Verified or Not yet verified state of each claim.
- Anti-goals: a compliance form, a dashboard, a legend, state shown by colour alone.
- Ranges: 12 parts with 2 to 18 requirements each; a part can have 0 ("Nothing for your app"); 0 tools is a valid answer; a tool name up to about 20 characters in a label; a reason up to 280 characters.
- Hotel states: loading and WebGL off (still image), reduced motion (no drop, roof open from the start).
- `three` and `@fontsource-variable/archivo` are served from the app, so the demo works without Wi-Fi.

## Chosen direction and memorable moment

A tick on a tool makes drawn parts of the hotel drop in as built pieces, and the light comes on only when every claim is Verified.

Layout: a simple header (product name, "Step n of 5", role switcher). Two columns. Left, about 60%: the hotel, which stays in place. Right, about 40%: the side panel, the only column that scrolls. The one main action stays at the foot of the side panel, always in view. The "Parts of your app" list is the keyboard path.

## Unresolved

- Full name of SII; the contact text for the "can't plan yet" verdict; the final stage-neutral words.

## Direction contract

THESIS: The app is a hotel that is first a drawing and then gets built. The officer sees what the app needs as parts of a building, and each tool they tick builds some of it. It refuses the compliance checklist and the dashboard of cards, chips and progress bars.

OWN-WORLD: Drafting-white ground (#f6f8fa), navy ink (#1c2b3a), soft ink (#4b5c70). The hotel is the only colour on the page: blue line (#5f86b3) on a pale fill (#eef3f9) for parts no tool does; warm Kenney materials for parts a tool does; warm light (#ffc879) only when every claim is Verified; red (#b8322a) only for questions. Archivo in three widths: wide (about 112%) for page headings, normal for reading, narrow (about 80%) for hotel labels and counts; Roboto Mono only for official requirement codes. One ink-colour main action per step; other actions are links or outline buttons. 3px corners, 1px rules, no shadows, no grid paper, no title-block cells, no legend. The blue line is for drawing only, never for text.

STORY: The officer sees the whole hotel as a drawing and understands what each part protects. After the save, they tick their tools and watch most of the hotel get built. They leave knowing the few parts that are theirs, with the build plan for their agent.

FIRST VIEWPORT: Step 4 at 1280×800. Header across the top. Left 60%: the isometric hotel cutaway, all blue line, with two-line labels on leader lines ("CCTV · Logging" / "18 requirements") and the parts list under it. Right 40%: the heading "What your app needs", the line with the totals, then the part details (summary sentence first, then "Show all {n} requirements"). "Save this plan" in ink at the foot of the right column.

FORM: Isometric hotel cutaway (Three.js, orthographic, Kenney kits) with a scrolling side panel; chosen with the user after the surface round and the template research. seed:36f5bde92930a801

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
