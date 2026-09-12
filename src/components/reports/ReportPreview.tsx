import type { ReportModel } from '@/export/report';
import { AGILITY_LABEL, AUTHORITY_LABEL, BUCKET_LABEL, VERDICT_LABEL } from '@/export/report';
import { OUTCOME_LABEL } from '@/engine/simulate';
import { SEVERITY_LABEL, SeverityMark } from '@/components/shared/Hatch';

/* ============================================================================
   REPORT PREVIEW

   The same markup prints. There is no separate PDF renderer and no second
   template that can drift from what the operator reviewed: the print
   stylesheet re-rules this document for paper, and what they saw is what comes
   out.

   The header carries the analysis id, the engine version and the CRQC
   assumption, and the SYNTHETIC banner is not removable when the inventory is
   a fixture.
   ========================================================================= */

export function ReportPreview({ model }: { model: ReportModel }) {
  const has = (section: Parameters<typeof model.sections.includes>[0]) =>
    model.sections.includes(section);

  return (
    <article
      id="sunset-report"
      className="report bg-bed-1 px-7 py-8 text-ink sm:px-10 sm:py-10"
    >
      {model.synthetic ? (
        <p className="mb-6 border border-risk-unknown px-3 py-2 t-data text-2xs uppercase tracking-[0.14em] text-risk-unknown">
          Synthetic inventory &middot; authored for development &middot; not a real assessment
        </p>
      ) : null}

      <header className="border-b-2 border-rule-strong pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl tracking-[0.02em]">SUNSET</h1>
          <span className="t-data text-2xs text-ink-muted">{model.analysisId}</span>
        </div>
        <p className="mt-1 text-md text-ink-dim">{model.title}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-4">
          <Meta label="INVENTORY" value={model.inventory.name} />
          <Meta label="FORMAT" value={model.inventory.version} />
          <Meta label="ANALYSED" value={model.assumptions.analysisDate.slice(0, 10)} />
          <Meta label="CRQC ASSUMED" value={String(model.assumptions.crqcYear)} />
        </dl>
      </header>

      {has('executive') ? (
        <Section title="1. Executive summary">
          <p className="text-md leading-[22px] text-ink-dim measure">
            {sentence(model)}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
            {(['critical', 'high', 'medium', 'low', 'safe', 'unknown'] as const).map((s) => (
              <div key={s}>
                <dt className="flex items-center gap-1.5 t-label text-3xs">
                  <SeverityMark severity={s} size={8} />
                  {SEVERITY_LABEL[s]}
                </dt>
                <dd className="t-data mt-0.5 text-xl font-light leading-none">
                  {model.counts[s] ?? 0}
                </dd>
              </div>
            ))}
          </dl>

          {model.deadlines.length > 0 ? (
            <table className="mt-6 w-full border-collapse text-left">
              <thead>
                <tr>
                  {['DEADLINE', 'OBLIGATION', 'AUTHORITY', 'FINDINGS'].map((h) => (
                    <th key={h} className="border-b border-rule py-1.5 t-label text-3xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.deadlines.map((d) => (
                  <tr key={`${d.year}-${d.label}`}>
                    <td className="border-b border-rule-faint py-1.5 t-data text-sm">{d.year}</td>
                    <td className="border-b border-rule-faint py-1.5 text-sm text-ink-dim">
                      {d.label}
                    </td>
                    <td className="border-b border-rule-faint py-1.5 t-data text-2xs text-ink-muted">
                      {AUTHORITY_LABEL[d.authority] ?? d.authority}
                    </td>
                    <td className="border-b border-rule-faint py-1.5 t-data text-sm">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Section>
      ) : null}

      {has('coverage') ? (
        <Section title="2. Coverage statement">
          <p className="text-md leading-[22px] text-ink-dim measure">
            {model.unknown.length} of {Object.values(model.counts).reduce((a, b) => a + b, 0)}{' '}
            findings could not be scored. Each one names the field that blocked it. No finding was
            dropped, defaulted, or scored on a substituted value; an unassessed asset is not a
            low-risk asset.
          </p>
          <table className="mt-4 w-full border-collapse text-left">
            <thead>
              <tr>
                {['ASSET', 'ALGORITHM', 'MISSING FIELD'].map((h) => (
                  <th key={h} className="border-b border-rule py-1.5 t-label text-3xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.unknown.slice(0, 40).map((finding) => (
                <tr key={finding.id}>
                  <td className="border-b border-rule-faint py-1 text-sm">{finding.asset.name}</td>
                  <td className="border-b border-rule-faint py-1 t-data text-sm text-ink-dim">
                    {finding.asset.algorithm}
                  </td>
                  <td className="border-b border-rule-faint py-1 t-data text-2xs text-risk-unknown">
                    {finding.gaps
                      .filter((g) => g.blocking)
                      .map((g) => g.field)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {model.unknown.length > 40 ? (
            <p className="mt-2 text-xs text-ink-muted">
              {model.unknown.length - 40} further unassessed findings are in the JSON and CSV
              exports.
            </p>
          ) : null}
        </Section>
      ) : null}

      {has('technical') ? (
        <Section title="3. Technical findings">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {['#', 'ASSET', 'ALGORITHM', 'SEV', 'SCORE', 'DEADLINE', 'LIFETIME', 'EFFORT', 'AGILITY', 'VERDICT'].map(
                  (h) => (
                    <th key={h} className="border-b border-rule py-1.5 t-label text-3xs">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {model.top.map((finding) => (
                <tr key={finding.id}>
                  <td className="border-b border-rule-faint py-1 t-data text-2xs text-ink-faint">
                    {String(finding.rank).padStart(2, '0')}
                  </td>
                  <td className="border-b border-rule-faint py-1 text-sm">{finding.asset.name}</td>
                  <td className="border-b border-rule-faint py-1 t-data text-sm text-ink-dim">
                    {finding.asset.algorithm}
                  </td>
                  <td className="border-b border-rule-faint py-1">
                    <SeverityMark severity={finding.severity} size={8} />
                  </td>
                  <td className="border-b border-rule-faint py-1 t-data text-sm">
                    {finding.urgencyScore}
                  </td>
                  <td className="border-b border-rule-faint py-1 t-data text-2xs">
                    {finding.anchor?.deadline.year ?? '—'}
                  </td>
                  <td className="border-b border-rule-faint py-1 t-data text-2xs">
                    {finding.mosca.dataLifetimeYears ?? '—'}
                  </td>
                  <td className="border-b border-rule-faint py-1 t-data text-2xs">
                    {finding.context?.migrationEffortMonths ?? '—'}
                  </td>
                  <td className="border-b border-rule-faint py-1 t-data text-2xs text-ink-muted">
                    {AGILITY_LABEL[finding.agility.grade]}
                  </td>
                  <td className="border-b border-rule-faint py-1 t-data text-2xs">
                    {VERDICT_LABEL[finding.verdict]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {has('roadmap') ? (
        <Section title="4. Migration roadmap">
          <p className="text-md leading-[22px] text-ink-dim measure">
            Sequenced by the year work must start, which is the deadline less the estimated
            migration effort, not the deadline itself.
          </p>
          <ul className="mt-3 space-y-1">
            {model.top.slice(0, 15).map((finding) => (
              <li
                key={finding.id}
                className="grid grid-cols-[2rem_1fr_6rem] items-baseline gap-3 border-b border-rule-faint py-1"
              >
                <span className="t-data text-2xs text-ink-faint">
                  {String(finding.rank).padStart(2, '0')}
                </span>
                <span className="text-sm">
                  {finding.asset.name}{' '}
                  <span className="t-data text-ink-muted">{finding.asset.algorithm}</span>
                </span>
                <span className="t-data text-right text-2xs text-ink-dim">
                  {finding.anchor ? `by ${finding.anchor.deadline.year}` : 'no deadline'}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {has('overrides') ? (
        <Section title="5. Operator overrides">
          {model.overrides.length === 0 ? (
            <p className="text-md text-ink-muted">
              No operator override has been recorded against this analysis. Every placement in this
              report is the engine&rsquo;s.
            </p>
          ) : (
            <ul className="space-y-2">
              {model.overrides.map(({ entry, finding }) => (
                <li key={entry.findingId} className="border-b border-rule-faint pb-2">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-sm">{finding.asset.name}</span>
                    <span className="t-data text-sm text-ink-muted">
                      {finding.asset.algorithm}
                    </span>
                    <span className="t-data text-2xs text-ink-faint">
                      engine {BUCKET_LABEL[entry.engineBucket]}
                    </span>
                    <span className="t-data text-2xs text-risk-critical">
                      operator {BUCKET_LABEL[entry.operatorBucket!]}
                    </span>
                  </div>
                  {entry.operatorReason ? (
                    <p className="mt-0.5 text-sm text-ink-dim">
                      &ldquo;{entry.operatorReason}&rdquo;
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      {has('simulation') && model.simulation ? (
        <Section title="6. Policy simulation">
          <p className="mb-3 border border-amber-dim px-2 py-1 t-data text-2xs uppercase tracking-[0.14em] text-amber">
            Simulation &middot; nothing was enforced
          </p>
          <p className="text-md leading-[22px] text-ink-dim measure">
            Policy: {model.simulation.policy.name}. Against the loaded inventory it would block{' '}
            {model.simulation.blocked} assets, warn on {model.simulation.warned}, allow{' '}
            {model.simulation.allowed}, and be unable to evaluate {model.simulation.unevaluable}.
          </p>
          <dl className="mt-3 grid grid-cols-4 gap-4">
            {(['blocked', 'warned', 'allowed', 'unevaluable'] as const).map((key) => (
              <div key={key}>
                <dt className="t-label text-3xs">{OUTCOME_LABEL[key]}</dt>
                <dd className="t-data mt-0.5 text-xl font-light">{model.simulation![key]}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      <footer className="mt-10 border-t border-rule pt-3 text-2xs text-ink-muted">
        <p className="t-data">
          SUNSET {model.engineVersion} &middot; offline analysis engine &middot; deterministic
          &middot; no network required
        </p>
        <p className="mt-1 measure">
          Urgency is computed from Mosca&rsquo;s inequality against an assumed CRQC year of{' '}
          {model.assumptions.crqcYear}. That year is an operator assumption, not a forecast, and
          every score in this document moves if it changes. Deadlines cite EO 14412 and NIST IR
          8547 as published.
        </p>
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="border-b border-rule pb-1.5 text-md tracking-[0.04em] text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="t-label text-3xs">{label}</dt>
      <dd className="t-data mt-0.5 truncate text-xs text-ink-dim">{value}</dd>
    </div>
  );
}

function sentence(model: ReportModel): string {
  const critical = model.counts.critical ?? 0;
  const high = model.counts.high ?? 0;
  const unknown = model.counts.unknown ?? 0;
  const nearest = model.deadlines[0];
  const parts: string[] = [];

  parts.push(
    `${critical + high} findings are ranked CRITICAL or HIGH against the published post-quantum deadlines.`,
  );
  if (nearest) {
    const authority = AUTHORITY_LABEL[nearest.authority] ?? nearest.authority;
    parts.push(
      `The nearest binding date is ${nearest.year}: ${nearest.count} findings are governed by the ${nearest.label.toLowerCase()} obligation under ${authority}.`,
    );
  }
  parts.push(
    `A further ${unknown} findings could not be scored at all, because an input the model requires was absent from the inventory. They are reported separately and are not low risk.`,
  );
  return parts.join(' ');
}
