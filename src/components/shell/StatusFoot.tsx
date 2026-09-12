import { useStore } from '@/state/store';
import { localEngine } from '@/adapters/engine';
import { Tooltip } from '@/components/shared/Primitives';
import type { ViewId } from '@/state/views';

/* ============================================================================
   The status foot.

   A core log sheet carries its provenance along the bottom edge: who logged
   it, when, at what scale, and how much of the core came back. This does the
   same, and the last cell is the one that matters — coverage stays on screen
   in every view, so a reader can never look at a queue without also seeing how
   much of the inventory it speaks for.
   ========================================================================= */

export function StatusFoot({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { state } = useStore();
  const { analysis, status, inventory } = state;

  const coverage = analysis?.coverage;
  const assessable = coverage ? Math.round(coverage.assessableRatio * 100) : null;

  return (
    <footer className="flex h-foot shrink-0 items-center gap-0 overflow-x-auto border-t border-rule bg-bed-0 text-2xs t-data text-ink-faint">
      <Cell label="ENGINE">
        <Tooltip
          label="OFFLINE ENGINE"
          body="The analysis runs in this page. No network request is made at any point, and no credential is required."
          side="top"
        >
          <span className="inline-flex cursor-help items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 ${
                status === 'analyzing'
                  ? 'bg-amber'
                  : status === 'error'
                    ? 'bg-risk-critical'
                    : 'bg-risk-safe'
              }`}
              style={status === 'analyzing' ? { animation: 'pulse-rule 1s ease-in-out infinite' } : undefined}
            />
            <span className="text-ink-muted">
              {status === 'analyzing' ? 'ANALYSING' : status === 'error' ? 'HALTED' : 'READY'}
            </span>
            <span>{localEngine.id} {localEngine.version}</span>
          </span>
        </Tooltip>
      </Cell>

      <Cell label="INVENTORY">
        <span className="text-ink-muted">
          {inventory ? `${inventory.assets.length} uses` : 'none loaded'}
        </span>
        {inventory ? <span className="ml-1.5">{inventory.version}</span> : null}
      </Cell>

      <Cell label="ANALYSED">
        <span className="text-ink-muted">
          {analysis ? formatTimestamp(analysis.analysedAt) : 'never'}
        </span>
        {analysis ? (
          <span className="ml-1.5">{totalMs(analysis.stages)} ms</span>
        ) : null}
      </Cell>

      <button
        type="button"
        onClick={() => onNavigate('coverage')}
        disabled={!coverage}
        className="group flex h-full items-center gap-2 border-l border-rule px-3 transition-colors duration-fast ease-out hover:bg-bed-2 disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span className="t-label text-[9px] leading-none">COVERAGE</span>
        {coverage ? (
          <>
            <span className="text-ink-muted group-hover:text-ink-dim">
              {assessable}% assessable
            </span>
            <span className="text-risk-unknown">{coverage.unknown} unknown</span>
          </>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </button>

      <div className="ml-auto flex h-full items-center gap-3 border-l border-rule px-3">
        <span className="hidden text-ink-faint lg:inline">deterministic</span>
        <span className="hidden text-ink-faint lg:inline">no network</span>
        {analysis ? <span title="Analysis identity">{analysis.id}</span> : null}
      </div>
    </footer>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full shrink-0 items-center gap-2 border-r border-rule px-3">
      <span className="t-label text-[9px] leading-none">{label}</span>
      {children}
    </div>
  );
}

function totalMs(stages: { durationMs: number }[]): string {
  const total = stages.reduce((sum, s) => sum + s.durationMs, 0);
  return total.toFixed(total < 10 ? 2 : 1);
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
