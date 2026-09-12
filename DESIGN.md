---
name: SUNSET
description: A core log for post-quantum migration triage — one ruled time axis, hatched severity, and the interval nobody could assess drawn rather than dropped.
colors:
  ground: "#08090b"
  bed-0: "#0c0e11"
  bed-1: "#101216"
  bed-2: "#16191f"
  bed-3: "#1c2028"
  rule-faint: "#171a20"
  rule: "#23272f"
  rule-strong: "#333943"
  ink: "#e9e6e0"
  ink-dim: "#aab0b9"
  ink-muted: "#858b95"
  ink-faint: "#767c86"
  amber: "#f0a03c"
  amber-dim: "#a8722c"
  amber-wash: "rgba(240, 160, 60, 0.09)"
  amber-ink: "#120b03"
  coral: "#e8734a"
  risk-critical: "#ef5f63"
  risk-high: "#ef9448"
  risk-medium: "#dfad4a"
  risk-low: "#7595b1"
  risk-safe: "#4bb37e"
  risk-unknown: "#a083cc"
typography:
  figure:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "clamp(2.75rem, 5.5vw, 5.25rem)"
    fontWeight: 300
    lineHeight: 0.85
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: "26px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.1em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "normal"
    fontFeature: "'cv05' 1, 'cv08' 1, 'ss03' 1, tabular-nums"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "-0.01em"
    fontFeature: "tabular-nums, liga 0"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: "14px"
    letterSpacing: "0.12em"
rounded:
  none: "0"
  control: "2px"
  panel: "3px"
  full: "999px"
spacing:
  hair: "4px"
  tight: "8px"
  gutter: "16px"
  section: "20px"
  wide: "24px"
  foot: "26px"
  topbar: "44px"
  rail: "56px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
    typography: "{typography.data}"
  button-primary-hover:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
  button-default:
    backgroundColor: "{colors.bed-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  button-default-hover:
    backgroundColor: "{colors.bed-3}"
    textColor: "{colors.ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "24px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.risk-critical}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  input-text:
    backgroundColor: "{colors.bed-0}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "32px"
  chip-neutral:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.control}"
    padding: "0 6px"
    height: "20px"
    typography: "{typography.label}"
  chip-amber:
    backgroundColor: "transparent"
    textColor: "{colors.amber}"
    rounded: "{rounded.control}"
    padding: "0 6px"
    height: "20px"
  bed-panel:
    backgroundColor: "{colors.bed-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "12px 16px"
  bed-flat:
    backgroundColor: "{colors.bed-0}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px 16px"
---

# Design System: SUNSET

## Overview

**Creative North Star: "The Core Log"**

SUNSET is drawn the way a borehole log is drawn. One ruled axis governs the whole surface, material is stacked in beds against it, and the interval the drill could not recover is drawn to scale with its own percentage rather than quietly omitted. That last device is why the world was chosen: a dashboard of KPI tiles over a donut has nowhere honest to put "we do not know," and this product's most important number is exactly that.

