# SUNSET

**Cryptographic posture and post-quantum migration triage.**
Turns a cryptographic inventory into a deadline-anchored, risk-ranked migration plan — and states plainly what it could not assess.

Runs entirely in the browser. No network request is made at any point, no credentials are required, and the analysis is deterministic: the same inventory with the same assumptions produces the same ranking, every time.

---

## The problem

Cryptographic discovery is a solved-ish problem. IBM's CBOMkit scans source, images and binaries; CycloneDX 1.6 gives the output a schema; plenty of tools will hand you a list of every RSA key in your estate.

What none of them do is tell you **what to migrate first**.

That gap is not an oversight, and it is the reason this tool exists. The prioritisation model everyone agrees on is Mosca's inequality:

```
T_migrate  +  T_data_secrecy_lifetime  >  T_CRQC    =>    you are already too late
```

Two lines of arithmetic. The difficulty is that **neither input on the left is discoverable by scanning**. CISA's own automated-PQC-discovery strategy (September 2024) says so directly: most of the nine inventory data items it defines "cannot be detected or collected using currently available automated tools, and therefore, are manually collected" — and the non-automatable list explicitly includes *"how long the data and associated metadata need protection (i.e., 'time to live')"*, which is exactly `T_data_secrecy_lifetime`.

So any tool that reports a confident priority order for a scanned inventory has either asked a human for those values, or invented them.

SUNSET asks. And where the answer is absent, it says UNKNOWN and names the missing field, rather than substituting a plausible default that produces a plausible ranking nobody can defend in a review.

## What it does

- Parses a **CycloneDX 1.6 CBOM**, a repository crypto-discovery export, or a SUNSET context file.
- Decomposes cipher suites into their separate migration decisions — the key exchange, the authentication and the bulk cipher of `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256` are three different deadlines and three different pieces of work.
- Classifies each use by threat class and by what a CRQC actually does to it: broken (Shor), weakened (Grover), or resistant (FIPS 203/204/205).
- Anchors each finding to the **governing published obligation**, quoted and cited.
- Evaluates **Mosca's inequality** per asset, and reports which constraint binds — the CRQC horizon or the regulatory date.
- Grades **crypto-agility** on a four-point spectrum and weights the score by remediation friction.
- Produces a ranked queue where every position can be explained from one screen.
- Quantifies **coverage**, broken down by the specific field that blocked each unassessed finding.
- **Simulates** an enforcement policy without enforcing anything.
- Records **operator overrides** alongside the engine's recommendation, never instead of it.
- Exports PDF, JSON and CSV, each carrying the analysis id and the assumptions it was computed under.

## What it does not do

It implements no cryptography. It does not scan, discover, connect to anything, or block anything. Every enforcement view is labelled SIMULATION.

## The deadlines

Every date in the product is a citation. Nothing is estimated or extrapolated.

| Date | Obligation | Instrument |
|---|---|---|
| 19 Mar 2027 | CISA and NIST to publish CBOM minimum elements (within 270 days of the order) | EO 14412 |
| 31 Dec 2030 | Post-quantum key establishment for high-value assets and high-impact systems | EO 14412 |
| 31 Dec 2030 | RSA, ECDSA, ECDH and DH at 112-bit classical security deprecated | NIST IR 8547 |
| 31 Dec 2031 | Post-quantum digital signatures for high-value assets and high-impact systems | EO 14412 |
| 31 Dec 2035 | RSA, ECDSA, ECDH and DH disallowed | NIST IR 8547 |

Symmetric ciphers and hashes deliberately have **no** entry. Neither instrument sets a post-quantum migration date for them, Grover reduces their margin rather than breaking them, and recorded material does not become readable later. SUNSET anchors those findings to no deadline and says so on screen, rather than inventing an obligation no instrument creates.

The **CRQC horizon** is an operator assumption, not a fact, and the interface never lets you forget it: it sits adjustable in the top bar of every screen, appears in the evidence chain of every finding, and is printed in every export. Changing it re-runs the analysis in front of you.

## Running it

```bash
npm install
npm run dev
```

