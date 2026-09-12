import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Finding, SortKey, SortState } from '@/types/domain';
import { AGILITY_LABEL } from '@/engine/agility';
import { SEVERITY_VAR, SeverityMark } from '@/components/shared/Hatch';
import { AgilitySpark } from '@/components/dashboard/PriorityQueue';

/* ============================================================================
   INVENTORY TABLE

   A real table element: semantic rows, a sticky header, aria-sort on the
   sorted column, and full keyboard traversal. Not a grid of cards, and not a
   div soup with role attributes bolted on.

   Rows above a threshold are windowed. Beyond a few hundred rows the browser
   spends its frame budget on cells nobody is looking at, and an inventory
   export from a large estate is exactly where this tool has to stay usable.
   ========================================================================= */

const ROW_H = { analytical: 44, table: 34, compact: 28 } as const;
const VIRTUAL_THRESHOLD = 220;
const OVERSCAN = 12;

export type Density = keyof typeof ROW_H;

interface Column {
  key: SortKey | null;
  label: string;
  align?: 'right';
  width?: string;
  /** Densities that show this column. */
  show: Density[];
}

const COLUMNS: Column[] = [
  { key: null, label: '', width: '1.75rem', show: ['analytical', 'table', 'compact'] },
  { key: 'name', label: 'ASSET', show: ['analytical', 'table', 'compact'] },
  { key: 'algorithm', label: 'ALGORITHM', width: '9rem', show: ['analytical', 'table', 'compact'] },
  { key: null, label: 'CLASS', width: '9rem', show: ['analytical', 'table'] },
  { key: 'deadline', label: 'DEADLINE', width: '5.5rem', show: ['analytical', 'table', 'compact'] },
  { key: 'lifetime', label: 'LIFETIME', width: '5.5rem', align: 'right', show: ['analytical'] },
  { key: 'effort', label: 'EFFORT', width: '5.5rem', align: 'right', show: ['analytical'] },
  { key: null, label: 'AGILITY', width: '10rem', show: ['analytical', 'table'] },
  { key: 'confidence', label: 'CONF', width: '4.5rem', show: ['analytical'] },
  { key: 'urgency', label: 'URGENCY', width: '8rem', show: ['analytical', 'table', 'compact'] },
];

