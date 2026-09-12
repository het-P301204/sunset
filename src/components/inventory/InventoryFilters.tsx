import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import type {
  AgilityGrade,
  Confidence,
  FilterState,
  Finding,
  ThreatClass,
} from '@/types/domain';
import { AGILITY_ORDER, SEVERITY_ORDER } from '@/types/domain';
import { AGILITY_LABEL } from '@/engine/agility';
import { SEVERITY_LABEL, SeverityMark } from '@/components/shared/Hatch';
import { Button } from '@/components/shared/Primitives';
import type { Density } from './InventoryTable';

/* ============================================================================
   Filters.

   Every control shows the count it would leave behind, computed against the
   other active filters. A filter that silently produces zero rows is the most
   annoying thing an inventory explorer can do, and the count is cheap.
   ========================================================================= */

const THREAT_CLASSES: ThreatClass[] = [
  'key-establishment',
  'signature',
  'symmetric',
  'hash',
  'unclassified',
];
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low', 'none'];

export const InventoryFilters = forwardRef<
  HTMLInputElement,
  {
    filters: FilterState;
    onChange: (patch: Partial<FilterState>) => void;
    onReset: () => void;
    findings: Finding[];
    allFindings: Finding[];
    deadlineYears: number[];
    density: Density;
    onDensity: (density: Density) => void;
    activeCount: number;
  }
>(function InventoryFilters(
  {
    filters,
    onChange,
    onReset,
    findings,
    allFindings,
    deadlineYears,
    density,
    onDensity,
    activeCount,
  },
  ref,
) {
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const count = (predicate: (f: Finding) => boolean) => allFindings.filter(predicate).length;

  return (
    <div className="border-b border-rule bg-bed-0">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            size={12}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            ref={ref}
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Search assets, algorithms, paths, certificate subjects"
            aria-label="Search the inventory"
            className="h-7 w-full rounded-control border border-rule bg-bed-1 pl-7 pr-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-fast ease-out hover:border-rule-strong focus:border-amber-dim"
          />
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Row density">
          {(['analytical', 'table', 'compact'] as Density[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onDensity(mode)}
              aria-pressed={density === mode}
              className={`h-7 rounded-control border px-2 text-2xs uppercase tracking-[0.08em] transition-colors duration-fast ease-out ${
                density === mode
                  ? 'border-rule-strong bg-bed-2 text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink-dim'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {activeCount > 0 ? (
          <Button size="sm" variant="quiet" onClick={onReset}>
            <X size={11} strokeWidth={2} />
            Clear {activeCount}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-2 border-t border-rule-faint px-4 py-2">
        <FilterGroup label="SEVERITY">
          {SEVERITY_ORDER.map((severity) => (
            <FilterPill
              key={severity}
              active={filters.severities.includes(severity)}
              onClick={() => onChange({ severities: toggle(filters.severities, severity) })}
              count={count((f) => f.severity === severity)}
              mark={<SeverityMark severity={severity} size={8} />}
            >
              {SEVERITY_LABEL[severity]}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="THREAT CLASS">
          {THREAT_CLASSES.map((threatClass) => (
            <FilterPill
              key={threatClass}
              active={filters.threatClasses.includes(threatClass)}
              onClick={() => onChange({ threatClasses: toggle(filters.threatClasses, threatClass) })}
              count={count((f) => f.threatClass === threatClass)}
            >
              {threatClass.replace('-', ' ')}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="DEADLINE">
          {deadlineYears.map((year) => (
            <FilterPill
              key={year}
              active={filters.deadlineYears.includes(year)}
              onClick={() => onChange({ deadlineYears: toggle(filters.deadlineYears, year) })}
              count={count((f) => f.anchor?.deadline.year === year)}
            >
              {year}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="AGILITY">
          {([...AGILITY_ORDER, 'unknown'] as AgilityGrade[]).map((grade) => (
            <FilterPill
              key={grade}
              active={filters.agilities.includes(grade)}
              onClick={() => onChange({ agilities: toggle(filters.agilities, grade) })}
              count={count((f) => f.agility.grade === grade)}
            >
              {AGILITY_LABEL[grade]}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="CONFIDENCE">
          {CONFIDENCES.map((confidence) => (
            <FilterPill
              key={confidence}
              active={filters.confidences.includes(confidence)}
              onClick={() => onChange({ confidences: toggle(filters.confidences, confidence) })}
              count={count((f) => f.confidence === confidence)}
            >
              {confidence}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="EXPOSURE">
          <FilterPill
            active={filters.onlyHndl}
            onClick={() => onChange({ onlyHndl: !filters.onlyHndl })}
            count={count((f) => f.hndl)}
          >
            HNDL only
          </FilterPill>
          <FilterPill
            active={filters.onlyUnknown}
            onClick={() => onChange({ onlyUnknown: !filters.onlyUnknown })}
            count={count((f) => f.urgencyScore === null)}
          >
            Unknown only
          </FilterPill>
        </FilterGroup>
      </div>

      <div className="flex items-center justify-between border-t border-rule-faint px-4 py-1.5">
        <span className="t-data text-2xs text-ink-muted">
          {findings.length} of {allFindings.length} shown
        </span>
        <span className="t-data text-2xs text-ink-faint">
          {findings.filter((f) => f.urgencyScore === null).length} unknown in this selection
        </span>
      </div>
    </div>
  );
});

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 items-start gap-2">
      <legend className="sr-only">{label}</legend>
      <span className="t-label mt-1 shrink-0 text-[9px]">{label}</span>
      <span className="flex flex-wrap gap-1">{children}</span>
    </fieldset>
  );
}

function FilterPill({
  active,
  onClick,
  count,
  mark,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  mark?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={count === 0 && !active}
      className={`inline-flex h-5 items-center gap-1.5 rounded-control border px-1.5 text-2xs uppercase tracking-[0.06em] transition-colors duration-fast ease-out disabled:opacity-30 ${
        active
          ? 'border-amber-dim bg-amber-wash text-amber'
          : 'border-rule text-ink-muted hover:border-rule-strong hover:text-ink-dim'
      }`}
    >
      {mark}
      {children}
      <span className="t-data text-[9px] text-ink-faint">{count}</span>
    </button>
  );
}
