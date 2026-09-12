import { useMemo, useState } from 'react';
import type { Finding, ThreatClass, WindowState } from '@/types/domain';
import { Tooltip } from '@/components/shared/Primitives';

/* ============================================================================
   THREAT MATRIX

   Attack feasibility across, migration urgency down.

   The column order is the argument. Symmetric and hash sit on the left because
   Grover halves a margin; signatures sit next because Shor forges them but
   only from the day the machine exists; key establishment sits on the right
   because Shor reads traffic that was recorded years earlier. That last column
   is the only one where the damage is already accruing, and the HNDL mark on
   its header says so.

   Clicking a cell filters the inventory to exactly that intersection.
   ========================================================================= */

const COLUMNS: { id: ThreatClass; label: string; sub: string; hndl?: boolean }[] = [
  { id: 'hash', label: 'HASH', sub: 'Grover · margin reduced' },
  { id: 'symmetric', label: 'SYMMETRIC', sub: 'Grover · margin reduced' },
  { id: 'signature', label: 'SIGNATURE', sub: 'Shor · forgeable from CRQC' },
  {
    id: 'key-establishment',
    label: 'KEY ESTABLISHMENT',
    sub: 'Shor · decryptable retroactively',
    hndl: true,
  },
];

const ROWS: { id: WindowState; label: string; sub: string }[] = [
  { id: 'insufficient', label: 'INSUFFICIENT', sub: 'required span exceeds the window' },
  { id: 'tight', label: 'TIGHT', sub: 'under two years of slack' },
  { id: 'sufficient', label: 'SUFFICIENT', sub: 'window holds' },
  { id: 'not-applicable', label: 'NOT APPLICABLE', sub: 'Mosca does not govern' },
  { id: 'unknown', label: 'UNKNOWN', sub: 'window cannot be evaluated' },
];

