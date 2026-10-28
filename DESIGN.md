---
name: Build plan for CPFB app builders
description: A plain, government-grade tool surface built entirely on SGDS v3 components, purple for action, gray ground, white surfaces.
colors:
  primary: "#523abc"
  primary-bright: "#6b4feb"
  primary-wash: "#f4f2fe"
  primary-line: "#e1dbfb"
  ground: "#f7f7f7"
  surface: "#ffffff"
  ink: "#1a1a1a"
  ink-subtle: "#525252"
  line-muted: "#dfdfdf"
  line-default: "#868686"
  success: "#0e7c3d"
  success-wash: "#e3f9ed"
  warning-text: "#7e6917"
  warning-wash: "#fef4cb"
  info: "#0269d0"
  info-wash: "#ecf5fe"
  danger: "#cf2323"
typography:
  heading-lg:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "1.75rem to 2rem (responsive)"
    fontWeight: 600
  subtitle-md:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "1.125rem to 1.25rem (responsive)"
    fontWeight: 600
  body-md:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  body-sm:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  caption-md:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  code:
    fontFamily: "Roboto Mono Variable, Roboto Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "8px"
  surface: "12px"
  full: "999px"
spacing:
  2-xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  layout-md: "24px to 48px (responsive)"
components:
  surface-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "{spacing.layout-md}"
  page-ground:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
  badge-verified:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.success}"
  badge-not-yet-verified:
    backgroundColor: "{colors.warning-wash}"
    textColor: "{colors.warning-text}"
  badge-published:
    backgroundColor: "{colors.info-wash}"
    textColor: "{colors.info}"
  code-block:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.surface}"
    padding: "{spacing.sm}"
---

# Design System: Build plan for CPFB app builders

## Overview

**Creative North Star: "The Government Form Desk"**

The whole app is the Singapore Government Design System (SGDS v3), used as shipped. Nothing is restyled: colour, type, spacing and radius all arrive from SGDS theme tokens and its `sgds:` Tailwind v4 utilities. The app's own stylesheet (`app/globals.css`) adds only base resets and two font-family overrides, so the look of a new screen is decided by which SGDS component and which SGDS utility is chosen, not by new CSS.

Density is calm and document-like: white surfaces on a light gray ground, one purple for actions and the active nav item, and semantic colour reserved for verification state. The tone is plain and official without imitating a live .gov.sg service (no masthead, no agency logos).

**Key Characteristics:**
- SGDS web components for every control, container and overlay; no hand-built look-alikes.
- White surfaces on a gray alternate ground; borders and flatness do the layering.
- Purple is for action and "you are here"; green, yellow, blue and gray badges carry verification state.
- Type and spacing from `sgds:` utilities only; Inter for text, Roboto Mono for code and ids.

## Colors

A neutral gray-and-white field with a single violet accent and a small semantic set. All values are SGDS day-theme tokens (`themes/day.css`), referenced by token, not copied.

### Primary
- **SGDS Violet** (`--sgds-primary-bg-default`, product-primary-700): primary buttons, active-nav underline, links' emphasis.
- **Bright Violet** (`--sgds-primary-color-default`, product-primary-600): primary text and border on light grounds.
- **Violet Wash** (primary-100/200): muted primary backgrounds and borders.

### Neutral
- **Gray Ground** (`--sgds-bg-alternate`, gray-50): the `body` background.
- **Paper White** (`--sgds-bg-default` / `surface-default`): panels, cards, nav, sticky bars.
- **Ink** (`--sgds-body-color-default`) and **Subtle Ink** (`--sgds-body-color-subtle`, class `sgds:text-subtle`): body and secondary copy.
- **Muted Line** (`--sgds-border-color-muted`, class `sgds:border-muted`): panel and sticky-bar borders.

### Semantic
- **Verified**: success badge (green). **Not yet verified**: warning badge (yellow). **Published by GovTech**: info badge (blue). Sample and chip labels: neutral badge. Errors: danger alerts and buttons. Alerts use the outlined variant.

### Named Rules
**The Token Only Rule.** Colour is named by SGDS token or `sgds:` utility. A raw hex in a component is a defect.
**The Verification Colour Rule.** Green, yellow and blue mean verification state and nothing else; purple never marks state.

## Typography

**Display / Body Font:** Inter (self-hosted `@fontsource-variable/inter`, family "Inter Variable" listed first via `--sgds-font-family-sans`)
**Label/Mono Font:** Roboto Mono (self-hosted, via `--sgds-font-family-code`) for code, ids and the agent snippet

**Character:** One sans family at modest sizes with weight (600) doing the hierarchy; mono appears only where text is literal.

### Hierarchy
- **Page title** (600, `sgds:text-heading-lg`, 28-32px responsive): one per screen, in `PageHeader`.
- **Section / card title** (600, `sgds:text-heading-sm` or `sgds:text-subtitle-md`): headings inside panels and requirement groups.
- **Lede** (400, `sgds:text-body-lg` + `sgds:text-subtle`): the single line under a page title.
- **Body** (`sgds:text-body-md` / `sgds:text-body-sm`, 16px / 14px): paragraphs, table cells, list rows.
- **Caption** (`sgds:text-caption-md`, 14px): metadata, source lines. **Label** (`sgds:text-label-md`) for form labels outside components.
- **Code** (`sgds:font-code`, usually with caption size): ids, `BUILD-PLAN.md` snippet.

