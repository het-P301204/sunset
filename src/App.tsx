import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Finding } from '@/types/domain';
import { useStore } from '@/state/store';
import { findingById, rankedFindings } from '@/state/selectors';
import { VIEWS, isViewId, type ViewId } from '@/state/views';
import { useRoute } from '@/hooks/useRoute';
import { useKeyboard } from '@/hooks/useKeyboard';
import { HatchDefs } from '@/components/shared/Hatch';
import { ErrorState, SkeletonRows } from '@/components/shared/States';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { StatusFoot } from '@/components/shell/StatusFoot';
import { MobileNav } from '@/components/shell/MobileNav';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { Legend } from '@/components/shell/Legend';
import { IntroSequence } from '@/components/shell/IntroSequence';
import { Landing } from '@/components/shell/Landing';
import { FindingDrawer } from '@/components/inventory/FindingDrawer';
import { ImportFlow } from '@/components/import/ImportFlow';
import { Overview } from '@/routes/Overview';
import { Inventory } from '@/routes/Inventory';
import { Triage } from '@/routes/Triage';
import { Timeline } from '@/routes/Timeline';
import { Coverage } from '@/routes/Coverage';
import { Simulation } from '@/routes/Simulation';
import { Plan } from '@/routes/Plan';
import { Reports } from '@/routes/Reports';
import { Settings } from '@/routes/Settings';

/* ============================================================================
   The shell.

   Holds the frame, the routing, the keyboard grammar, and the one piece of
   cross-view state the router cannot: which list J and K traverse. The drawer
   steps through whatever the current view is showing, so triaging from a
   filtered inventory walks the filtered order and triaging from the queue
   walks the rank order.
   ========================================================================= */

