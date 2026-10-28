---
name: Build plan for CPFB app builders
description: A blueprint drawing set. White grid paper, navy ink, blueprint blue for what is built, redline for what needs attention.
colors:
  blueprint: "#1d4e89"
  blueprint-deep: "#163c6b"
  blueprint-wash: "#e7eef8"
  redline: "#b8322a"
  redline-wash: "#fbedeb"
  ink: "#0f2a4a"
  ink-soft: "#4a6280"
  rule: "#c3d1e2"
  rule-strong: "#6f89ad"
  paper: "#ffffff"
  grid: "#edf2f8"
  grid-major: "#dce6f2"
  table: "#e8eef5"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
  lead:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.12em"
  code:
    fontFamily: "Roboto Mono Variable, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
rounded:
  xs: "2px"
spacing:
  grid-minor: "16px"
  grid-major: "80px"
  panel-x: "20px"
  panel-y: "16px"
  dialog-x: "24px"
  sheet: "40px"
components:
  button-primary:
    backgroundColor: "{colors.blueprint}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.blueprint-deep}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xs}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.blueprint-wash}"
  button-quiet:
    textColor: "{colors.blueprint}"
    height: "40px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: "0 12px"
    height: "40px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.xs}"
    padding: "16px 20px"
  title-block:
    backgroundColor: "{colors.blueprint}"
    textColor: "{colors.paper}"
    padding: "12px 20px"
  segmented-chosen:
    backgroundColor: "{colors.blueprint-wash}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    height: "36px"
  stamp-approved:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blueprint}"
    typography: "{typography.small}"
    rounded: "{rounded.xs}"
  stamp-pending:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.redline}"
    typography: "{typography.small}"
    rounded: "{rounded.xs}"
  note-attention:
    backgroundColor: "{colors.redline-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xs}"
    padding: "12px 16px"
---

# Design System: Build plan for CPFB app builders

## Overview

**Creative North Star: "The Drawing Set"**

Every page is one sheet of an architect's drawing set. The sheet has a double ruled frame. A blueprint blue title block runs across the top. Below it is white paper with a faint blue grid. The sheet sits on a pale blue-grey drafting table.

The plan is drawn as a building. Each requirement family is a room. Drawing conventions carry the meaning: hatch is built by your tools, solid blue is done, cross-hatch is in progress, a dashed outline is to do, a dotted outline does not apply, and a red revision cloud is an open question. Lines are thin and ruled. Corners are square. Nothing floats except dialogs and the editor's save dock.

The system is small on purpose. There is one token set, one kit of shared components in `app/ui/`, and seven type steps. A new screen uses these and nothing else. The app is for desktop only.

**Key Characteristics:**
- White grid paper, navy ink, 1px ruled lines, 2px corners.
- Blueprint blue is rare: the title block, built and done areas, approval stamps, the one primary action.
- Redline appears only where something needs attention.
- Seven type steps. Uppercase lettering only in the title block.
- Lists are ruled schedules, not stacks of cards.
- Panels are ruled, not shadowed.

## Colors

Blue ink on white paper, with one red pen for corrections.

### Primary
- **Blueprint Blue** (blueprint): the title block, built rooms (as hatch), done areas (solid), approval stamps, the one primary button, links, focus rings and checkbox accents.
- **Deep Blueprint** (blueprint-deep): hover state of the primary button only.
- **Blueprint Wash** (blueprint-wash): the hatch ground, a chosen segment, a chosen room, hover on secondary buttons and rows, text selection, info and success notes.

### Secondary
- **Redline** (redline): attention only. Revision clouds, the "Not yet verified" stamp, field errors, attention and error notes.
- **Redline Wash** (redline-wash): the fill inside a revision cloud and the ground of attention and error notes.

### Neutral
- **Drafting Ink** (ink): all text, the sheet frame, room walls, table header rules, dialog borders.
- **Soft Ink** (ink-soft): descriptions, hints, counts, placeholders, the legend.
- **Rule** (rule): 1px lines between rows, panel borders, divider strips.
- **Strong Rule** (rule-strong): borders of controls (fields, secondary buttons, segmented strips).
- **Paper** (paper): the sheet, panels, dialogs, fields.
- **Grid** (grid) and **Major Grid** (grid-major): the drafting grid lines, every 16px and every 80px.
- **Drafting Table** (table): the page ground around the sheet.

### Named Rules
**The Blueprint Budget Rule.** Blueprint blue fills only the title block, built and done areas, approval stamps and the one primary action. Everything else is ink on paper.

**The Redline Rule.** Redline means "needs attention". Never use it for decoration, emphasis or brand.

## Typography

