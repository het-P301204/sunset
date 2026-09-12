import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type {
  AnalysisResult,
  Assumptions,
  FilterState,
  Inventory,
  PlanBucket,
  PlanEntry,
  PolicySpec,
  SortState,
  StageRecord,
} from '@/types/domain';
import { localEngine } from '@/adapters/engine';
import { recommendBucket } from '@/engine/rank';
import { DEFAULT_POLICY } from '@/engine/simulate';
import { buildFixture } from '@/fixtures';
import { loadPersisted, persist, type PersistedState } from './persistence';

/* ============================================================================
   Application state.

   One reducer, because almost every piece of state here is derived from one
   event: a new analysis. Splitting it across contexts would mean keeping the
   analysis, the plan and the filters in sync by hand.

   What is deliberately NOT persisted: the inventory and the analysis. A
   cryptographic inventory names internal systems and their weaknesses; it is
   exactly the document an attacker would want, and leaving it in localStorage
   would outlive the session that needed it. Settings, assumptions and operator
   overrides persist, because losing those is the annoying kind of data loss.
   ========================================================================= */

export type Status = 'empty' | 'analyzing' | 'ready' | 'error';

export interface AppError {
  title: string;
  detail: string;
  action?: { label: string; view: string };
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  reduceMotion: boolean;
  introSeen: boolean;
  density: 'analytical' | 'table' | 'compact';
  defaultView: string;
}

export interface State {
  status: Status;
  settings: Settings;
  assumptions: Assumptions;
  inventory: Inventory | null;
  analysis: AnalysisResult | null;
  stages: StageRecord[];
  error: AppError | null;
  plan: Record<string, PlanEntry>;
  selectedFindingId: string | null;
  filters: FilterState;
  sort: SortState;
  policy: PolicySpec;
  paletteOpen: boolean;
  legendOpen: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  query: '',
  threatClasses: [],
  severities: [],
  agilities: [],
  confidences: [],
  deadlineYears: [],
  sourceKinds: [],
  onlyHndl: false,
  onlyUnknown: false,
};

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  reduceMotion: false,
  introSeen: false,
  density: 'analytical',
  defaultView: 'overview',
};

function defaultAssumptions(): Assumptions {
  return {
    // 2032 is an operator assumption and the interface says so everywhere it
    // appears. It is not a prediction and it is not a constant.
    crqcYear: 2032,
    analysisDate: new Date().toISOString(),
    riskThreshold: 'low',
    unknownHandling: 'warn',
  };
}

type Action =
  | { type: 'hydrate'; persisted: PersistedState }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'assumptions'; patch: Partial<Assumptions> }
  | { type: 'analysis/start'; inventory: Inventory }
  | { type: 'analysis/stage'; stage: StageRecord }
  | { type: 'analysis/done'; analysis: AnalysisResult; plan: Record<string, PlanEntry> }
  | { type: 'analysis/error'; error: AppError }
  | { type: 'analysis/clear' }
  | { type: 'select'; id: string | null }
  | { type: 'filters'; patch: Partial<FilterState> }
  | { type: 'filters/reset' }
  | { type: 'sort'; sort: SortState }
  | { type: 'policy'; policy: PolicySpec }
  | { type: 'plan/override'; findingId: string; bucket: PlanBucket | null; reason: string }
  | { type: 'palette'; open: boolean }
  | { type: 'legend'; open: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        settings: { ...state.settings, ...action.persisted.settings },
        assumptions: {
          ...state.assumptions,
          ...action.persisted.assumptions,
          // The analysis date is always now on load; a persisted one would
          // silently anchor today's run to a stale horizon.
          analysisDate: state.assumptions.analysisDate,
        },
        plan: action.persisted.overrides ?? {},
      };

    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'assumptions':
      return { ...state, assumptions: { ...state.assumptions, ...action.patch } };

    case 'analysis/start':
      return {
        ...state,
        status: 'analyzing',
        inventory: action.inventory,
        analysis: null,
        stages: [],
        error: null,
        selectedFindingId: null,
      };

    case 'analysis/stage':
      return { ...state, stages: [...state.stages, action.stage] };

    case 'analysis/done':
      return {
        ...state,
        status: 'ready',
        analysis: action.analysis,
        stages: action.analysis.stages,
        plan: action.plan,
        error: null,
      };

    case 'analysis/error':
      return { ...state, status: 'error', error: action.error };

    case 'analysis/clear':
      return {
        ...state,
        status: 'empty',
        inventory: null,
        analysis: null,
        stages: [],
        error: null,
        selectedFindingId: null,
        filters: EMPTY_FILTERS,
      };

    case 'select':
      return { ...state, selectedFindingId: action.id };

    case 'filters':
      return { ...state, filters: { ...state.filters, ...action.patch } };

    case 'filters/reset':
      return { ...state, filters: EMPTY_FILTERS };

    case 'sort':
      return { ...state, sort: action.sort };

    case 'policy':
      return { ...state, policy: action.policy };

    case 'plan/override': {
      const existing = state.plan[action.findingId];
      if (!existing) return state;
      return {
        ...state,
        plan: {
          ...state.plan,
          [action.findingId]: {
            ...existing,
            operatorBucket: action.bucket,
            operatorReason: action.bucket ? action.reason : null,
            overriddenAt: action.bucket ? new Date().toISOString() : null,
          },
        },
      };
    }

    case 'palette':
      return { ...state, paletteOpen: action.open };

    case 'legend':
      return { ...state, legendOpen: action.open };

    default:
      return state;
  }
}