export function App() {
  const { state, dispatch, loadFixture } = useStore();
  const [view, navigate] = useRoute();
  const [showIntro, setShowIntro] = useState(!state.settings.introSeen);
  const [traversal, setTraversal] = useState<Finding[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const { analysis, status, selectedFindingId } = state;
  const ready = status === 'ready' && analysis !== null;
  const selected = findingById(analysis, selectedFindingId);

  // Views that need an analysis fall back to the landing screen rather than
  // rendering an empty frame that looks broken.
  const descriptor = VIEWS.find((v) => v.id === view);
  const blocked = !ready && (descriptor?.requiresAnalysis ?? false);

  const defaultTraversal = useMemo(
    () => (analysis ? rankedFindings(analysis) : []),
    [analysis],
  );
  const list = traversal.length > 0 ? traversal : defaultTraversal;
  const selectedIndex = selected ? list.findIndex((f) => f.id === selected.id) : -1;

  const select = useCallback(
    (id: string | null) => dispatch({ type: 'select', id }),
    [dispatch],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      if (list.length === 0) return;
      if (selectedIndex === -1) {
        select(list[0]!.id);
        return;
      }
      const next = list[selectedIndex + direction];
      if (next) select(next.id);
    },
    [list, selectedIndex, select],
  );

  useKeyboard({
    onPalette: () => dispatch({ type: 'palette', open: !state.paletteOpen }),
    onSearch: () => {
      if (view !== 'inventory') navigate('inventory');
      window.setTimeout(() => searchRef.current?.focus(), 40);
    },
    onEscape: () => {
      if (state.paletteOpen) dispatch({ type: 'palette', open: false });
      else if (state.legendOpen) dispatch({ type: 'legend', open: false });
      else if (selectedFindingId) select(null);
    },
    onLegend: () => dispatch({ type: 'legend', open: !state.legendOpen }),
    onChord: (key) => {
      const target = VIEWS.find((v) => v.chord === key);
      if (target && !(!ready && target.requiresAnalysis)) navigate(target.id);
    },
    onNext: () => selectedFindingId && step(1),
    onPrevious: () => selectedFindingId && step(-1),
  });

  // Fresh route, fresh scroll. Without this, moving from a scrolled inventory
  // to the overview lands halfway down it.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    setTraversal([]);
  }, [view]);

  const theme =
    state.settings.theme === 'system'
      ? (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ?? 'dark'
      : state.settings.theme;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-ground">
      <HatchDefs />

      {showIntro ? (
        <IntroSequence
          onDone={() => {
            setShowIntro(false);
            dispatch({ type: 'settings', patch: { introSeen: true } });
          }}
        />
      ) : null}

      <a
        href="#sunset-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-toast focus:rounded-control focus:border focus:border-amber focus:bg-bed-2 focus:px-3 focus:py-1.5 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>

      <Topbar
        view={view}
        onNavigate={navigate}
        onSearch={() => {
          if (view !== 'inventory') navigate('inventory');
          window.setTimeout(() => searchRef.current?.focus(), 40);
        }}
        onPalette={() => dispatch({ type: 'palette', open: true })}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          view={view}
          onNavigate={navigate}
          theme={theme}
          enabled={ready}
          onToggleTheme={() =>
            dispatch({
              type: 'settings',
              patch: { theme: theme === 'dark' ? 'light' : 'dark' },
            })
          }
        />

        <main
          id="sunset-main"
          ref={mainRef}
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-y-auto outline-none"
        >
          {state.error ? (
            <ErrorState
              title={state.error.title}
              detail={state.error.detail}
              action={
                state.error.action
                  ? {
                      label: state.error.action.label,
                      onClick: () => {
                        const target = state.error!.action!.view;
                        if (isViewId(target)) navigate(target);
                      },
                    }
                  : undefined
              }
            />
          ) : null}

          {status === 'analyzing' && view !== 'import' ? (
            <div className="px-4 py-6 lg:px-6">
              <p className="t-label mb-3">ANALYSING CRYPTOGRAPHIC POSTURE</p>
              <SkeletonRows rows={10} />
            </div>
          ) : view === 'import' ? (
            <ImportFlow onNavigate={navigate} />
          ) : view === 'settings' ? (
            <Settings />
          ) : blocked ? (
            <Landing
              onNavigate={navigate}
              onLoadFixture={(id) => {
                void loadFixture(id);
                navigate('overview');
              }}
            />
          ) : ready && analysis ? (
            <Routed
              view={view}
              analysisReady={ready}
              onSelect={select}
              onNavigate={navigate}
              selectedId={selectedFindingId}
              onTraversal={setTraversal}
              searchRef={searchRef}
              analysis={analysis}
            />
          ) : (
            <Landing
              onNavigate={navigate}
              onLoadFixture={(id) => {
                void loadFixture(id);
                navigate('overview');
              }}
            />
          )}
        </main>
      </div>

      <MobileNav view={view} onNavigate={navigate} enabled={ready} />
      <StatusFoot onNavigate={navigate} />

      <FindingDrawer
        finding={selected}
        onClose={() => select(null)}
        onNavigate={step}
        siblingCount={list.length}
        siblingIndex={selectedIndex}
      />

      <CommandPalette
        open={state.paletteOpen}
        onClose={() => dispatch({ type: 'palette', open: false })}
        onNavigate={navigate}
      />

      <Legend open={state.legendOpen} onClose={() => dispatch({ type: 'legend', open: false })} />
    </div>
  );
}

function Routed({
  view,
  analysis,
  onSelect,
  onNavigate,
  selectedId,
  onTraversal,
  searchRef,
}: {
  view: ViewId;
  analysis: NonNullable<ReturnType<typeof useStore>['state']['analysis']>;
  analysisReady: boolean;
  onSelect: (id: string) => void;
  onNavigate: (view: ViewId) => void;
  selectedId: string | null;
  onTraversal: (findings: Finding[]) => void;
  searchRef: React.RefObject<HTMLInputElement>;
}) {
  switch (view) {
    case 'overview':
      return (
        <Overview
          analysis={analysis}
          onSelect={onSelect}
          onNavigate={onNavigate}
          selectedId={selectedId}
        />
      );
    case 'inventory':
      return (
        <Inventory
          ref={searchRef}
          analysis={analysis}
          onSelect={onSelect}
          selectedId={selectedId}
          onVisibleChange={onTraversal}
        />
      );
    case 'triage':
      return (
        <Triage
          analysis={analysis}
          onSelect={onSelect}
          selectedId={selectedId}
          onVisibleChange={onTraversal}
        />
      );
    case 'timeline':
      return <Timeline analysis={analysis} onSelect={onSelect} selectedId={selectedId} />;
    case 'coverage':
      return <Coverage analysis={analysis} onNavigate={onNavigate} />;
    case 'simulation':
      return <Simulation analysis={analysis} onSelect={onSelect} />;
    case 'plan':
      return <Plan analysis={analysis} onSelect={onSelect} />;
    case 'reports':
      return <Reports analysis={analysis} />;
    default:
      return null;
  }
}