**Body Font:** Barlow (with system-ui)
**Display Font:** Barlow Semi Condensed (with Barlow, system-ui), for headings, labels on controls, room names and lettering.
**Code Font:** Roboto Mono Variable (with ui-monospace), for commands and the agent snippet, at the small step.

**Character:** A plain engineering sans for reading, with its condensed sibling as drafting lettering.

### Hierarchy
- **Display** (600, 34px, 1.1): the page title in PageHeader. One per page.
- **Heading** (600, 26px, 1.15): page sections in SectionHeading, the floor plan heading, the "Build plan" lettering in the title block.
- **Title** (600, 22px, 1.25): Panel and Dialog titles, rendered by the component from a plain string. Also the count beside a SectionHeading.
- **Lead** (18px, 1.35): sub-sections inside panels and dialogs, legends of radio groups, note titles, room names and sheet tabs (all in the display face, 600). Also the description under a page title (Barlow, ink-soft).
- **Body** (400, 16px, 1.5): running text, rows, fields, field labels (display face, 600), md buttons.
- **Small** (400, 14px, 1.45): hints, descriptions, stamps, tags, table headers, segmented choices, sm buttons, code.
- **Label** (600, 11px, 0.12em, uppercase): title-block cell labels only.

### Named Rules
**The Seven Steps Rule.** Use only text-label, text-small, text-body, text-lead, text-title, text-heading and text-display. Never write a pixel font size.

**The Title Block Lettering Rule.** Uppercase lettering and the label step appear only in title-block cells. No uppercase labels, small caps or kickers anywhere else.

**The Heading Ladder Rule.** Page title is PageHeader (display). Page sections are SectionHeading (heading). Panel and Dialog titles are plain strings that the component draws at the title step. Sub-sections inside panels and dialogs use lead.

## Layout

The sheet is centred on the drafting table, up to 1400px wide with a 32px margin. It has a 1px ink border and a second, lighter outline 4px outside it. The title block runs the full width. The sheet body has 40px padding on the drafting grid.

Content widths are fixed by role:
- Tables, the floor plan and other work surfaces use the full sheet.
- A page that is one form uses max-w-page (1040px), for example the start page and the import page.
- A form inside an editor uses max-w-form (880px).
- A short message (an error, a role gate, a missing database) uses max-w-message (640px).
- Running text stops at max-w-measure (72ch).

Lists of items are one ruled box with 1px rule lines between rows. The plan's four sections and the editor's rows follow this. Panels pad 20px by 16px. Dialogs pad 24px.

The app is desktop only. There are no mobile layouts.

### Named Rules
**The One Schedule Rule.** A list of items is one ruled box with 1px rules between rows. Never a stack of separate cards.

**The Width By Role Rule.** Choose the width by what the content is (work surface, single-form page, editor form, message, running text), never by eye.

## Elevation & Depth

The sheet is flat. Depth comes from ruled lines, the double frame and the grid, not from shadows. Panels, tables and the floor plan have a border and no shadow. Only layers that float above the sheet cast a shadow.

### Shadow Vocabulary
- **Dialog** (`box-shadow: 0 12px 40px rgb(15 42 74 / 0.25)`): modal and side dialogs, over a 35% ink backdrop.
- **Dock** (`box-shadow: 0 -6px 16px rgb(15 42 74 / 0.08)`): the editor's sticky save dock over scrolling rows.

### Named Rules
**The Ruled Not Shadowed Rule.** A panel gets a 1px rule. A shadow means the layer floats: a dialog or the save dock, and nothing else.

## Shapes

Corners are square, at 2px. Lines are 1px. The floor plan draws its outer walls at 2px ink and inner walls at 1px ink, as on a real plan. Stamps are double ruled: a 1px border with a 1px outline 1px outside it. The revision cloud is a scalloped redline border that repeats along any box size.

## Components

### Buttons
Lettered, square and plain.
- **Shape:** 2px corners. md is 40px high with 16px side padding at body; sm is 32px high with 12px side padding at small. Display face, 600.
- **Primary:** solid blueprint with paper text. Hover goes to deep blueprint.
- **Secondary:** paper with a strong-rule border and ink text. Hover gives a blueprint border and wash.
- **Quiet:** blueprint text with no box. Hover underlines.
- **Focus:** 2px blueprint outline, 2px offset, everywhere.
- **Disabled:** 45% opacity.
- Links that move between pages and file downloads use the same classes, so they match buttons exactly.

### Segmented control
A ruled strip of choices, divided like title-block cells. 36px high, small step, display face. The chosen cell gets the blueprint wash and a 2px blueprint underline. Use it for every choice strip (status filters, yes or no answers).

