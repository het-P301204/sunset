import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Finding, PlanBucket } from '@/types/domain';
import { PLAN_BUCKETS } from '@/types/domain';
import { VERDICT_LABEL } from '@/engine/score';
import { AGILITY_LABEL } from '@/engine/agility';
import { useStore } from '@/state/store';
import { BUCKET_LABEL } from '@/state/selectors';
import { Drawer } from '@/components/shared/Overlays';
import { Button, Field, SectionHead, Select } from '@/components/shared/Primitives';
import { SEVERITY_LABEL, SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';
import { MoscaVisualization } from '@/components/analysis/MoscaVisualization';
import { AgilitySpectrum } from '@/components/analysis/CryptoAgility';
import { GapList, RiskExplanation } from '@/components/analysis/RiskExplanation';

/* ============================================================================
   THE FINDING DRAWER

   A drawer rather than a page, so the operator keeps their position in the
   queue: where a finding sits relative to its neighbours is information, and
   a full-page detail view throws it away on every click.

   J and K move to the next and previous finding in the current order without
   closing, which turns triage into one continuous pass instead of a sequence
   of open-read-close.
   ========================================================================= */

export function FindingDrawer({
  finding,
  onClose,
  onNavigate,
  siblingCount,
  siblingIndex,
}: {
  finding: Finding | null;
  onClose: () => void;
  onNavigate: (direction: 1 | -1) => void;
  siblingCount: number;
  siblingIndex: number;
}) {
  const { state, dispatch, reanalyze } = useStore();
  const entry = finding ? state.plan[finding.id] : undefined;
  const [overriding, setOverriding] = useState(false);
  const [draftBucket, setDraftBucket] = useState<PlanBucket>('now');
  const [draftReason, setDraftReason] = useState('');

  const evidenceGroups = useMemo(() => groupEvidence(finding), [finding]);

  if (!finding) return null;

  const submitOverride = () => {
    if (!draftReason.trim()) return;
    dispatch({
      type: 'plan/override',
      findingId: finding.id,
      bucket: draftBucket,
      reason: draftReason.trim(),
    });
    setOverriding(false);
    setDraftReason('');
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="t-data">{finding.asset.algorithm}</span>
          <span
            className="flex items-center gap-1.5 t-data text-xs uppercase tracking-[0.1em]"
            style={{ color: SEVERITY_VAR[finding.severity] }}
          >
            <SeverityMark severity={finding.severity} size={10} />
            {SEVERITY_LABEL[finding.severity]}
          </span>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span>{finding.asset.name}</span>
          <span className="t-data text-2xs text-ink-faint">
            {finding.threatClass.replace('-', ' ').toUpperCase()}
          </span>
          {finding.rank !== null ? (
            <span className="t-data text-2xs text-ink-faint">
              rank {String(finding.rank).padStart(2, '0')}
            </span>
          ) : null}
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="quiet"
              onClick={() => onNavigate(-1)}
              disabled={siblingIndex <= 0}
              aria-label="Previous finding"
            >
              <ChevronUp size={13} strokeWidth={1.75} />
              <span className="t-data text-2xs">K</span>
            </Button>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => onNavigate(1)}
              disabled={siblingIndex >= siblingCount - 1}
              aria-label="Next finding"
            >
              <ChevronDown size={13} strokeWidth={1.75} />
              <span className="t-data text-2xs">J</span>
            </Button>
            <span className="t-data ml-1 text-2xs text-ink-faint">
              {siblingIndex + 1} / {siblingCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {entry?.operatorBucket ? (
              <Button
                size="sm"
                variant="quiet"
                onClick={() =>
                  dispatch({
                    type: 'plan/override',
                    findingId: finding.id,
                    bucket: null,
                    reason: '',
                  })
                }
              >
                Withdraw override
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setDraftBucket(entry?.operatorBucket ?? entry?.engineBucket ?? 'now');
                setOverriding((v) => !v);
              }}
            >
              {entry?.operatorBucket ? 'Revise override' : 'Override placement'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 px-5 py-4">
        {/* --- verdict ------------------------------------------------------ */}
        <section>
          <SectionHead
            title="VERDICT"
            meta={
              finding.anchor
                ? `${finding.anchor.deadline.authority} · ${finding.anchor.deadline.year}`
                : 'no published deadline governs this threat class'
            }
          />
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <span
              className="t-data text-2xl"
              style={{
                color:
                  finding.verdict === 'migrate-now'
                    ? 'var(--c-critical)'
                    : finding.verdict === 'insufficient-data'
                      ? 'var(--c-unknown)'
                      : 'var(--c-ink)',
              }}
            >
              {VERDICT_LABEL[finding.verdict]}
            </span>
            <span className="t-data text-sm text-ink-muted">
              confidence {finding.confidence.toUpperCase()}
            </span>
            {finding.urgencyScore !== null ? (
              <span className="t-data text-sm text-ink-muted">
                urgency {finding.urgencyScore} / 100
              </span>
            ) : null}
          </div>
          {finding.anchor ? (
            <p className="mt-2 text-sm leading-[18px] text-ink-muted measure">
              {finding.anchor.deadline.clause}{' '}
              <span className="text-ink-faint">{finding.anchor.deadline.citation}</span>
            </p>
          ) : null}
        </section>

        {/* --- override record --------------------------------------------- */}
        {entry?.operatorBucket ? (
          <section className="border border-[color:var(--c-critical)] bg-[color:color-mix(in_srgb,var(--c-critical)_5%,transparent)] px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="t-label text-risk-critical">OPERATOR OVERRIDE</span>
              <span className="t-data text-sm text-ink">
                {BUCKET_LABEL[entry.operatorBucket]}
              </span>
              <span className="t-data text-2xs text-ink-muted">
                engine recommended {BUCKET_LABEL[entry.engineBucket]}
              </span>
              {entry.overriddenAt ? (
                <span className="t-data text-2xs text-ink-faint">
                  {entry.overriddenAt.slice(0, 10)}
                </span>
              ) : null}
            </div>
            {entry.operatorReason ? (
              <p className="mt-1.5 text-sm text-ink-dim measure">
                &ldquo;{entry.operatorReason}&rdquo;
              </p>
            ) : null}
          </section>
        ) : null}

        {overriding ? (
          <section className="border border-rule bg-bed-1 px-4 py-3">
            <h3 className="t-label mb-2">RECORD AN OVERRIDE</h3>
            <p className="mb-3 text-sm text-ink-muted measure">
              The engine recommends{' '}
              <span className="t-data text-ink-dim">
                {BUCKET_LABEL[entry?.engineBucket ?? 'review']}
              </span>
              . Your placement is stored beside it, never instead of it, and both appear in the
              report.
            </p>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <Select
                label="Operator placement"
                value={draftBucket}
                onChange={(e) => setDraftBucket(e.target.value as PlanBucket)}
              >
                {PLAN_BUCKETS.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {BUCKET_LABEL[bucket]}
                  </option>
                ))}
              </Select>
              <div className="flex flex-col gap-1">
                <label htmlFor="override-reason" className="t-label">
                  Reason (required)
                </label>
                <textarea
                  id="override-reason"
                  value={draftReason}
                  onChange={(e) => setDraftReason(e.target.value.slice(0, 300))}
                  rows={2}
                  placeholder="Platform upgrade already scheduled for Q4."
                  className="rounded-control border border-rule bg-bed-0 px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-amber-dim"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={submitOverride} disabled={!draftReason.trim()}>
                Record override
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setOverriding(false)}>
                Cancel
              </Button>
            </div>
          </section>
        ) : null}

        {/* --- mosca -------------------------------------------------------- */}
        <section>
          <SectionHead title="MIGRATION WINDOW" meta="Mosca's inequality" />
          <div className="mt-3">
            <MoscaVisualization
              finding={finding}
              crqcYear={state.assumptions.crqcYear}
              onCrqcChange={(year) => {
                dispatch({ type: 'assumptions', patch: { crqcYear: year } });
                void reanalyze();
              }}
            />
          </div>
        </section>

        {/* --- reasoning ---------------------------------------------------- */}
        <section>
          <SectionHead
            title="WHY IT IS RANKED HERE"
            meta={finding.rank !== null ? `position ${finding.rank}` : 'not ranked'}
          />
          <div className="mt-3">
            <RiskExplanation finding={finding} />
          </div>
        </section>

        {/* --- agility ------------------------------------------------------ */}
        <section>
          <SectionHead
            title="CRYPTO-AGILITY"
            meta={`${AGILITY_LABEL[finding.agility.grade]}${
              finding.agility.basis === 'protocol-inference' ? ' · inferred from protocol' : ''
            }`}
          />
          <div className="mt-1">
            <AgilitySpectrum finding={finding} />
          </div>
        </section>

        {/* --- gaps --------------------------------------------------------- */}
        <section>
          <SectionHead
            title="WHAT IS NOT KNOWN"
            meta={
              finding.gaps.length === 0
                ? 'nothing missing'
                : `${finding.gaps.filter((g) => g.blocking).length} blocking, ${
                    finding.gaps.filter((g) => !g.blocking).length
                  } advisory`
            }
          />
          <div className="mt-3">
            <GapList finding={finding} />
          </div>
        </section>

        {/* --- evidence ----------------------------------------------------- */}
        <section>
          <SectionHead title="EVIDENCE" meta={finding.asset.source.kind} />
          {evidenceGroups.map((group) => (
            <div key={group.origin} className="mt-3">
              <h4 className="t-label mb-1 text-[9px]">{group.title}</h4>
              <dl>
                {group.items.map((item) => (
                  <Field
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    mono={item.mono}
                    tone={item.value === 'not supplied' ? 'unknown' : 'default'}
                  />
                ))}
              </dl>
            </div>
          ))}

          {Object.keys(finding.asset.attributes).length > 0 ? (
            <div className="mt-3">
              <h4 className="t-label mb-1 text-[9px]">AS RECORDED IN THE INVENTORY</h4>
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {Object.entries(finding.asset.attributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-baseline justify-between gap-3 border-b border-rule-faint py-1"
                  >
                    <dt className="t-data text-2xs text-ink-muted">{key}</dt>
                    <dd className="t-data truncate text-2xs text-ink-dim">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </section>
      </div>
    </Drawer>
  );
}

interface EvidenceGroup {
  origin: string;
  title: string;
  items: { label: string; value: string; mono?: boolean }[];
}

/**
 * Evidence is grouped by where the value came from. An operator reading a
 * ranking needs to know which numbers a machine found and which numbers a
 * colleague estimated, because only one of those is arguable.
 */
function groupEvidence(finding: Finding | null): EvidenceGroup[] {
  if (!finding) return [];
  const titles: Record<string, string> = {
    inventory: 'FROM THE INVENTORY',
    context: 'SUPPLIED BY AN OPERATOR',
    assumption: 'ASSUMPTION',
    engine: 'DERIVED BY THE ENGINE',
  };
  const order = ['inventory', 'context', 'assumption', 'engine'];
  return order
    .map((origin) => ({
      origin,
      title: titles[origin]!,
      items: finding.evidence
        .filter((e) => e.origin === origin)
        .map((e) => ({ label: e.label, value: e.value, mono: e.mono })),
    }))
    .filter((group) => group.items.length > 0);
}