### Named Rules
**The Real Utility Rule.** Only these names exist and work: `text-heading-lg`, `text-heading-sm`, `text-subtitle-md`, `text-subtitle-sm`, `text-body-lg/md/sm`, `text-caption-md`, `text-label-md`, `font-regular`, `font-semibold`, `font-code`, `text-subtle`, `gap-2-xs`, `z-10`. These look real but are not: `z-raised`, `text-heading-xs`, `font-mono`, `text-body-xs`. Check `css/utility.css` before using any other name.

## Layout

A single centred column: `main` is `sgds:max-w-container-xl` (1312px token), full width below it, with `px-layout-md` and `py-layout-md`. Narrower reading and form screens use `max-w-container-md` or `-lg`. The page is a flex column so `main` fills the viewport height under the nav. Spacing is a token ladder, not pixels: `gap-2-xs` (4px), `gap-text-xs` / `gap-text-sm` for title-to-text, `gap-sm` (12px) for control and badge clusters, `gap-layout-sm/md/lg` between sections and cards, `p-layout-md` inside panels. Flex rows use `flex-wrap` so the 390px mobile view stacks without a separate layout. Layout tokens step up at SGDS's responsive breakpoints.

## Elevation & Depth

Flat and tonal. Depth is white panels on a gray ground plus a muted 1px border; there are no ambient shadows. One structural exception: the coverage editor's sticky save bar uses SGDS's edge shadow (`sgds:shadow-edge-top`, `0 -2px 4px rgba(14,14,14,0.08)`) with `z-10` to separate it from scrolling rows. Overlays (drawer, modal) use SGDS's own layering.

### Named Rules
**The Flat Panel Rule.** Panels are `bg-surface-default`, `border-muted`, `rounded-surface`, no shadow. Only a sticky bar over scrolling content may carry the edge shadow.

## Shapes

SGDS rounding: panels use the surface radius (`sgds:rounded-surface`, 12px); controls and badges keep their component radius (4-8px, badges pill-shaped). Borders are 1px muted gray. No custom clipping or decorative geometry.

## Components

All are SGDS web components imported from `@govtechsg/sgds-web-component/react`; they are the design system's own component specs and keep their keyboard, focus and screen-reader behaviour.

### Buttons
- `SgdsButton`, mostly `size="sm"`; default (primary violet) for the one main action, `outline` for secondary, `ghost` for tertiary, `danger` for destructive. Focus rings are SGDS's; never remove them.

### Badges
- `SgdsBadge show` with variants `success` (Verified), `warning` (Not yet verified), `info` (Published by GovTech), `neutral` (sample tag, chips), `primary` for emphasis. Wrapped in `app/plan/badge.tsx`.

### Alerts
- `SgdsAlert` in the outlined style, with danger/warning/info/success variants, for errors, unsaved and unverified states.

### Cards / Containers
- `SgdsCard` for the tool picker, the /start form and requirement cards. Hand-built form panels (admin) use the Flat Panel Rule: `rounded-surface`, `border-muted`, `bg-surface-default`, `p-layout-md`, `gap-sm`.

### Accordions
- `SgdsAccordion` holds the quiet "your platform already does" lists and the coverage editor rows, keeping evidence below the headline.

### Overlays
- `SgdsDrawer` for item detail; `SgdsModal` for "Save this plan".

### Inputs / Fields
- `SgdsInput`, `SgdsTextarea`, `SgdsSelect` (options supplied as `menuList` data, not child elements), `SgdsCheckbox`, `SgdsRadioGroup`/`SgdsRadio`, `SgdsFileUpload`. Labels, errors and focus are SGDS's.

### Navigation
- `SgdsMainnav` on white, brand slot "Build plan" (`text-subtitle-sm`, 600), `SgdsMainnavItem` links wrapping real Next `Link`s; the active item shows SGDS's purple underline. The role switcher and reset sit in the `end` slot. `SgdsBreadcrumb` on nested pages. Data uses `SgdsTable`; key/value detail uses `SgdsDescriptionList`.

## Do's and Don'ts

### Do:
- **Do** reach for the SGDS component first and check `node_modules/@govtechsg/sgds-web-component` before building anything custom.
- **Do** take type and spacing only from `sgds:` utilities; headings, paragraphs and lists have zero margin, so spacing comes from `gap-*` on the parent.
- **Do** use `sgds:font-code` for code and ids and `sgds:text-subtle` for secondary copy.
- **Do** pass select options as `menuList` data and keep control accessible names stable.
- **Do** map verification state to badge variants exactly as in `app/plan/badge.tsx`.

### Don't:
- **Don't** use `z-raised`, `text-heading-xs`, `font-mono` or `text-body-xs`; they do not exist (use `z-10`, `text-subtitle-md`, `font-code`, `text-caption-md`).
- **Don't** add raw hex colours, pixel spacing, custom shadows or new fonts, or put component styling in `globals.css`.
- **Don't** use purple for state, or green/yellow/blue for decoration.
- **Don't** add a government masthead or GovTech/agency logos; this is a local prototype.
- **Don't** restyle away SGDS focus rings or contrast.
