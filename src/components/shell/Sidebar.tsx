import {
  CalendarRange,
  CircleDashed,
  FileText,
  FlaskConical,
  Layers3,
  ListOrdered,
  Moon,
  Ruler,
  Settings2,
  Sun,
  Table2,
  Upload,
} from 'lucide-react';
import type { ViewId } from '@/state/views';
import { VIEWS } from '@/state/views';
import { Tooltip } from '@/components/shared/Primitives';

/* ============================================================================
   The navigation rail.

   56px, icons only, with the view's three-digit address under the tooltip. The
   active view is marked by an amber rule on the leading edge — a marker
   horizon, the same device the timeline uses for a deadline — rather than by a
   filled pill.
   ========================================================================= */

const ICONS: Record<ViewId, typeof Layers3> = {
  overview: Layers3,
  inventory: Table2,
  triage: ListOrdered,
  timeline: Ruler,
  coverage: CircleDashed,
  simulation: FlaskConical,
  plan: CalendarRange,
  reports: FileText,
  import: Upload,
  settings: Settings2,
};

export function Sidebar({
  view,
  onNavigate,
  theme,
  onToggleTheme,
  enabled,
}: {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  enabled: boolean;
}) {
  const primary = VIEWS.filter((v) => v.id !== 'settings' && v.id !== 'import');
  const secondary = VIEWS.filter((v) => v.id === 'import' || v.id === 'settings');

  return (
    <nav
      aria-label="Sections"
      className="hidden w-rail shrink-0 flex-col border-r border-rule bg-bed-0 md:flex"
    >
      <a
        href="#/overview"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('overview');
        }}
        className="flex h-topbar items-center justify-center border-b border-rule text-amber"
        aria-label="SUNSET, go to overview"
      >
        <Wordmark />
      </a>

      <ul className="flex flex-1 flex-col gap-0.5 py-2">
        {primary.map((descriptor) => (
          <RailItem
            key={descriptor.id}
            descriptor={descriptor}
            active={view === descriptor.id}
            disabled={!enabled && descriptor.requiresAnalysis}
            onNavigate={onNavigate}
          />
        ))}
      </ul>

      <ul className="flex flex-col gap-0.5 border-t border-rule py-2">
        {secondary.map((descriptor) => (
          <RailItem
            key={descriptor.id}
            descriptor={descriptor}
            active={view === descriptor.id}
            disabled={false}
            onNavigate={onNavigate}
          />
        ))}
        <li className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-control text-ink-faint transition-colors duration-fast ease-out hover:bg-bed-2 hover:text-ink-dim"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun size={15} strokeWidth={1.5} />
            ) : (
              <Moon size={15} strokeWidth={1.5} />
            )}
          </button>
        </li>
      </ul>
    </nav>
  );
}

function RailItem({
  descriptor,
  active,
  disabled,
  onNavigate,
}: {
  descriptor: (typeof VIEWS)[number];
  active: boolean;
  disabled: boolean;
  onNavigate: (view: ViewId) => void;
}) {
  const Icon = ICONS[descriptor.id];
  return (
    <li className="relative flex justify-center">
      {active ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 bg-amber"
        />
      ) : null}
      <Tooltip
        label={`${descriptor.address}  ${descriptor.label}`}
        body={`${descriptor.summary}  Shortcut: G then ${descriptor.chord.toUpperCase()}.`}
        side="bottom"
      >
        <a
          href={`#/${descriptor.id}`}
          aria-current={active ? 'page' : undefined}
          aria-disabled={disabled || undefined}
          onClick={(event) => {
            event.preventDefault();
            if (!disabled) onNavigate(descriptor.id);
          }}
          className={`flex h-9 w-9 items-center justify-center rounded-control transition-colors duration-fast ease-out ${
            active
              ? 'bg-bed-2 text-ink'
              : disabled
                ? 'cursor-not-allowed text-ink-faint opacity-40'
                : 'text-ink-muted hover:bg-bed-2 hover:text-ink-dim'
          }`}
        >
          <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">{descriptor.label}</span>
        </a>
      </Tooltip>
    </li>
  );
}

/**
 * The mark: a horizon rule crossing a column, with the sun below it. Drawn,
 * not a glyph, so it holds its weight next to the rail's icon stroke.
 */
export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="10.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 15.5h20" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 19h16M7 21.5h10" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    </svg>
  );
}