export function InventoryTable({
  findings,
  sort,
  onSort,
  onSelect,
  selectedId,
  density,
}: {
  findings: Finding[];
  sort: SortState;
  onSort: (sort: SortState) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  density: Density;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const rowHeight = ROW_H[density];
  const columns = COLUMNS.filter((c) => c.show.includes(density));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const observer = new ResizeObserver(() => setViewportH(el.clientHeight));
    el.addEventListener('scroll', onScroll, { passive: true });
    observer.observe(el);
    setViewportH(el.clientHeight);
    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const virtual = findings.length > VIRTUAL_THRESHOLD;
  const { start, end } = useMemo(() => {
    if (!virtual) return { start: 0, end: findings.length };
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
    const last = Math.min(
      findings.length,
      Math.ceil((scrollTop + viewportH) / rowHeight) + OVERSCAN,
    );
    return { start: first, end: last };
  }, [virtual, scrollTop, viewportH, rowHeight, findings.length]);

  const visible = findings.slice(start, end);

  const toggleSort = (key: SortKey) => {
    onSort(
      sort.key === key
        ? { key, direction: sort.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: key === 'name' || key === 'algorithm' ? 'asc' : 'desc' },
    );
  };

  return (
    <div ref={scrollRef} className="relative h-full overflow-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          {findings.length} cryptographic uses, sorted by {sort.key}, {sort.direction}ending.
        </caption>
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((column) => {
              const sorted = column.key && sort.key === column.key;
              return (
                <th
                  key={column.label || 'mark'}
                  scope="col"
                  aria-sort={
                    sorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  style={{ width: column.width }}
                  className="border-b border-rule bg-bed-0 p-0"
                >
                  {column.key ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key!)}
                      className={`flex h-8 w-full items-center gap-1 px-2 transition-colors duration-fast ease-out hover:bg-bed-2 ${
                        column.align === 'right' ? 'justify-end' : ''
                      }`}
                    >
                      <span className={`t-label text-[9px] ${sorted ? 'text-ink-dim' : ''}`}>
                        {column.label}
                      </span>
                      {sorted ? (
                        sort.direction === 'asc' ? (
                          <ArrowUp size={9} strokeWidth={2} className="text-amber" />
                        ) : (
                          <ArrowDown size={9} strokeWidth={2} className="text-amber" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    <span
                      className={`flex h-8 items-center px-2 t-label text-[9px] ${
                        column.align === 'right' ? 'justify-end' : ''
                      }`}
                    >
                      {column.label}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {virtual && start > 0 ? (
            <tr style={{ height: start * rowHeight }} aria-hidden="true">
              <td colSpan={columns.length} />
            </tr>
          ) : null}

          {visible.map((finding) => (
            <Row
              key={finding.id}
              finding={finding}
              columns={columns}
              density={density}
              height={rowHeight}
              selected={selectedId === finding.id}
              onSelect={onSelect}
            />
          ))}

          {virtual && end < findings.length ? (
            <tr style={{ height: (findings.length - end) * rowHeight }} aria-hidden="true">
              <td colSpan={columns.length} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  finding,
  columns,
  density,
  height,
  selected,
  onSelect,
}: {
  finding: Finding;
  columns: Column[];
  density: Density;
  height: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const unknown = finding.urgencyScore === null;
  const cell = 'border-b border-rule-faint px-2 align-middle';

  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={`${finding.asset.algorithm} on ${finding.asset.name}`}
      onClick={() => onSelect(finding.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(finding.id);
        }
      }}
      style={{ height }}
      className={`cursor-pointer transition-colors duration-fast ease-out hover:bg-bed-1 ${
        selected ? 'bg-bed-2' : ''
      }`}
    >
      {columns.map((column) => {
        switch (column.label) {
          case '':
            return (
              <td key="mark" className={cell}>
                <SeverityMark severity={finding.severity} size={9} />
              </td>
            );
          case 'ASSET':
            return (
              <td key="asset" className={cell}>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-ink">{finding.asset.name}</span>
                  {finding.hndl ? (
                    <span
                      title="Harvest now, decrypt later"
                      className="t-data shrink-0 border border-rule px-1 text-[8px] uppercase tracking-[0.08em] text-ink-muted"
                    >
                      HNDL
                    </span>
                  ) : null}
                </div>
                {density === 'analytical' && finding.asset.source.locator ? (
                  <div className="t-data truncate text-[10px] text-ink-faint">
                    {finding.asset.source.locator}
                    {finding.asset.source.line ? `:${finding.asset.source.line}` : ''}
                  </div>
                ) : null}
              </td>
            );
          case 'ALGORITHM':
            return (
              <td key="alg" className={`${cell} t-data text-sm text-ink-dim`}>
                <span className="truncate">{finding.asset.algorithm}</span>
              </td>
            );
          case 'CLASS':
            return (
              <td key="class" className={`${cell} t-data text-2xs text-ink-muted`}>
                {finding.threatClass.replace('-', ' ').toUpperCase()}
              </td>
            );
          case 'DEADLINE':
            return (
              <td key="deadline" className={`${cell} t-data text-xs`}>
                {finding.anchor ? (
                  <span className="text-ink-dim">{finding.anchor.deadline.year}</span>
                ) : (
                  <span className="text-ink-faint">none</span>
                )}
              </td>
            );
          case 'LIFETIME':
            return (
              <td key="life" className={`${cell} t-data text-right text-xs`}>
                {finding.mosca.dataLifetimeYears === null ? (
                  <span className="text-risk-unknown">&mdash;</span>
                ) : (
                  <span className="text-ink-dim">{finding.mosca.dataLifetimeYears}y</span>
                )}
              </td>
            );
          case 'EFFORT':
            return (
              <td key="effort" className={`${cell} t-data text-right text-xs`}>
                {finding.context?.migrationEffortMonths === undefined ? (
                  <span className="text-risk-unknown">&mdash;</span>
                ) : (
                  <span className="text-ink-dim">{finding.context.migrationEffortMonths}mo</span>
                )}
              </td>
            );
          case 'AGILITY':
            return (
              <td key="agility" className={cell}>
                <span className="flex items-center gap-1.5">
                  <AgilitySpark grade={finding.agility.grade} />
                  <span
                    className={`t-data whitespace-nowrap text-[10px] ${
                      finding.agility.grade === 'unknown' ? 'text-risk-unknown' : 'text-ink-muted'
                    }`}
                  >
                    {AGILITY_LABEL[finding.agility.grade]}
                  </span>
                </span>
              </td>
            );
          case 'CONF':
            return (
              <td key="conf" className={`${cell} t-data text-2xs`}>
                <span
                  className={
                    finding.confidence === 'none'
                      ? 'text-risk-unknown'
                      : finding.confidence === 'low'
                        ? 'text-ink-muted'
                        : 'text-ink-dim'
                  }
                >
                  {finding.confidence.toUpperCase()}
                </span>
              </td>
            );
          case 'URGENCY':
            return (
              <td key="urgency" className={cell}>
                {unknown ? (
                  <span className="flex items-center gap-2">
                    <svg width="36" height="7" aria-hidden="true">
                      <rect width="36" height="7" fill="url(#hx-unknown)" />
                      <rect
                        width="35"
                        height="6"
                        x="0.5"
                        y="0.5"
                        fill="none"
                        stroke="var(--c-unknown)"
                        strokeDasharray="2 2"
                      />
                    </svg>
                    <span className="t-data text-2xs text-risk-unknown">NOT SCORED</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="h-[7px] w-9 bg-bed-2">
                      <span
                        className="block h-full"
                        style={{
                          width: `${finding.urgencyScore}%`,
                          background: SEVERITY_VAR[finding.severity],
                        }}
                      />
                    </span>
                    <span
                      className="t-data text-xs"
                      style={{ color: SEVERITY_VAR[finding.severity] }}
                    >
                      {finding.urgencyScore}
                    </span>
                  </span>
                )}
              </td>
            );
          default:
            return <td key={column.label} className={cell} />;
        }
      })}
    </tr>
  );
}
