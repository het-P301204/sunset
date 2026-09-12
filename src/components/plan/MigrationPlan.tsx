import { useState } from 'react';
import type { Finding, PlanBucket, PlanEntry } from '@/types/domain';
import { PLAN_BUCKETS } from '@/types/domain';
import { BUCKET_LABEL, type PlanColumn } from '@/state/selectors';
import { SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';
import { Button, Select } from '@/components/shared/Primitives';
import { Modal } from '@/components/shared/Overlays';

/* ============================================================================
   MIGRATION PLAN

   Columns by the year work has to start. Two rules make this more than a
   kanban board:

   1. The engine's recommendation is never overwritten. An overridden entry
      shows both placements, and the report prints both.
   2. An override requires a reason. Not because a form field makes it true,
      but because "why is this in Q4 and not Q2" is the first question asked in
      the review, and the answer belongs next to the decision rather than in
      somebody's memory.
   ========================================================================= */

export function MigrationPlan({
  columns,
  onSelect,
  onOverride,
  onWithdraw,
}: {
  columns: PlanColumn[];
  onSelect: (id: string) => void;
  onOverride: (findingId: string, bucket: PlanBucket, reason: string) => void;
  onWithdraw: (findingId: string) => void;
}) {
  const [moving, setMoving] = useState<{ entry: PlanEntry; finding: Finding } | null>(null);
  const [bucket, setBucket] = useState<PlanBucket>('now');
  const [reason, setReason] = useState('');

  const openMove = (entry: PlanEntry, finding: Finding) => {
    setMoving({ entry, finding });
    setBucket(entry.operatorBucket ?? entry.engineBucket);
    setReason(entry.operatorReason ?? '');
  };

  const totalOverrides = columns.reduce((sum, c) => sum + c.overrides, 0);

  return (
    <>
      <div className="flex items-center justify-between border-b border-rule px-4 py-2">
        <p className="text-sm text-ink-muted measure">
          Placed by the year work must start, which is the governing deadline less the estimated
          migration effort.
        </p>
        {totalOverrides > 0 ? (
          <span className="t-data shrink-0 border border-[color:var(--c-critical)] px-1.5 py-0.5 text-2xs uppercase tracking-[0.08em] text-risk-critical">
            {totalOverrides} override{totalOverrides === 1 ? '' : 's'} recorded
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-px bg-rule-faint sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {columns.map((column) => (
          <section key={column.bucket} className="flex min-h-[9rem] flex-col bg-bed-0">
            <header className="flex items-baseline justify-between gap-2 border-b border-rule px-3 py-2">
              <h3
                className={`t-label ${column.bucket === 'now' ? 'text-amber' : column.bucket === 'review' ? 'text-risk-unknown' : 'text-ink-dim'}`}
              >
                {column.label}
              </h3>
              <span className="t-data text-2xs text-ink-faint">{column.entries.length}</span>
            </header>

            {column.entries.length === 0 ? (
              <p className="px-3 py-4 text-xs text-ink-faint">
                {column.bucket === 'review'
                  ? 'Nothing needs review.'
                  : 'No work starts in this period.'}
              </p>
            ) : (
              <ul className="max-h-[calc(100dvh-16rem)] divide-y divide-rule-faint overflow-y-auto">
                {column.entries.slice(0, 60).map(({ entry, finding }) => (
                  <li key={entry.findingId} className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelect(finding.id)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors duration-fast ease-out hover:bg-bed-1"
                    >
                      <span className="pt-0.5">
                        <SeverityMark severity={finding.severity} size={8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-ink">
                          {finding.asset.name}
                        </span>
                        <span className="t-data mt-0.5 block truncate text-[10px] text-ink-muted">
                          {finding.asset.algorithm}
                          {finding.anchor ? ` · ${finding.anchor.deadline.year}` : ''}
                        </span>
                        {entry.operatorBucket ? (
                          <span className="mt-1 flex items-center gap-1.5">
                            <span className="t-data border border-[color:var(--c-critical)] px-1 text-3xs uppercase tracking-[0.06em] text-risk-critical">
                              OVR
                            </span>
                            <span className="t-data truncate text-3xs text-ink-faint">
                              engine: {BUCKET_LABEL[entry.engineBucket]}
                            </span>
                          </span>
                        ) : null}
                      </span>
                      {finding.urgencyScore !== null ? (
                        <span
                          className="t-data shrink-0 pt-0.5 text-[10px]"
                          style={{ color: SEVERITY_VAR[finding.severity] }}
                        >
                          {finding.urgencyScore}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => openMove(entry, finding)}
                      className="absolute right-1 top-1 rounded-control border border-rule bg-bed-2 px-1.5 py-0.5 text-3xs uppercase tracking-[0.08em] text-ink-muted opacity-0 transition-opacity duration-fast focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      Move
                    </button>
                  </li>
                ))}
                {column.entries.length > 60 ? (
                  <li className="px-3 py-2 text-[10px] text-ink-faint">
                    +{column.entries.length - 60} more in this period
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        ))}
      </div>

      <Modal
        open={moving !== null}
        onClose={() => setMoving(null)}
        title="OPERATOR OVERRIDE"
        footer={
          <div className="flex items-center justify-between gap-2">
            {moving?.entry.operatorBucket ? (
              <Button
                size="sm"
                variant="quiet"
                onClick={() => {
                  onWithdraw(moving.entry.findingId);
                  setMoving(null);
                }}
              >
                Withdraw override
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="quiet" onClick={() => setMoving(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!reason.trim()}
                onClick={() => {
                  if (!moving || !reason.trim()) return;
                  onOverride(moving.entry.findingId, bucket, reason.trim());
                  setMoving(null);
                }}
              >
                Record override
              </Button>
            </div>
          </div>
        }
      >
        {moving ? (
          <div className="space-y-4">
            <div>
              <div className="text-md text-ink">{moving.finding.asset.name}</div>
              <div className="t-data mt-0.5 text-sm text-ink-muted">
                {moving.finding.asset.algorithm}
                {moving.finding.anchor
                  ? ` · deadline ${moving.finding.anchor.deadline.year}`
                  : ''}
              </div>
            </div>

            <div className="border border-rule bg-bed-0 px-3 py-2">
              <span className="t-label">ENGINE RECOMMENDS</span>
              <div className="t-data mt-0.5 text-md text-ink">
                {BUCKET_LABEL[moving.entry.engineBucket]}
              </div>
              <p className="mt-1 text-xs text-ink-muted measure">
                {moving.finding.mosca.migrationYears !== null && moving.finding.anchor
                  ? `${moving.finding.mosca.migrationYears.toFixed(2)} years of effort against a ${moving.finding.anchor.deadline.year} deadline.`
                  : 'Placed in review because an input needed to schedule it is missing.'}
              </p>
            </div>

            <Select
              label="Operator placement"
              value={bucket}
              onChange={(e) => setBucket(e.target.value as PlanBucket)}
            >
              {PLAN_BUCKETS.map((b) => (
                <option key={b} value={b}>
                  {BUCKET_LABEL[b]}
                </option>
              ))}
            </Select>

            <div className="flex flex-col gap-1">
              <label htmlFor="plan-reason" className="t-label">
                Reason (required)
              </label>
              <textarea
                id="plan-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="Platform upgrade already scheduled for Q4 2027; the migration rides with it."
                className="rounded-control border border-rule bg-bed-0 px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-amber-dim"
              />
              <p className="text-xs text-ink-muted">
                The engine&rsquo;s placement is kept. Both appear in the plan and in the report.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
