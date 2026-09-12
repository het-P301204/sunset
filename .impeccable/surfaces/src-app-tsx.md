---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

Scope: the whole SUNSET console — entry sequence, app shell, and every route (Overview, Inventory, Triage, Timeline, Coverage, Simulation, Plan, Reports, Settings) plus the import flow and finding drawer. Visitor mode: **Operate**.

Audience: a security engineer or cryptographic architect holding an inventory export and needing to decide what to migrate first, then defend that order. Secondary: a platform lead scheduling the work, a CISO reading the deadline and coverage picture. Task: ingest an inventory, understand the ranking, interrogate any single finding down to its evidence chain, record overrides, simulate a policy, export a report. Proof: the engine is real and deterministic; the numbers are computed in-browser, not canned. Constraints: offline, no network at runtime, no credentials; fixtures are synthetic and must be labelled; nothing is ever actually enforced.

## Direction contract

THESIS: One ruled time axis governs every screen, and the interval nobody could assess is drawn rather than dropped. SUNSET refuses the category's arrangement — the KPI row over a donut over a findings table in rounded cards — because that arrangement has no place to put an honest gap. A core log does: it draws NO RECOVERY as a hatched interval with its own percentage, and so does this.

OWN-WORLD: Near-black #08090B ground with graphite beds (#101216, #16191F) separated by 1px hairlines (#22262E), never by rounded card edges. Ink #E9E6E0, muted #8B9099. Amber #F0A03C is the deadline signal only — marker horizons, the current-position rule, the primary action — never a surface fill. Risk lives in hatch **patterns** first (diagonal, cross, dot, stipple, open) and color second, so severity survives grayscale: critical #E5484D, high #E8873C, medium #D9A036, low #5E7E9B, safe #3E9D6C, unknown #8B6FB8. Type: Inter variable for interface, JetBrains Mono variable for every algorithm, identifier, date, score, path and measurement, both self-hosted. Radius 2px on controls, 3px on panels, 0 on analytical surfaces. Components are ruled columns, depth scales, recovery bars, hatch-filled beds, marker horizons, and a legend table — not cards.

STORY: The operator lands on a column that already knows the shape of the problem, reads the three marker horizons and where the strata fall against them, sees immediately how much of the log is NO RECOVERY, opens the top-ranked bed to find its evidence chain laid out as a log entry, and either accepts the engine's position or overrides it on the record.

FIRST VIEWPORT: Full-bleed near-black. Left: a 56px navigation rail, icons plus a hairline, engine status pinned at its foot. Top: a 44px hairline-ruled bar carrying the inventory selector, its version, and the CRQC horizon as a visibly adjustable input. The workspace beneath is one composition, not a grid of panels: a full-width ruled time column running 2026 → 2035 across the top third, three amber marker horizons cutting it at 2030 KEY ESTABLISHMENT / 2031 SIGNATURES / 2035 LEGACY DISALLOWED, findings settled beneath as hatched beds sized by count. Directly under it, the readiness figures set at monumental scale (72px mono) as the structure itself — ASSESSED, CRITICAL, HIGH, UNKNOWN — with the NO RECOVERY interval drawn to scale beside them carrying its own percentage. The ranked queue runs down the left two thirds below that, position numerals in the margin. Primary action ANALYZE INVENTORY sits at the column head in amber; on an empty inventory it is the only lit element on the screen.

FORM: The Core Log — borehole logs, stratigraphic columns, core-recovery sheets. Candidate 7 of my ordered grounded list. Seed key bd7a4eab, assigned index 7, scope direction, mode operate. Raised by the hands it beat: a ranked LEGEND table and a plan overlay that cannot edit the log beneath (orienteering); stable keyable addresses (teletext); engine/operator as two in-place modes of one row with a retraceable trail (HyperCard); color at rule edges only with an achromatic field and UNKNOWN as a markable state (iridescent edge); monumental figures as structure (alphabet storm); J/K snap to the next finding, preloaded (vertical feed).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved

- Report export is PDF via the browser print pipeline (`window.print()` with a dedicated print stylesheet) rather than a bundled PDF library, to keep the offline claim and the dependency list honest. JSON and CSV are generated directly.
- No rasters ship in this build; the whole world is drawn in SVG and CSS.
