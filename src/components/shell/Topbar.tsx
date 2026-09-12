import { Command, Minus, Plus, Search } from 'lucide-react';
import { useStore } from '@/state/store';
import { FIXTURES } from '@/fixtures';
import { VIEW_BY_ID, type ViewId } from '@/state/views';
import { Button, Tooltip } from '@/components/shared/Primitives';
import { SyntheticMark } from '@/components/shared/States';
import { Wordmark } from './Sidebar';

/* ============================================================================
   The top bar.

   Carries three things and nothing else: which inventory is loaded, the CRQC
   horizon, and the way in (search / palette).

   The CRQC control is the reason this bar exists. Every urgency number in the
   product is a function of an assumed year for a cryptographically relevant
   quantum computer, and that year is a guess somebody made. Putting it in
   settings would let a reader mistake it for a constant. It sits here, at the
   top of every screen, adjustable, and changing it re-runs the analysis in
   front of them.
   ========================================================================= */

export function Topbar({
  view,
  onNavigate,
  onSearch,
  onPalette,
}: {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onSearch: () => void;
  onPalette: () => void;
}) {
  const { state, loadFixture, dispatch, reanalyze } = useStore();
  const { inventory, assumptions, status } = state;
  const descriptor = VIEW_BY_ID.get(view);

  const setCrqc = (year: number) => {
    const clamped = Math.min(2060, Math.max(2026, year));
    if (clamped === assumptions.crqcYear) return;
    dispatch({ type: 'assumptions', patch: { crqcYear: clamped } });
    if (state.analysis) void reanalyze();
  };

  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-rule bg-bed-0 pl-3 pr-3 md:pl-4">
      <a
        href="#/overview"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('overview');
        }}
        className="flex items-center gap-2 text-amber md:hidden"
        aria-label="SUNSET, go to overview"
      >
        <Wordmark size={18} />
      </a>

      <div className="flex min-w-0 items-center gap-2.5">
        <span className="hidden t-data text-2xs tracking-[0.18em] text-ink-faint lg:inline">
          {descriptor?.address}
        </span>
        <label htmlFor="inventory-select" className="sr-only">
          Loaded inventory
        </label>
        <select
          id="inventory-select"
          value={inventory ? (inventory.name.startsWith('SYNTHETIC') ? sampleId(inventory.name) : 'imported') : ''}
          onChange={(event) => {
            const next = event.target.value;
            if (next && next !== 'imported') void loadFixture(next);
          }}
          className="h-7 max-w-[16rem] truncate rounded-control border border-rule bg-bed-1 px-2 text-sm text-ink transition-colors duration-fast ease-out hover:border-rule-strong sm:max-w-[22rem]"
        >
          {!inventory ? <option value="">No inventory loaded</option> : null}
          {inventory && !inventory.name.startsWith('SYNTHETIC') ? (
            <option value="imported">{inventory.name}</option>
          ) : null}
          {FIXTURES.map((fixture) => (
            <option key={fixture.id} value={fixture.id}>
              {fixture.name}
            </option>
          ))}
        </select>

        {inventory ? (
          <>
            <span className="hidden t-data text-2xs text-ink-faint xl:inline">
              {inventory.version}
            </span>
            {inventory.synthetic ? (
              <span className="hidden sm:inline">
                <SyntheticMark compact />
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CrqcControl
          year={assumptions.crqcYear}
          onChange={setCrqc}
          busy={status === 'analyzing'}
        />

        <Button
          variant="quiet"
          size="sm"
          onClick={onSearch}
          className="hidden sm:inline-flex"
          aria-label="Search the inventory"
        >
          <Search size={13} strokeWidth={1.75} />
          <span className="hidden text-ink-faint lg:inline">/</span>
        </Button>

        <Button variant="default" size="sm" onClick={onPalette} aria-label="Open command palette">
          <Command size={12} strokeWidth={1.75} />
          <span className="hidden t-data text-2xs text-ink-muted sm:inline">K</span>
        </Button>
      </div>
    </header>
  );
}

/**
 * The horizon input. Labelled ASSUMED, with a tooltip that says plainly that
 * nobody knows this number, because an operator who forgets that will read the
 * whole queue as a forecast.
 */
function CrqcControl({
  year,
  onChange,
  busy,
}: {
  year: number;
  onChange: (year: number) => void;
  busy: boolean;
}) {
  return (
    <div
      className="flex h-7 items-center rounded-control border border-amber-dim bg-amber-wash"
      aria-busy={busy}
    >
      <Tooltip
        label="CRQC HORIZON — AN ASSUMPTION"
        body="The year you assume a cryptographically relevant quantum computer exists. Nobody knows this date. It is an input to every urgency score on every screen, and changing it re-runs the analysis."
      >
        <span className="cursor-help px-2 text-2xs t-data uppercase tracking-[0.1em] text-amber">
          <span className="hidden lg:inline">CRQC assumed </span>
          {year}
        </span>
      </Tooltip>
      <span className="h-full w-px bg-[color:var(--c-amber-dim)] opacity-40" aria-hidden="true" />
      <button
        type="button"
        onClick={() => onChange(year - 1)}
        disabled={year <= 2026}
        className="flex h-full w-6 items-center justify-center text-amber transition-colors duration-fast hover:bg-[color:color-mix(in_srgb,var(--c-amber)_14%,transparent)] disabled:opacity-30"
        aria-label={`Move the assumed CRQC year to ${year - 1}`}
      >
        <Minus size={11} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onChange(year + 1)}
        disabled={year >= 2060}
        className="flex h-full w-6 items-center justify-center border-l border-[color:var(--c-amber-dim)] border-opacity-40 text-amber transition-colors duration-fast hover:bg-[color:color-mix(in_srgb,var(--c-amber)_14%,transparent)] disabled:opacity-30"
        aria-label={`Move the assumed CRQC year to ${year + 1}`}
      >
        <Plus size={11} strokeWidth={2} />
      </button>
    </div>
  );
}

function sampleId(name: string): string {
  const match = FIXTURES.find((f) => f.name === name);
  return match ? match.id : 'imported';
}