export function ThreatMatrix({
  findings,
  onSelectCell,
}: {
  findings: Finding[];
  onSelectCell: (threatClass: ThreatClass | null, window: WindowState | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const grid = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const finding of findings) {
      const key = `${finding.threatClass}|${finding.mosca.windowState}`;
      const list = map.get(key) ?? [];
      list.push(finding);
      map.set(key, list);
    }
    return map;
  }, [findings]);

  /*
   * Intensity is scaled inside each row, and each row has its own ceiling.
   *
   * Scaling across the whole matrix inverted the meaning of the thing: the
   * largest cells in this product are NOT APPLICABLE (symmetric and hash, which
   * Mosca does not govern), so a global scale painted the two cells the reader
   * must not act on brighter than every cell they must. Weight now reads as
   * urgency, which is what a reader assumes a heat map means.
   */
  const ROW_CEILING: Record<WindowState, number> = {
    insufficient: 0.62,
    tight: 0.44,
    unknown: 0.4,
    sufficient: 0.18,
    'not-applicable': 0.14,
  };

  const rowMax = useMemo(() => {
    const out = new Map<WindowState, number>();
    for (const row of ROWS) {
      out.set(
        row.id,
        Math.max(...COLUMNS.map((c) => grid.get(`${c.id}|${row.id}`)?.length ?? 0), 1),
      );
    }
    return out;
  }, [grid]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[38rem] border-collapse">
        <caption className="sr-only">
          Findings by threat class and migration window state. Select a cell to filter the
          inventory.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-[8.5rem] border-b border-rule p-0" />
            {COLUMNS.map((column) => (
              <th key={column.id} scope="col" className="border-b border-rule p-0 align-bottom">
                <button
                  type="button"
                  onClick={() => onSelectCell(column.id, null)}
                  className="flex w-full flex-col items-start gap-0.5 px-2 pb-2 pt-3 text-left transition-colors duration-fast ease-out hover:bg-bed-1"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="t-label text-3xs text-ink-dim">{column.label}</span>
                    {column.hndl ? (
                      <Tooltip
                        label="HNDL"
                        body="Harvest now, decrypt later. Traffic on this column is being recorded today and becomes readable the day a CRQC exists. The exposure is not in the future."
                      >
                        <span className="t-data cursor-help border border-[color:var(--c-critical)] px-1 text-3xs uppercase tracking-[0.08em] text-risk-critical">
                          HNDL
                        </span>
                      </Tooltip>
                    ) : null}
                  </span>
                  <span className="text-[10px] leading-tight text-ink-faint">{column.sub}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const rowTotal = COLUMNS.reduce(
              (sum, c) => sum + (grid.get(`${c.id}|${row.id}`)?.length ?? 0),
              0,
            );
            if (rowTotal === 0) return null;
            return (
              <tr key={row.id}>
                <th scope="row" className="border-b border-rule-faint p-0 text-left align-middle">
                  <button
                    type="button"
                    onClick={() => onSelectCell(null, row.id)}
                    className="flex w-full flex-col gap-0.5 px-2 py-2.5 text-left transition-colors duration-fast ease-out hover:bg-bed-1"
                  >
                    <span
                      className={`t-label text-3xs ${
                        row.id === 'insufficient'
                          ? 'text-risk-critical'
                          : row.id === 'unknown'
                            ? 'text-risk-unknown'
                            : 'text-ink-dim'
                      }`}
                    >
                      {row.label}
                    </span>
                    <span className="text-[10px] leading-tight text-ink-faint">{row.sub}</span>
                  </button>
                </th>
                {COLUMNS.map((column) => {
                  const key = `${column.id}|${row.id}`;
                  const cell = grid.get(key) ?? [];
                  const critical = cell.filter((f) => f.severity === 'critical').length;
                  const ceiling = ROW_CEILING[row.id];
                  const intensity =
                    cell.length === 0
                      ? 0
                      : 0.06 + (cell.length / (rowMax.get(row.id) ?? 1)) * ceiling;
                  const isHot = row.id === 'insufficient' && column.hndl && cell.length > 0;
                  return (
                    <td key={key} className="border-b border-l border-rule-faint p-0">
                      <button
                        type="button"
                        disabled={cell.length === 0}
                        onClick={() => onSelectCell(column.id, row.id)}
                        onMouseEnter={() => setHover(key)}
                        onMouseLeave={() => setHover(null)}
                        className="relative flex h-[52px] w-full items-center justify-center transition-colors duration-fast ease-out disabled:cursor-default"
                        style={{
                          background:
                            cell.length === 0
                              ? 'transparent'
                              : `color-mix(in srgb, ${
                                  row.id === 'unknown'
                                    ? 'var(--c-unknown)'
                                    : row.id === 'insufficient'
                                      ? 'var(--c-critical)'
                                      : 'var(--c-ink-dim)'
                                } ${Math.round(intensity * 100)}%, transparent)`,
                          outline:
                            hover === key && cell.length
                              ? '1px solid var(--c-amber)'
                              : isHot
                                ? '1px solid var(--c-critical)'
                                : 'none',
                          outlineOffset: -1,
                        }}
                        aria-label={`${cell.length} findings, ${column.label}, window ${row.label}`}
                      >
                        {cell.length > 0 ? (
                          <span className="flex flex-col items-center leading-none">
                            <span className="t-data text-lg text-ink">{cell.length}</span>
                            {critical > 0 ? (
                              // On a strongly tinted cell the critical hue is
                              // reading against its own ground, so the count
                              // steps up to ink rather than disappearing into
                              // the fill it is describing.
                              <span
                                className="t-data mt-1 text-3xs"
                                style={{
                                  color:
                                    intensity > 0.3 ? 'var(--c-ink)' : 'var(--c-critical)',
                                }}
                              >
                                {critical} crit
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="t-data text-2xs text-ink-faint" aria-hidden="true">
                            &middot;
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