const initialState: State = {
  status: 'empty',
  settings: DEFAULT_SETTINGS,
  assumptions: defaultAssumptions(),
  inventory: null,
  analysis: null,
  stages: [],
  error: null,
  plan: {},
  selectedFindingId: null,
  filters: EMPTY_FILTERS,
  sort: { key: 'urgency', direction: 'desc' },
  policy: DEFAULT_POLICY,
  paletteOpen: false,
  legendOpen: false,
};

interface Store {
  state: State;
  dispatch: React.Dispatch<Action>;
  runAnalysis: (inventory: Inventory) => Promise<void>;
  loadFixture: (id: string) => Promise<void>;
  importFile: (raw: string, fileName: string) => Promise<void>;
  reanalyze: () => Promise<void>;
  clear: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) dispatch({ type: 'hydrate', persisted });
  }, []);

  useEffect(() => {
    persist({
      settings: state.settings,
      assumptions: {
        crqcYear: state.assumptions.crqcYear,
        riskThreshold: state.assumptions.riskThreshold,
        unknownHandling: state.assumptions.unknownHandling,
      },
      overrides: Object.fromEntries(
        Object.entries(state.plan).filter(([, entry]) => entry.operatorBucket !== null),
      ),
    });
  }, [state.settings, state.assumptions, state.plan]);

  // Theme and motion preferences live on <html> so the ground colour is right
  // before React paints anything, including during a reload.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const theme =
        state.settings.theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark'
          : state.settings.theme;
      root.setAttribute('data-theme', theme);
    };
    apply();
    if (state.settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.settings.theme]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduce-motion', state.settings.reduceMotion);
  }, [state.settings.reduceMotion]);

  const runAnalysis = useCallback(async (inventory: Inventory) => {
    dispatch({ type: 'analysis/start', inventory });
    try {
      const assumptions = {
        ...stateRef.current.assumptions,
        analysisDate: new Date().toISOString(),
      };
      const analysis = await localEngine.analyze(inventory, assumptions, (stage) =>
        dispatch({ type: 'analysis/stage', stage }),
      );
      const analysisYear = new Date(analysis.analysedAt).getUTCFullYear();
      const previous = stateRef.current.plan;
      const plan: Record<string, PlanEntry> = {};
      for (const finding of analysis.findings) {
        const engineBucket = recommendBucket(finding, analysisYear);
        const prior = previous[finding.id];
        plan[finding.id] = {
          findingId: finding.id,
          engineBucket,
          // An operator override survives a re-analysis. It is a decision
          // somebody made and recorded; the engine re-running is not a reason
          // to discard it, and the interface keeps showing both values.
          operatorBucket: prior?.operatorBucket ?? null,
          operatorReason: prior?.operatorReason ?? null,
          overriddenAt: prior?.overriddenAt ?? null,
        };
      }
      dispatch({ type: 'analysis/done', analysis, plan });
    } catch (err) {
      dispatch({
        type: 'analysis/error',
        error: {
          title: 'Analysis failed',
          detail:
            err instanceof Error
              ? err.message
              : 'The engine stopped before producing a result.',
        },
      });
    }
  }, []);

  const loadFixture = useCallback(
    async (id: string) => {
      const inventory = buildFixture(id);
      if (!inventory) {
        dispatch({
          type: 'analysis/error',
          error: { title: 'Unknown sample', detail: `No sample inventory named "${id}".` },
        });
        return;
      }
      await runAnalysis(inventory);
    },
    [runAnalysis],
  );

  const importFile = useCallback(
    async (raw: string, fileName: string) => {
      try {
        const parsed = localEngine.parse(raw, fileName);
        if (parsed.inventory) {
          await runAnalysis(parsed.inventory);
          return;
        }
        // A context file imported on its own attaches to the loaded inventory
        // rather than replacing it.
        if (parsed.contexts) {
          const current = stateRef.current.inventory;
          if (!current) {
            dispatch({
              type: 'analysis/error',
              error: {
                title: 'No inventory to attach context to',
                detail:
                  'A context file supplies per-asset facts for an inventory. Import a CBOM or repository scan first, then add the context file.',
                action: { label: 'Import inventory', view: 'import' },
              },
            });
            return;
          }
          await runAnalysis({ ...current, contexts: parsed.contexts });
        }
      } catch (err) {
        const detail =
          err && typeof err === 'object' && 'detail' in err
            ? String((err as { detail: unknown }).detail)
            : err instanceof Error
              ? err.message
              : 'The file could not be read.';
        dispatch({
          type: 'analysis/error',
          error: {
            title: err instanceof Error ? err.message : 'Import failed',
            detail,
          },
        });
      }
    },
    [runAnalysis],
  );

  const reanalyze = useCallback(async () => {
    const inventory = stateRef.current.inventory;
    if (inventory) await runAnalysis(inventory);
  }, [runAnalysis]);

  const clear = useCallback(() => dispatch({ type: 'analysis/clear' }), []);

  const value = useMemo<Store>(
    () => ({ state, dispatch, runAnalysis, loadFixture, importFile, reanalyze, clear }),
    [state, runAnalysis, loadFixture, importFile, reanalyze, clear],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

export function useAnalysis(): AnalysisResult | null {
  return useStore().state.analysis;
}