The surface is near-black graphite at rest (`ground` #08090b) with beds stepping up through four barely-separated greys, divided by 1px hairlines rather than by card edges. Density is deliberate and high — the interface scale bottoms out at 10px mono labels — because a log sheet is dense by nature and the operator is reading it on a workstation, beside a terminal, for a long stretch. Amber is the only warm signal in the field and it means one thing: a deadline, or the action that moves you toward one. Risk is carried by hatch pattern before colour, which is why the product needs no separate accessible mode.

Both themes are authored, not derived. The light theme is the same core log printed on buff log paper (`ground` #eeebe3) with ink-brown rules and a darker amber that still reads as amber; it is not an inversion of the dark theme, and its ink roles were re-measured against paper rather than reused. Print is a third authored surface: the browser's own print pipeline against a forced paper palette, so the exported PDF is the same markup the operator reviewed.

**Key Characteristics:**
- Ruled beds and hairlines; no cards, no rounded panels floating on a field
- Severity encoded by hatch pattern first, colour second, ordinal by density
- Amber reserved for deadline signal and the single primary action per view
- Tabular numerals everywhere; mono for every algorithm, identifier, date and score
- Shallow, role-based radius (2px controls, 3px panels, 0 on analytical surfaces)
- Two independently authored themes plus an authored print palette

## Colors

An achromatic graphite field with one warm signal and a six-step risk set that is always paired with a pattern.

### Primary
- **Marker Amber** (dark #f0a03c / light #a25c12): the deadline signal. Marker horizons on the timeline, the current-position rule, the active rail edge, the caret, the focus ring, and the single primary action. On paper it darkens to hold 4.5:1 and stays recognisably amber.
- **Amber Dim**: the secondary amber — link underlines, input focus borders, the "on" edge of a toggle. Used where amber must register without claiming the one-fill-per-view slot.
- **Amber Wash** (9% alpha): the only amber surface tint permitted, for the on-state of a switch track and for row marks. It is a wash, not a fill.

### Secondary
- **Signal Coral** (dark #e8734a / light #b8452a): a narrow accent for engine-versus-operator marks and override trails. Never a surface.

### Tertiary — the risk set
Each of these appears with its hatch pattern, never as bare colour. Both themes re-tune them; neither reuses the other's values.
- **Critical Red**, **High Orange**, **Medium Ochre**, **Low Slate-Blue**, **Safe Green**, **Unknown Violet**. Unknown is the NO RECOVERY hue and always carries the counter-diagonal pattern.

### Neutral
- **Graphite Ground**: the field everything is drawn on; `bed-0` through `bed-3` step up from it for rails, panels, hovers and inset tracks.
- **Rule / Rule Faint / Rule Strong**: the entire structural vocabulary. Faint rules divide rows inside a bed, the default rule divides beds, strong rules mark emphasis and hover borders.
- **Ink / Ink Dim / Ink Muted / Ink Faint**: four text roles, all four measured to clear 4.5:1 against their own theme's ground (dark 17.2 / 9.0 / 5.7 / 4.7; light 15.4 / 8.0 / 5.1 / 4.6). Ink-faint is a text colour in this product — small mono labels, margin numerals — so it is held to the same floor, not treated as decoration.

### Named Rules
**The One Amber Rule.** Amber is the deadline signal, and therefore the primary action. It appears at most once per view as a fill. Everything else that needs amber gets a rule, a border, an underline or the 9% wash.

**The Pattern-First Rule.** Severity is encoded by hatch pattern before colour. Pattern density is ordinal — CRITICAL densest (3px diagonal), HIGH (5px diagonal), MEDIUM (4px horizontal), LOW (5px dot), SAFE sparsest (8px stipple) — and UNKNOWN runs counter-diagonal at 9px so it can never be mistaken for material that was there. Because of this rule the product has no separate accessible mode; add the pattern, not a toggle.

**The Two Themes Rule.** Light is not an inversion. Every colour role is authored against its own ground and its contrast re-measured. Changing one theme's value never implies changing the other's.

## Typography

**Interface Font:** Inter variable, self-hosted (system-ui, -apple-system, Segoe UI fallback)
**Data Font:** JetBrains Mono variable, self-hosted (ui-monospace, Consolas fallback)

**Character:** Two working faces, no display face. Inter carries prose and controls with `cv05`, `cv08` and `ss03` on; JetBrains Mono carries every algorithm, identifier, date, score, path and measurement, with ligatures disabled so an identifier reads as its characters. The mono face also does the monumental work — the readiness figures are mono at light weight, so the largest type on screen is still data.

### Hierarchy
- **Figure** (mono, 300, clamp 2.75rem–5.25rem, line-height 0.85): the readiness numerals, set on a shared baseline and separated by hairlines. Structure, not a KPI row.
- **Headline** (Inter, 400, 20px/26px): drawer and dialog titles.
- **Title** (Inter, 600, 12px/16px, 0.1em, uppercase): the `t-section` role — ruled section heads. A rule and a name, nothing above it.
- **Body** (Inter, 400, 13px/20px): the application default. Prose is capped at a 68ch measure.
- **Data** (mono, 12px, -0.01em, ligatures off): tables, identifiers, scores, dates.
- **Label** (mono, 500, 10px/14px, 0.12em, uppercase): field labels, chips, column heads, the rail's three-digit addresses.

### Named Rules
**The Tabular Numeral Rule.** Every numeral in this product is data. `font-variant-numeric: tabular-nums` is set on body, input, button, select and textarea; a column of numbers never re-flows as it updates.

**The No Eyebrow Rule.** A section is introduced by a hairline and a name. There is no kicker, no eyebrow, no supporting label stacked above a heading. Explanatory copy sits beside the head as a wrapping meta line, and it wraps rather than truncating — a sentence cut mid-word has stopped being information.

## Layout

The shell is fixed: a 44px hairline-ruled topbar, a 56px icon rail on the left (≥768px), a scrolling main column, and a 26px status foot. Below 768px the rail is replaced by a bottom sheet that shows each view's address, name and summary, because the rail's tooltips do not exist on touch.

The workspace is one composition, not a grid of panels. Full-bleed sections stack down the main column, each closed by a `border-b` hairline; section padding is 16px at small widths and 24px from `lg`, with 20px vertical rhythm. The 4px/8px/16px/20px/24px spacing set covers everything; there is no floating gutter between panels because there are no floating panels.

Tables are real tables with sticky heads, `aria-sort` on the sorted column, and three densities (44px analytical / 34px table / 28px compact rows) that also decide which columns appear — analytical shows all ten, compact shows five. Beyond 220 rows the body windows with 12 rows of overscan. A `3xl` breakpoint at 1600px exists for the widest workstation layouts; the severity key only appears inline from `xl`.

Motion is one grammar: `rise` (420ms), `fade` (220ms), `draw` (640ms) on the ease-out curve `cubic-bezier(0.16, 1, 0.3, 1)`, with staggered children at 38ms steps. Reduced motion is honoured from two directions — the OS preference and the in-product setting — and both collapse animation to an instant state change.

### Named Rules
**The Visible Default Rule.** Every entrance animates from an already-visible default state. A failed or suppressed animation must never leave content hidden.

## Elevation & Depth

The system is flat by default. Depth comes from tonal bed steps and hairlines, not from shadow: `bed-0` through `bed-3` separate a rail from a panel from a hover from an inset track, and a 64px survey grid or 20px dot field sits under the ground so ruled elements read as drawn on something rather than floating. Shadow is reserved for the few elements that genuinely leave the plane — the finding drawer, popovers, tooltips, and the report sheet — and it is always offset plus blur, never a zero-offset halo. Print strips all of it.

### Shadow Vocabulary
- **Drawer** (`box-shadow: 0 0 0 1px var(--c-rule), -24px 0 48px -12px rgba(0,0,0,0.55)`): the finding drawer, which slides over the queue while leaving it visible.
- **Pop** (`box-shadow: 0 12px 32px -8px rgba(0,0,0,0.5), 0 2px 6px -2px rgba(0,0,0,0.4)`): modals, tooltips, command palette.
- **Lift** (`box-shadow: 0 2px 8px -2px rgba(0,0,0,0.4)`): the report preview sheet, which is meant to read as paper on a desk.

### Named Rules
**The Offset-Only Rule.** Shadows carry an offset and a blur. A zero-offset glow is not part of this world; if an element needs to register without leaving the plane, give it a rule or a bed step.

## Shapes

Radius is shallow and role-based, and the role decides it: 2px on controls (buttons, inputs, selects, chips), 3px on panels and dialogs, and 0 on analytical surfaces — tables, the timeline column, the recovery bar, the readiness figures. The only fully round shapes in the product are the range thumb, the toggle knob and the scrollbar thumb, where roundness is a grip affordance rather than a style.

Borders do the work radius does not. A bed is `bed-1` with a 1px rule and a 3px radius; a flat bed is `bed-0` bounded top and bottom by rules and nothing else. Hatch fills exist in two matched forms — SVG patterns defined once at the root for analytical geometry, and CSS `repeating-linear-gradient` twins for DOM surfaces — so a CRITICAL bed looks identical whichever renders it. Icons are stroked SVG at 14–15px, stroke width 1.5–1.75; no glyph or icon-font shapes.

### Named Rules
**The Hairline Rule.** Panels are ruled beds separated by hairlines. Never cards. If a surface needs to be distinguished, change its bed step or close it with a rule; do not float it on a shadow with a big radius.

## Components

### Buttons
- **Shape:** Barely-eased corners (2px), 1px border, 32px tall (`md`) or 24px (`sm`), 12px / 8px horizontal padding.
- **Primary:** amber fill with near-black amber-ink text and an amber border; hover brightens 110%. One per view, per the One Amber Rule.
- **Default:** `bed-2` field, ink text, rule border; hover steps to `bed-3` with a strong rule.
- **Quiet:** transparent with dim ink, hover fills to `bed-2` — the rail, close buttons, and every inline "open X" affordance.
- **Danger:** transparent with a critical-red border and text; hover takes a 12% critical wash.
- **Focus:** the one global rule — a 2px amber outline at 1px offset. Never removed, never per-component.

### Chips
- **Style:** 20px tall, 2px radius, transparent field, 1px border, 10px uppercase mono at 0.08em. Colour lives in the border and the text.
- **Tones:** neutral (rule border, dim ink), amber (amber-dim border, amber text), muted (faint rule, muted ink). No filled chips.

### Containers (beds)
- **Corner Style:** 3px on a bounded bed; 0 on a flat bed and on anything analytical.
- **Background:** `bed-1` bounded, `bed-0` flat.
- **Shadow Strategy:** none at rest; see Elevation.
- **Border:** 1px rule all round (bounded) or top and bottom only (flat).
- **Internal Padding:** 16px, rising to 24px at `lg`.

### Inputs / Fields
- **Style:** 32px tall, 2px radius, `bed-0` field, 1px rule border, 12px text, faint-ink placeholder. Mono variant for identifiers and numbers.
- **Focus:** border shifts to amber-dim beneath the global amber focus ring; caret is amber in every text field.
- **Hint:** 11px muted ink, wired with `aria-describedby`.
- **Toggle:** 36×20 track, rounded, `bed-2` at rest and amber-wash with an amber-dim border when on; the 12px knob moves from muted ink to amber over 220ms.
- **Field row:** the log-sheet primitive — a mono label in a fixed left column (11rem, 13rem from `sm`), value at right, closed by a faint rule.

### Navigation
- **Style:** 56px icon-only rail, `bed-0`, closed by a right-hand rule. The wordmark sits in a 44px cell at the top in amber.
- **Active state:** an amber rule on the item's leading edge — the same marker-horizon device the timeline uses for a deadline — never a filled pill.
- **Disabled:** views that require an analysis are dimmed and non-interactive until one exists.
- **Mobile (<768px):** a full-width bar opening a sheet that lists each view's three-digit address, name and summary.

### Severity Mark & Hatch Key
The signature component. A `SeverityMark` is an 8–10px square filled with its severity's SVG hatch and stroked in its severity colour; it precedes every severity label, every figure that has a severity, and every legend row. The `HatchKey` puts the six patterns and their names on the surface the patterns are used on, from `xl` up — a key behind a keyboard shortcut is a key nobody opens.

### Readiness Figures
Four monumental mono numerals on a shared baseline in a 2-up (4-up from `lg`) band, separated by faint rules, each a button that drills into the filtered inventory. Beneath them, the recovery bar draws ASSESSED / PARTIALLY ASSESSED / NO RECOVERY to scale on one line, so the share of the inventory the product is silent about occupies the same proportion on screen as it does in reality.

### Drawer
The finding detail opens as a right-hand drawer, not a modal, because the operator's position in a ranked queue is information and a modal costs them it. Full height, ground field, left rule, drawer shadow, ruled header and footer, focus trapped, Escape closes, focus restored, J/K steps to the next finding in whatever list the current view is showing.

## Do's and Don'ts

### Do:
- **Do** encode severity with its hatch pattern first and its colour second, keeping density ordinal (CRITICAL densest through SAFE sparsest, UNKNOWN counter-diagonal and sparse).
- **Do** reserve amber for deadline signal and the one primary action per view; use the 9% wash or a rule when amber must register without filling.
- **Do** separate surfaces with 1px hairlines and bed steps (`bed-0`→`bed-3`), and close every section with a rule.
- **Do** keep radius role-based: 2px controls, 3px panels, 0 on anything analytical.
- **Do** set every numeral tabular and every identifier, algorithm, date, score and path in JetBrains Mono with ligatures off.
- **Do** read every colour from `src/styles/tokens.css` via its Tailwind alias, so a theme change stays a token swap.
- **Do** author the light theme against paper on its own terms and re-measure its ink roles to 4.5:1.
- **Do** start every entrance animation from an already-visible default, and honour both the OS reduced-motion preference and the in-product setting.
- **Do** put the severity key on the surface where the patterns are used.

### Don't:
- **Don't** build panels as cards — no floating rounded surfaces on a field, no card grids where a ruled bed or a real table belongs.
- **Don't** distinguish severity by colour alone, or add a parallel "accessible mode" instead of a pattern.
- **Don't** use amber as a surface fill for anything but the single primary action, and never for a whole panel or row background.
- **Don't** use a zero-offset halo or glow shadow; shadows carry offset and blur, and only on elements that leave the plane.
- **Don't** stack a kicker or eyebrow above a section head; a hairline and a name is the whole head.
- **Don't** use proportional numerals, ligatured mono, or a decorative display face — there is no display face in this system.
- **Don't** derive the light theme by inverting the dark one, or reuse a dark-theme risk hue on paper.
- **Don't** hardcode a hex value in a component; every colour has a token, and a component that bypasses it will not follow the theme or the print palette.
- **Don't** remove or re-style the global focus ring per component.
