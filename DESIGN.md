---
name: Blueprint for CPFB app builders
description: A hotel that is first a drawing and then gets built. Drafting-white ground, navy ink, and the hotel as the only colour on the page.
colors:
  ground: "#f6f8fa"
  paper: "#ffffff"
  ink: "#1c2b3a"
  ink-soft: "#4b5c70"
  rule: "#d5dce4"
  rule-strong: "#9aa8b8"
  hotel-line: "#5f86b3"
  hotel-fill: "#eef3f9"
  hotel-light: "#ffc879"
  redline: "#b8322a"
  redline-wash: "#fbeceb"
  done: "#2c7a56"
  done-wash: "#e4f2ea"
  working: "#d08f1d"
  working-wash: "#fdf3dd"
typography:
  display:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontVariation: "wdth 112"
  heading:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.15
    fontVariation: "wdth 112"
  title:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
  lead:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
  code:
    fontFamily: "Roboto Mono Variable, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
rounded:
  sm: "3px"
spacing:
  header: "56px"
  page-x: "32px"
  panel-x: "20px"
  panel-y: "16px"
  side-panel-x: "32px"
  dialog-x: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.ground}"
  button-quiet:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "40px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "40px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "16px 20px"
  header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "56px"
    padding: "0 32px"
  segmented-chosen:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    height: "36px"
  stamp-pending:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.redline}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
  note-attention:
    backgroundColor: "{colors.redline-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  hotel-label:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    width: "192px"
    height: "46px"
---

# Design System: Blueprint for CPFB app builders

## Overview

**Creative North Star: "The Hotel Drawing"**

The app is a hotel that is first a drawing and then gets built. The officer sees what the app needs as parts of a building, drawn as an isometric cutaway in thin blue line on a pale fill. Each tool they tick builds some of those parts in warm Kenney materials. The light comes on only when every claim is Verified.

The page around the hotel is quiet on purpose: drafting-white ground, navy ink, 1px rules, 3px corners, no shadows. The hotel is the only colour on the page. There is no grid paper, no title block, no legend. State is never colour alone: each hotel label carries words and a count.

One token set serves every screen, including the tool owner and admin screens, which took the tokens but keep their older layout until their own redesign. The app is desktop only (1280 by 800 and up).

**Key Characteristics:**
- Drafting-white ground, navy ink, 1px rules, 3px corners, no shadows.
- One typeface, Archivo, in three widths: wide for page headings, normal for reading, narrow for hotel labels and counts.
- The hotel carries all the colour. The page carries none.
- One ink main action per step. Other actions are outline buttons or text links.
- Lists are ruled schedules, not stacks of cards.

## Colors

Navy ink on drafting white. Colour belongs to the hotel and to the few states that need it.