Then open the address Vite prints. Load one of the synthetic sample inventories, or drop in a CBOM of your own.

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm test           # engine test suite
npm run typecheck
```

`dist/` is a static bundle with relative asset paths. It can be served from anywhere, or opened from a file share.

## The sample inventories

Everything in `src/fixtures/` is **synthetic**, authored for development by `scripts/generate-fixtures.py`. There is no real estate behind it, no real scan, and no real organisation.

Two rules keep that honest, and both are enforced in code rather than only stated here:

1. Every inventory built from that directory carries `synthetic: true`.
2. The shell renders a persistent SYNTHETIC marker whenever the loaded inventory has that flag, and every generated report carries the same marker in its header. There is no way to view or export fixture output without the label travelling with it.

The fixtures go through the same parser as an imported file — they are not pre-parsed objects — so a parser bug shows up in development instead of hiding behind hand-written data.

Three are provided:

| Sample | What it shows |
|---|---|
| **reference estate** | A 20-system CBOM with an operator context file covering most of it. ~184 cryptographic uses, ~49% fully assessed. |
| **reference estate — discovery only** | The same CBOM with no context file. Collapses to almost entirely UNKNOWN, which is what a discovery tool on its own can actually tell you. |
| **payments-gateway repository scan** | A call-site export rather than a component tree. |

Loading the second one is the fastest way to understand the product's argument.

## Supplying context

The facts no scanner can collect go in a separate document on purpose — keeping them separate makes visible that they are human judgement, supplied by someone with a name, rather than measurements.

```json
{
  "sunsetFormat": "context",
  "version": "1",
  "assets": [
    {
      "selector": "payments-gateway",
      "dataSecrecyLifetimeYears": 10,
      "migrationEffortMonths": 14,
      "agility": "negotiated",
      "systemCriticality": "hva",
      "hndlExposed": true,
      "owner": "payments engineering"
    }
  ]
}
```

`selector` matches an asset id, a `bom-ref`, an exact name, or a `prefix*` glob. Exact matches win over globs, so a specific override is never shadowed by a broad one.

## How the score works

Additive and deterministic, so every point can be shown as a line in the evidence chain. There is no model and no weighting matrix nobody can read.

| Term | Weight |
|---|---|
| Base exposure — key establishment, broken | 30 |
| Base exposure — signature, broken | 24 |
| Base exposure — symmetric / hash, weakened | 6 / 5 |
| HNDL exposure | +10 |
| Migration window insufficient / tight | +18 / +9 |
| Deadline proximity | 0 to +9 (+12 if passed) |
| Secrecy beyond the CRQC horizon | 0 to +8 |
| Already broken classically | +12 |
| Key size below the family floor | +7 |
| System criticality (HVA / high / moderate) | +7 / +4 / +2 |
| Crypto-agility multiplier | ×0.88 to ×1.20 |

Bands: CRITICAL ≥ 70, HIGH ≥ 50, MEDIUM ≥ 30, LOW ≥ 12. CRITICAL starts at 70 because that is where a Shor-broken primitive with an insufficient migration window on a high-value system lands — nothing reaches it on deadline proximity alone.

**A finding with a missing blocking input scores `null`, not zero.** A zero would sort to the bottom of the queue and read as "safe", which is the exact failure this product exists to prevent. Unscored findings are unranked and reported separately.

## Architecture

```
src/
  types/domain.ts      the contract between engine and interface
  engine/              deterministic analysis, no DOM, no React
    deadlines.ts         the citation table
    algorithms.ts        recognition and normalization
    classify.ts          threat class and quantum impact
    mosca.ts             the inequality
    agility.ts           remediation friction
    score.ts             urgency, severity, verdict, confidence
    coverage.ts          what was and was not assessed
    rank.ts              ordering and engine-recommended scheduling
    simulate.ts          policy evaluation
    analyze.ts           the pipeline
    sanitize.ts          untrusted-input boundary
    parse/               CycloneDX, repo scan, context
  adapters/engine.ts   the only module components import the engine through
  state/               store, selectors, persistence, view registry
  components/          shell, dashboard, inventory, analysis, coverage,
                       simulation, plan, reports, import, shared
  export/report.ts     one report model feeding the preview, PDF, JSON and CSV
  fixtures/            synthetic inventories, labelled at the source
```

Components never import from `src/engine/**`. They call `src/adapters/engine.ts`, whose surface is async even though the local implementation is synchronous — so replacing it with a worker, a WASM build or a service is a one-file change and not a component rewrite.

## Security

Imported inventories are untrusted input: a CBOM is a JSON document produced by a scanner someone else ran against a codebase someone else wrote. Everything crossing that boundary goes through `src/engine/sanitize.ts`, which strips control characters and bidi overrides, caps string lengths, rejects prototype keys, and reduces absolute paths to their repository-relative tail so a shared report does not carry someone's home directory. CSV export neutralises formula-injection prefixes.

The app never uses `dangerouslySetInnerHTML`. The inventory and its analysis are never persisted — only settings, assumptions and operator overrides reach `localStorage`, and no inventory content ever enters the URL.

See [SECURITY.md](SECURITY.md).

## Keyboard

| Key | Action |
|---|---|
| `G` then `O` / `I` / `R` / `T` / `C` / `S` / `P` / `E` | Overview / Inventory / Triage / Timeline / Coverage / Simulation / Plan / Reports |
| `Ctrl`/`Cmd` `K` | Command palette — views, filters, actions, and live inventory search |
| `/` | Search the inventory |
| `J` / `K` | Next / previous finding, without closing the drawer |
| `?` | Legend |
| `Esc` | Close the panel |

Every view also carries a three-digit address (`100` Overview, `200` Inventory, …) that is typeable in the palette.

## Accessibility

Full keyboard operation including the inventory table and the timeline. Visible focus on every interactive element from one global rule. Semantic `<table>` with `aria-sort`. Dialogs and drawers are real dialogs with focus traps and restored focus. `prefers-reduced-motion` is honoured, and there is an independent in-product setting — neither overrides the other. No meaning is carried by colour alone: severity is encoded by hatch pattern first, so the ranking survives a grayscale print and does not depend on distinguishing red from orange.

## Licence

Apache-2.0. See [LICENSE](LICENSE).
