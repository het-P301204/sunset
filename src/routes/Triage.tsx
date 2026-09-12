import { useEffect, useMemo, useState } from 'react';
import type { AnalysisResult, Finding } from '@/types/domain';
import { rankedFindings, unknownFindings } from '@/state/selectors';
import { PriorityQueue } from '@/components/dashboard/PriorityQueue';
import { Tabs } from '@/components/shared/Overlays';
import { SEVERITY_VAR } from '@/components/shared/Hatch';

/* ============================================================================
   TRIAGE  /  300

   The ranked queue in full, and beside it the pile that has no rank.

   Putting UNKNOWN on an equal tab rather than at the bottom of the same list
   is deliberate: they are not the least urgent findings, they are the ones
   nobody can place. A reader who works down the ranked tab and stops has
   handled part of the estate, and the tab label says how much.
   ========================================================================= */

type Tab = 'ranked' | 'unknown';

export function Triage({
  analysis,
  onSelect,
  selectedId,
  onVisibleChange,
}: {
  analysis: AnalysisResult;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onVisibleChange: (findings: Finding[]) => void;
}) {
  const [tab, setTab] = useState<Tab>('ranked');
  const ranked = useMemo(() => rankedFindings(analysis), [analysis]);
  const unknown = useMemo(() => unknownFindings(analysis), [analysis]);
  const list = tab === 'ranked' ? ranked : unknown;

  useEffect(() => onVisibleChange(list), [list, onVisibleChange]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 lg:px-6">
        <Tabs
          label="Queue"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'ranked', label: 'RANKED', count: ranked.length },
            { id: 'unknown', label: 'NOT SCORED', count: unknown.length },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'ranked' ? (
          <>
            <p className="border-b border-rule-faint px-4 py-2.5 text-sm text-ink-muted measure lg:px-6">
              Ordered by urgency score, then by the nearer deadline, then by the longer data
              lifetime. The bar under each score is the score broken into the terms that produced
              it — hover a segment to read one.
            </p>
            <PriorityQueue findings={ranked} onSelect={onSelect} selectedId={selectedId} />
          </>
        ) : (
          <UnknownQueue findings={unknown} onSelect={onSelect} selectedId={selectedId} />
        )}
      </div>
    </div>
  );
}

function UnknownQueue({
  findings,
  onSelect,
  selectedId,
}: {
  findings: Finding[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  if (findings.length === 0) {
    return (
      <p className="px-4 py-8 text-sm text-ink-muted lg:px-6">
        Every finding in this inventory carried the inputs the model needs. That is unusual; check
        the context file is the one you meant to load.
      </p>
    );
  }

  // Grouped by the field that blocked them, because that is the unit of work:
  // one missing field on one owner's spreadsheet unblocks all of them at once.
  const groups = new Map<string, Finding[]>();
  for (const finding of findings) {
    const key = finding.gaps.filter((g) => g.blocking).map((g) => g.field).join(' + ') || 'unknown';
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <>
      <p className="border-b border-rule-faint px-4 py-2.5 text-sm text-ink-muted measure lg:px-6">
        These findings were not scored, and they are not low risk. Each group below is blocked by
        the same missing field, so supplying it once clears the whole group.
      </p>
      {ordered.map(([field, group]) => (
        <section key={field} className="border-b border-rule">
          <header className="flex items-baseline justify-between gap-4 bg-bed-0 px-4 py-2 lg:px-6">
            <h3 className="t-data text-xs text-risk-unknown">{field}</h3>
            <span className="t-data text-2xs text-ink-faint">{group.length} findings</span>
          </header>
          <ul className="divide-y divide-rule-faint">
            {group.map((finding) => (
              <li key={finding.id}>
                <button
                  type="button"
                  onClick={() => onSelect(finding.id)}
                  className={`flex w-full items-baseline gap-x-4 gap-y-1 px-4 py-2 text-left transition-colors duration-fast ease-out hover:bg-bed-1 lg:px-6 ${
                    selectedId === finding.id ? 'bg-bed-1' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {finding.asset.name}
                  </span>
                  <span className="t-data shrink-0 text-sm text-ink-dim">
                    {finding.asset.algorithm}
                  </span>
                  <span className="t-data hidden shrink-0 text-2xs text-ink-muted sm:inline">
                    {finding.threatClass.replace('-', ' ').toUpperCase()}
                  </span>
                  <span
                    className="t-data shrink-0 text-2xs"
                    style={{ color: SEVERITY_VAR.unknown }}
                  >
                    NOT SCORED
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