### Primary
- **Drafting Ink** (ink, #1c2b3a): all text, the main action button, focus rings, checkbox accents, dialog borders, hotel leader lines and the chosen label border.

### Secondary
- **Hotel Line** (hotel-line, #5f86b3): the blue line of parts no tool does, drawn in the 3D scene. For drawing only, never for text.
- **Hotel Fill** (hotel-fill, #eef3f9): the pale fill of those parts, the scene ground tint and text selection.
- **Hotel Light** (hotel-light, #ffc879): the warm light that comes on only when every claim is Verified.
- **Redline** (redline, #b8322a): questions and attention only. The question dot on a hotel label, the "Not yet verified" stamp, field errors, error notes.
- **Redline Wash** (redline-wash, #fbeceb): ground of attention and error notes.
- **Done Green** (done, #2c7a56) and its wash (done-wash, #e4f2ea): success notes only.
- **Working Amber** (working, #d08f1d) and its wash (working-wash, #fdf3dd): declared tokens for work in progress; not yet drawn on the shipped step 4 to 6 screens.

### Neutral
- **Drafting Ground** (ground, #f6f8fa): the page, hover on secondary buttons and rows, the chosen segment, info notes.
- **Paper** (paper, #ffffff): the header, panels, the side panel, dialogs, fields, hotel labels.
- **Soft Ink** (ink-soft, #4b5c70): descriptions, hints, counts, placeholders, unchosen tabs.
- **Rule** (rule, #d5dce4): 1px lines between rows, panel borders, divider strips, unchosen hotel label borders.
- **Strong Rule** (rule-strong, #9aa8b8): borders of controls (fields, secondary buttons, segmented strips, the hotel card).

### Named Rules
**The Hotel Is The Colour Rule.** Colour on the page comes from the hotel. Chrome stays ink, paper and ground.

**The Redline Rule.** Redline means a question or a need for attention. Never decoration, emphasis or brand.

**The Line Is Not Text Rule.** Hotel Line fails as text on paper. It draws, it never writes.

## Typography

**Font:** Archivo Variable (with system-ui), loaded from the app with the width axis, so the demo works offline.
**Code Font:** Roboto Mono Variable (with ui-monospace), only for official requirement codes and commands.

**Character:** One plain engineering sans. Width does the work of hierarchy: wide for headings, narrow for drafting labels.

### Hierarchy
- **Display** (600, 34px, 1.1, wide): the step heading. One per page.
- **Heading** (600, 26px, 1.15, wide): page sections. All h1 to h3 are set wide by the base layer.
- **Title** (600, 22px, 1.25): Panel and Dialog titles, drawn by the component from a plain string. Also the count beside a section heading.
- **Lead** (600, 18px, 1.35): the product name in the header (wide), sub-sections, legends of radio groups, note titles. The line under a page heading is lead in soft ink at normal weight.
- **Body** (400, 16px, 1.5): running text, fields, field labels (600), md buttons, nav links.
- **Small** (400, 14px, 1.45): hints, descriptions, stamps, tags, segmented choices, sm buttons, "Step n of 5".
- **Hotel label** (600, narrow 80%, small step, two lines): the hotel label ("CCTV · Logging" over "18 requirements") and the parts list rows. Counts use tabular figures.

### Named Rules
**The Ladder Rule.** Use only the `text-*` steps declared in globals.css. Do not write pixel font sizes.

**The Width Axis Rule.** Wide (112%) is for headings, narrow (80%) is for hotel labels and counts, normal is for everything read.

## Layout

Desktop only. The page is a column up to 1440px wide with 32px side padding, under a 56px header.

Steps 4 and 5 use the hotel frame: the window height under the header, split 3fr to 2fr. Left (about 60%): the hotel and the parts list, which do not scroll. Right (about 40%): a paper side panel with a 1px left rule, the only column that scrolls, with the one main action in a ruled foot that is always in view. Both panel body and foot use 32px side padding.

Other pages use widths by role: full column, max-w-page (1040px), max-w-form (880px), max-w-message (640px), max-w-measure (72ch). The panel unit is 20px by 16px, the dialog 24px by 16px to 20px. Gaps follow Tailwind steps of 4px.

## Elevation & Depth

Flat. No shadows on panels, tables, notes, labels or the side panel. Depth is a 1px rule or a paper surface on the ground. The only lift is the native dialog, which has an ink border and an ink backdrop at 35% opacity. Depth in the hotel comes from the 3D scene itself (orthographic camera, sun light) and not from CSS.

**The Ruled Not Shadowed Rule.** A layer is separated by a 1px rule or a border colour change, never by a shadow.

## Shapes

3px corners (rounded-sm) on every control, panel, label, stamp and note. 1px borders. A stamp adds a second rule using a 1px outline offset by 1px. Dotted border marks an unconfirmed sample. The only fully round shape is the 8px redline question dot on a label, which always sits beside words.

## Components

### Buttons
- **Shape:** 3px corners, 40px high (md) or 32px (sm), 16px or 12px side padding, 600 weight.
- **Primary:** ink ground, paper text, hover at 90% ink. One per view, at the foot of the side panel on steps 4 and 5.
- **Secondary:** paper ground, 1px strong rule, hover turns the border to ink and the ground to drafting ground.
- **Quiet:** ink text, underline on hover.
- **Pressed:** drafting ground with ink border. Disabled is 45% opacity.
- **Focus:** the global 2px ink outline with 2px offset.

### Panels
- **Corner Style:** 3px. **Background:** paper. **Border:** 1px rule. **Shadow:** none.
- An optional title strip is ruled off below with the title at the title step. Padding is 20px by 16px. A scrolling panel keeps the title strip fixed.

### Inputs / Fields
- Paper, 1px strong-rule border, 3px corners, 40px high, body step.
- Label above in 600 body, hint below it in small soft ink. Hover and focus turn the border to ink. Error turns the border redline and adds a redline message at small.
- Checkboxes and radios are native, 18px, ink accent.

### Notes
One 1px border on every side, 3px corners, 12px by 16px padding. Info is ground with a strong rule. Success is done wash with a done border. Attention and error are redline wash. Never a thick side stripe.

### Stamps and tags
A small box with a second outline rule at the small step. Pending ("Not yet verified") is redline. Approved and published are ink. Sample is a dotted soft-ink border. A tag is a single 1px rule box in soft ink for neutral facts. Stamps mark exceptions only.

### Segmented, tables, disclosures, dialog
- **Segmented:** a ruled strip divided by strong rules, 36px high. The chosen option has a ground fill and a 2px ink underline.
- **Table:** a ruled schedule inside a 1px rule box.
- **Dialog:** native dialog, ink border, paper ground. Centred up to 560px, or a full-height side panel from the right up to 720px. Title strip and footer are ruled off. The close button is a 32px ruled square with a drawn cross.

### Header
A simple 56px paper band with a 1px bottom rule. The product name "Blueprint" in wide lead, the sheet links (current one is 600 and underlined 2px, the rest soft ink), "Step n of 5" centred in small soft ink on step pages, then the role switcher on the right. "Reset data" is not in the header: it is at the foot of the admin Catalog sheet.

### The hotel (signature component)
An isometric cutaway drawn with Three.js on an orthographic camera, using Kenney kits, filling the left 60%. Twelve parts, each with a fixed label place on the left or right edge so no two labels overlap at 1280 by 800 or 1440 by 900.
- A part no tool does is drawn as blue line (hotel-line) on a pale fill. A part a tool does is built in warm materials, dropping in when its tool is ticked. Reduced motion skips the drop and opens the roof from the start. Without WebGL a still image replaces the scene.
- Labels are paper boxes, 192 by 46px, 3px corners, narrow two-line text on a 1px ink leader line. A chosen label has an ink border. Others fade to 40% while one is chosen.
- A part with an open question shows a redline dot before its name.
- A 256px card with a strong rule opens beside a chosen part for its summary.
- The parts list under the hotel is the keyboard path. Its rows repeat the two label lines. The chosen row turns ink.

## Do's and Don'ts

### Do:
- **Do** build screens from the kit in app/ui and the tokens in app/globals.css.
- **Do** keep one ink main action visible per step. Use secondary and quiet for the rest.
- **Do** show state in words and counts as well as colour.
- **Do** use wide for headings and narrow for hotel labels. Use tabular figures (tnum) for counts and dates.
- **Do** use 1px rules between list rows in one ruled box.
- **Do** pick widths by role: max-w-page, max-w-form, max-w-message, max-w-measure.
- **Do** keep stamps for exceptions: not yet verified, published, sample.

### Don't:
- **Don't** use hotel-line for text.
- **Don't** use redline for anything that is not a question or a need for attention.
- **Don't** add shadows, grid paper, title-block cells or a legend.
- **Don't** round corners past 3px or make pills.
- **Don't** stack separate cards for a list, or show two solid main actions at once.
- **Don't** use uppercase labels, kickers or eyebrows.
- **Don't** build mobile layouts.