### Stamps and tags
- **Stamp:** a small double-ruled box at the small step. Approved is blueprint. Pending ("Not yet verified") is redline. Published (by GovTech) is ink. Sample is dotted soft ink.
- **Tag:** a single 1px rule box in soft ink, for neutral facts such as "Optional" or "App Builder".

### Panels
- **Corner Style:** 2px.
- **Background:** paper.
- **Shadow Strategy:** none. See Elevation & Depth.
- **Border:** 1px rule. An optional title strip is ruled off below the title.
- **Internal Padding:** 20px by 16px. A scrolling panel keeps the title strip fixed and scrolls only the body.

### Inputs / Fields
- **Style:** paper, 1px strong-rule border, 2px corners, 40px high, body step.
- **Label:** above the control, display face, body step, 600. Hint below the label at small in soft ink.
- **Focus / Hover:** border goes to blueprint, plus the global focus ring.
- **Error:** redline border and a redline message at small.
- Checkboxes and radios are native, 18px, with a blueprint accent.

### Notes
A note on the drawing. One 1px border on every side, 2px corners, 12px by 16px padding. Info and success use blueprint wash. Attention and error use redline wash. Never a thick side stripe.

### Tables and disclosures
- **Table:** a drawing schedule. A 1px ink rule under the header row, 1px rules between rows, headers at small in the display face, numbers in tabular figures.
- **Disclosure:** a row that opens, with a blueprint chevron that turns 90 degrees. Used for every collapsible list.
- **Breadcrumb:** small, soft ink, blueprint links, slash separators.

### Dialog
Native dialog. A centred dialog is up to 560px wide. A side dialog is a full-height panel from the right, up to 720px wide, for detail views. Ink border, paper ground, the dialog shadow. The title strip and footer are ruled off. The close button is a 32px square ruled button.

### Navigation: the title block
The page header is the drawing's title block. It is a full-width blueprint band of ruled cells with paper lettering. Each cell has a label at the label step over its value. The cells are Drawing ("Build plan" lettering), Sheets (the page tabs), the sheet's own cells, Viewing as, and Demo data. The current sheet tab is underlined 2px; the others are 80% paper. A saved project adds its Project, Owner and Revised cells through the @titlecells parallel route. Other sheets render no cells.

### Floor plan (signature component)
The plan drawn as a building, full width on /plan and on a saved project.
- One room per requirement family, named with roomName from lib/plan/floor-plan.ts. Rooms are sized by requirement count and arranged in three rows.
- Each room's floor is split into areas sized by count: hatch for built, solid blueprint for done, cross-hatch for in progress, dashed blueprint for to do, dotted soft ink for does not apply, a revision cloud for questions. Areas grow and shrink in place over 700ms; reduced motion turns this off.
- A name plate sits on the floor: a ruled paper box with the room name at lead and its status at small. A chosen room turns its plate solid blueprint and its floor to wash.
- Choosing a room filters the lists below (?room=). A status line under the plan says what is shown, with a quiet "Show all rooms" button.
- A legend in the header shows each convention at a small size.

## Do's and Don'ts

### Do:
- **Do** build every screen from the kit in app/ui/ and the tokens in app/globals.css.
- **Do** use only the seven type steps.
- **Do** use PageHeader for the page title, SectionHeading for page sections, and plain-string titles for Panel and Dialog. Use lead for sub-sections inside them.
- **Do** keep one primary action visible at a time. Use secondary (ruled paper) and quiet (text) for the rest.
- **Do** use the Segmented control for every choice strip.
- **Do** put lists in one ruled box with 1px rules between rows.
- **Do** pick widths by role: full sheet, max-w-page, max-w-form, max-w-message, max-w-measure.
- **Do** use stamps for exceptions only: not yet verified, published by GovTech, sample. Show "Verified" in the tool picker and the detail dialog.
- **Do** use one name per requirement family, from roomName, on every screen.
- **Do** use tabular figures (tnum) for counts and dates.

### Don't:
- **Don't** write pixel font sizes, or use text-label or uppercase outside title-block cells.
- **Don't** use blueprint blue for decoration, or redline for anything that does not need attention.
- **Don't** add shadows to panels, tables or the floor plan.
- **Don't** stack separate cards for a list.
- **Don't** repeat a "Verified" stamp on every list item.
- **Don't** show two solid primary buttons at the same time.
- **Don't** write IM8, SSP, OSCAL, control(s) or agency in our own copy on builder screens. Quoted official wording in the detail dialog is allowed.
- **Don't** round corners past 2px or use pill shapes.
- **Don't** build mobile layouts.
