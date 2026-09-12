# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React 18 + TypeScript + Tailwind CSS, confirmed by the user. Static build, no server, no network at runtime. The analysis engine is written in TypeScript and executes in the browser alongside the UI — confirmed by the user in preference to a mock adapter or a separate Python CLI. Framer Motion is permitted only where an interaction genuinely needs orchestration; everything else uses CSS transitions. Visualizations are hand-built SVG rather than a charting library's defaults.

## Users

- **Security engineer / cryptographic architect** — primary. Has an inventory export (a CycloneDX CBOM, a repository crypto scan, or a spreadsheet) and needs to decide what to migrate first and defend that order to someone else. Works in a dark terminal-adjacent environment, reads dense tables, expects keyboard control.
- **Platform / infrastructure lead** — consumes the ranked queue as work to schedule against existing upgrade windows. Needs to override the engine's ordering and have the override recorded rather than silently absorbed.
- **CISO / compliance owner** — secondary. Needs the deadline picture, the coverage statement, and an exportable report. Does not read the inventory row by row.

## Product Purpose

SUNSET turns a cryptographic inventory into a deadline-anchored, risk-ranked post-quantum migration plan, and states plainly what it could not assess.

Discovery tooling already exists and is good. What does not exist is the decision layer: nothing open-source takes an inventory and produces a defensible migration order anchored to real regulatory deadlines, weighted by data-secrecy lifetime and crypto-agility, with honest coverage reporting. Success is a user who can point at position #1 in the queue and explain exactly why it is first.

## Positioning

The mechanism is **Mosca's inequality applied per asset, anchored to published deadlines, with UNKNOWN as a first-class verdict.**

An asset is urgent when `migration_time + data_secrecy_lifetime > time_to_CRQC`. The inputs that formula needs are precisely the inputs automated discovery cannot collect — CISA's own automated-PQC-discovery strategy (Sep 2024) states that most of its nine inventory data items cannot be collected by automated tooling, and the non-automatable list explicitly includes how long data needs protection. So SUNSET cannot pretend to a complete answer, and its differentiator is refusing to. Where inputs are missing the asset is ranked UNKNOWN with the specific missing field named, rather than being dropped, defaulted, or scored on invented values.

A neighboring discovery product could not truthfully copy this, because it would have to admit the same gap.

## Operating Context

- Runs fully offline. No credentials, no network calls, no telemetry. A user can open it on an air-gapped analysis workstation.
- Input arrives as a file the user already has: CycloneDX 1.6 CBOM JSON, a repository crypto-discovery export, or a SUNSET context file supplying the per-asset facts discovery could not (data-secrecy lifetime, estimated migration effort, agility grade).
- Analysis is deterministic. The same inventory plus the same assumptions produces the same ranking, every time. This is a reporting tool; a ranking that drifts between runs is worthless in a review meeting.
- The CRQC horizon is an operator assumption, not a fact. It must be visible and adjustable in the interface at all times, never buried as a constant.
- Output is consumed in two places: on screen during triage, and as an exported report (PDF / JSON / CSV) attached to a migration program.

## Capabilities and Constraints

**Does:** parse inventories; classify cryptographic uses by threat class (key establishment, signature, symmetric, hash); anchor each to the governing deadline; compute Mosca urgency; grade crypto-agility; rank a migration queue with an explainable evidence chain; quantify and break down coverage gaps; simulate policy enforcement without enforcing anything; record operator overrides distinctly from engine recommendations; generate reports.

**Does not:** implement post-quantum cryptography. Scan systems. Discover crypto. Connect to anything. Block anything. Every enforcement view is explicitly labelled SIMULATION.

**Terminology that must be used precisely:** CRQC (cryptographically relevant quantum computer), HNDL (harvest now, decrypt later), CBOM (cryptographic bill of materials), Mosca inequality, crypto-agility, key establishment vs. signature, data-secrecy lifetime.

**Deadline facts the product is anchored to** (do not restate loosely, do not extend):
- EO 14412, signed 22 Jun 2026 — PQ key establishment for high-value / high-impact systems by 31 Dec 2030; PQ signatures by 31 Dec 2031; directs CISA and NIST to publish CBOM minimum elements within 270 days.
- NIST IR 8547 — RSA, ECDSA, ECDH, DH deprecated after 2030, disallowed after 2035.
- FIPS 203 / 204 / 205 (ML-KEM, ML-DSA, SLH-DSA) published 13 Aug 2024.

**Undecided / out of scope for now:** multi-inventory diffing over time, team collaboration, persistence beyond the browser.

## Brand Commitments

- Name: **SUNSET**. The name carries the meaning — algorithms have a sunset date.
- Voice: a security engineer writing for another security engineer. Concise, technical, quantified. "21 assets remain UNKNOWN because data-secrecy lifetime is unavailable," never "we couldn't figure some things out." No alarm language, no exclamation marks, no reassurance.
- Binding visual constraint volunteered by the user: dark mode first, near-black graphite layering rather than pure black, a restrained sunset-derived accent (amber / warm orange / muted coral) used sparingly to signal deadline and transition, semantic risk colors confined to where risk is being stated.
- The product must not read as a generic SaaS dashboard or a template card grid.

## Evidence on Hand

- No customers, no deployments, no benchmarks, no testimonials. None may be fabricated anywhere in the interface.
- Real, citable public sources for every deadline claim (see Capabilities and Constraints). Citations in the UI must point at these and nothing invented.
- Sample inventories are synthetic fixtures authored for this project and must be labelled as such wherever they are loaded. They are not production results and the interface must never present them as one.
- The analysis engine is real and its outputs are computed, so on-screen numbers are genuine results for whatever inventory is loaded — but the inventory itself is a fixture unless the user imports their own.

## Product Principles

1. **An unanswerable question gets an UNKNOWN, never a default.** Missing input is surfaced with the specific field named. No finding is silently dropped and no score is computed from invented values.
2. **Every ranking must be explainable in one screen.** If the interface cannot show the evidence chain that produced a position, the ranking does not belong in the interface.
3. **Assumptions are inputs, and inputs are visible.** The CRQC horizon, effort estimates, and lifetime values are operator-supplied. The UI shows them as adjustable, never as constants.
4. **The engine recommends; the operator decides.** Overrides are recorded and visually distinguished from engine output, never merged into it.
5. **Nothing is enforced.** Simulation is always labelled as simulation.

## Accessibility & Inclusion

Treated as a product requirement, not a checklist. Full keyboard operation including the inventory table and timeline; visible focus on every interactive element; no meaning carried by color alone (risk level always also carries a label or shape); `prefers-reduced-motion` honored throughout including the intro sequence; semantic tables and dialogs; WCAG AA contrast in both themes.
