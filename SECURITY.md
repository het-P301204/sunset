# Security

SUNSET is an offline analysis tool. It has no server, no accounts, no network calls and no
credentials. That removes most of the usual attack surface and concentrates what remains in one
place: **the inventory you load is untrusted input.**

## Threat model

A CBOM is a JSON document produced by a scanner someone else ran against a codebase someone else
wrote, and it is frequently passed between organisations. Strings inside it reach the DOM, file
locations reach the evidence panel and the printed report, and keys reach object literals. The
document is data, never instructions.

What is explicitly in scope:

| Concern | Handling |
|---|---|
| Script injection through inventory strings | The app never uses `dangerouslySetInnerHTML`. All inventory content renders as React text nodes. |
| Control characters and bidi overrides in names and paths | Stripped in `src/engine/sanitize.ts`. A right-to-left override inside a filename can make a rendered path read as something it is not; that is a real trick, not a theoretical one. |
| Prototype pollution through inventory keys | `__proto__`, `constructor` and `prototype` are refused by `sanitize.prop` and `sanitize.attributes`, and attribute records are built on a null-prototype object. |
| Resource exhaustion | Component lists are capped at 20,000 entries with a parse warning, nested component recursion at depth 12, cipher suites at 64 per protocol, strings at 400 characters, and imported files at 24 MB. |
| Path disclosure in shared reports | `sanitize.locator` drops drive letters and `/home/<user>/`, `/Users/<user>/` prefixes and keeps only the last four path segments. |
| CSV formula injection | `src/export/report.ts` prefixes any cell beginning `=`, `+`, `-`, `@`, tab or CR with an apostrophe, and quotes everything containing a delimiter. |
| Out-of-range operator values | Context values are bounded — a 500-year secrecy lifetime is a typo, not a requirement, and an unbounded value would silently dominate every score in the queue. |
| Corrupt or hand-edited `localStorage` | Every persisted value is re-validated against an allow-list on read. An invalid entry falls back to the default rather than entering the running app. |

## What is stored

Only settings, operator assumptions and operator overrides, under the single key
`sunset.settings`.

**The inventory and its analysis are never persisted.** A cryptographic inventory is a list of an
organisation's weakest points; it is exactly the document an attacker would want, and there is no
reason for it to outlive the tab that analysed it.

No inventory content is ever placed in the URL. Only the view id enters the hash, because a URL
gets pasted into tickets and chat, and the name of a weak algorithm on a named internal system is
not something this tool should put on anyone's clipboard by default.

## What SUNSET is not

It implements no cryptography, and it is not a cryptographic library. It does not scan systems,
discover cryptography, or verify any claim the inventory makes. It enforces nothing — every
policy view is a simulation and is labelled as one.

Its output is an opinion computed from published deadlines and operator-supplied estimates. It is
intended to support a migration decision, not to make one.

## Reporting

This is a portfolio project rather than deployed software. If you find something wrong with it,
open an issue on the repository.
