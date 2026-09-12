import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft } from 'lucide-react';
import { useStore } from '@/state/store';
import { VIEWS, type ViewId } from '@/state/views';
import { FIXTURES } from '@/fixtures';
import { SeverityMark } from '@/components/shared/Hatch';
import { useFocusTrap } from '@/hooks/useKeyboard';
import type { Finding, Severity, ThreatClass } from '@/types/domain';

/* ============================================================================
   Command palette.

   Three kinds of entry, in one list:

     - views, addressable by name or by their three-digit address
     - actions that change what is on screen
     - live search over the loaded inventory, which is the point: an engineer
       who remembers "there was an RSA thing on the vpn box" should reach it
       without learning where the inventory view keeps its filters

   Search results carry their context, so the row itself answers the question
   rather than only navigating to the answer.
   ========================================================================= */

interface Entry {
  id: string;
  group: string;
  label: string;
  detail?: string;
  address?: string;
  severity?: Severity;
  run: () => void;
  keywords: string;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const { state, dispatch, loadFixture, reanalyze } = useStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(panelRef, open, onClose);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];

    for (const view of VIEWS) {
      list.push({
        id: `view-${view.id}`,
        group: 'GO TO',
        label: view.label,
        detail: view.summary,
        address: view.address,
        keywords: `${view.label} ${view.address} ${view.summary} g${view.chord}`,
        run: () => onNavigate(view.id),
      });
    }

    list.push(
      {
        id: 'filter-critical',
        group: 'FILTER',
        label: 'Show critical findings',
        detail: 'Inventory, severity CRITICAL only',
        keywords: 'critical severity filter red urgent',
        run: () => {
          dispatch({ type: 'filters/reset' });
          dispatch({ type: 'filters', patch: { severities: ['critical'] } });
          onNavigate('inventory');
        },
      },
      {
        id: 'filter-unknown',
        group: 'FILTER',
        label: 'Show unknown findings',
        detail: 'Everything the engine refused to score, with the missing field named',
        keywords: 'unknown unassessable gap missing coverage no recovery',
        run: () => {
          dispatch({ type: 'filters/reset' });
          dispatch({ type: 'filters', patch: { onlyUnknown: true } });
          onNavigate('inventory');
        },
      },
      {
        id: 'filter-hndl',
        group: 'FILTER',
        label: 'Show HNDL-exposed findings',
        detail: 'Key establishment whose recorded traffic is decryptable retroactively',
        keywords: 'hndl harvest now decrypt later key establishment',
        run: () => {
          dispatch({ type: 'filters/reset' });
          dispatch({ type: 'filters', patch: { onlyHndl: true } });
          onNavigate('inventory');
        },
      },
      {
        id: 'filter-2030',
        group: 'FILTER',
        label: 'Filter by the 2030 deadline',
        detail: 'Findings governed by the EO 14412 key-establishment date',
        keywords: 'deadline 2030 eo 14412 key establishment',
        run: () => {
          dispatch({ type: 'filters/reset' });
          dispatch({ type: 'filters', patch: { deadlineYears: [2030] } });
          onNavigate('inventory');
        },
      },
      {
        id: 'filter-clear',
        group: 'FILTER',
        label: 'Clear all filters',
        keywords: 'clear reset filters',
        run: () => dispatch({ type: 'filters/reset' }),
      },
      {
        id: 'action-legend',
        group: 'ACTION',
        label: 'Open the legend',
        detail: 'Every mark, hatch and grade this interface uses',
        keywords: 'legend key symbols hatch help ?',
        run: () => dispatch({ type: 'legend', open: true }),
      },
      {
        id: 'action-reanalyze',
        group: 'ACTION',
        label: 'Re-run the analysis',
        detail: 'Same inventory, current assumptions',
        keywords: 'reanalyse rerun refresh analyse',
        run: () => void reanalyze(),
      },
      {
        id: 'action-theme',
        group: 'ACTION',
        label: 'Switch theme',
        keywords: 'theme dark light appearance',
        run: () =>
          dispatch({
            type: 'settings',
            patch: { theme: state.settings.theme === 'light' ? 'dark' : 'light' },
          }),
      },
    );

    for (const fixture of FIXTURES) {
      list.push({
        id: `fixture-${fixture.id}`,
        group: 'LOAD',
        label: fixture.name,
        detail: fixture.summary,
        keywords: `load sample fixture synthetic ${fixture.name} ${fixture.summary}`,
        run: () => void loadFixture(fixture.id),
      });
    }

    return list;
  }, [dispatch, loadFixture, onNavigate, reanalyze, state.settings.theme]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? entries.filter((e) => e.keywords.toLowerCase().includes(q) || e.label.toLowerCase().includes(q))
      : entries;

    // Live inventory search sits underneath the commands, capped so a broad
    // term cannot turn the palette into a scroll.
    const findings = q.length >= 2 ? searchFindings(state.analysis?.findings ?? [], q) : [];
    const findingEntries: Entry[] = findings.map((finding) => ({
      id: `finding-${finding.id}`,
      group: 'INVENTORY',
      label: finding.asset.algorithm,
      detail: `${finding.asset.name} · ${threatLabel(finding.threatClass)}${
        finding.anchor ? ` · deadline ${finding.anchor.deadline.year}` : ''
      }`,
      severity: finding.severity,
      keywords: '',
      run: () => {
        dispatch({ type: 'select', id: finding.id });
        onNavigate('inventory');
      },
    }));

    return [...matched, ...findingEntries].slice(0, 40);
  }, [entries, query, state.analysis, dispatch, onNavigate]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const run = (entry: Entry) => {
    entry.run();
    onClose();
  };

  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-palette flex items-start justify-center p-4 pt-[10vh]">
      <div
        className="anim-fade absolute inset-0 bg-[color:rgba(0,0,0,0.55)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="anim-rise relative w-full max-w-xl overflow-hidden rounded-panel border border-rule bg-bed-1 shadow-pop"
      >
        <div className="flex items-center gap-2 border-b border-rule px-3">
          <span className="t-data text-2xs tracking-[0.15em] text-amber">SUNSET</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const entry = results[active];
                if (entry) run(entry);
              }
            }}
            placeholder="Type a command, an algorithm, or a view address"
            aria-label="Command or search"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            role="combobox"
            aria-expanded="true"
            className="h-11 flex-1 bg-transparent text-md text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="t-data text-2xs text-ink-faint">ESC</kbd>
        </div>

        <ul
          id="palette-results"
          ref={listRef}
          role="listbox"
          aria-label="Results"
          className="max-h-[54vh] overflow-y-auto py-1"
        >
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-ink-muted">
              Nothing matches “{query}”. Try an algorithm name, a system, or a view address.
            </li>
          ) : null}
          {results.map((entry, index) => {
            const showGroup = entry.group !== lastGroup;
            lastGroup = entry.group;
            return (
              <li key={entry.id}>
                {showGroup ? (
                  <div className="t-label px-3 pb-1 pt-2.5 text-[9px]">{entry.group}</div>
                ) : null}
                <div
                  id={`palette-${entry.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(entry)}
                  className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 ${
                    index === active ? 'bg-bed-3' : ''
                  }`}
                >
                  {entry.address ? (
                    <span className="t-data w-7 shrink-0 text-2xs text-ink-faint">
                      {entry.address}
                    </span>
                  ) : entry.severity ? (
                    <span className="flex w-7 shrink-0 justify-start">
                      <SeverityMark severity={entry.severity} size={9} />
                    </span>
                  ) : (
                    <span className="w-7 shrink-0" />
                  )}
                  <span
                    className={`shrink-0 text-sm ${entry.severity ? 't-data' : ''} text-ink`}
                  >
                    {entry.label}
                  </span>
                  {entry.detail ? (
                    <span className="min-w-0 truncate text-xs text-ink-muted">{entry.detail}</span>
                  ) : null}
                  {index === active ? (
                    <CornerDownLeft
                      size={11}
                      strokeWidth={1.75}
                      className="ml-auto shrink-0 text-ink-faint"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

function searchFindings(findings: Finding[], query: string): Finding[] {
  const matched = findings.filter((f) =>
    `${f.asset.algorithm} ${f.asset.name} ${f.asset.rawAlgorithm} ${f.asset.protocol ?? ''}`
      .toLowerCase()
      .includes(query),
  );
  matched.sort((a, b) => (b.urgencyScore ?? -1) - (a.urgencyScore ?? -1));
  return matched.slice(0, 8);
}

function threatLabel(threatClass: ThreatClass): string {
  return threatClass.replace('-', ' ');
}
