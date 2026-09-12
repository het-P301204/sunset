import type { PlanEntry, Severity, UnknownHandling } from '@/types/domain';
import type { Settings } from './store';

/* ============================================================================
   Persistence.

   Settings, operator assumptions, and operator overrides only. The inventory
   and the analysis never touch storage: a cryptographic inventory is a list of
   an organisation's weakest points, and there is no reason for it to outlive
   the tab that analysed it.

   Everything read back is validated. A hand-edited or corrupted storage entry
   must not be able to put an out-of-range CRQC year or an unknown theme into
   the running app.
   ========================================================================= */

const KEY = 'sunset.settings';

export interface PersistedState {
  settings: Partial<Settings>;
  assumptions: {
    crqcYear?: number;
    riskThreshold?: Severity;
    unknownHandling?: UnknownHandling;
  };
  overrides: Record<string, PlanEntry>;
}

const THEMES = new Set(['dark', 'light', 'system']);
const DENSITIES = new Set(['analytical', 'table', 'compact']);
const SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'safe', 'unknown']);
const HANDLING = new Set(['block', 'warn', 'allow']);
const BUCKETS = new Set(['now', '2027', '2028', '2029', '2030', '2031+', 'review']);

export function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as Record<string, unknown>;

    const settingsIn = (doc.settings ?? {}) as Record<string, unknown>;
    const settings: Partial<Settings> = {};
    if (typeof settingsIn.theme === 'string' && THEMES.has(settingsIn.theme)) {
      settings.theme = settingsIn.theme as Settings['theme'];
    }
    if (typeof settingsIn.reduceMotion === 'boolean') {
      settings.reduceMotion = settingsIn.reduceMotion;
    }
    if (typeof settingsIn.introSeen === 'boolean') settings.introSeen = settingsIn.introSeen;
    if (typeof settingsIn.density === 'string' && DENSITIES.has(settingsIn.density)) {
      settings.density = settingsIn.density as Settings['density'];
    }
    if (typeof settingsIn.defaultView === 'string' && settingsIn.defaultView.length < 32) {
      settings.defaultView = settingsIn.defaultView;
    }

    const assumptionsIn = (doc.assumptions ?? {}) as Record<string, unknown>;
    const assumptions: PersistedState['assumptions'] = {};
    if (
      typeof assumptionsIn.crqcYear === 'number' &&
      assumptionsIn.crqcYear >= 2026 &&
      assumptionsIn.crqcYear <= 2060
    ) {
      assumptions.crqcYear = Math.round(assumptionsIn.crqcYear);
    }
    if (
      typeof assumptionsIn.riskThreshold === 'string' &&
      SEVERITIES.has(assumptionsIn.riskThreshold)
    ) {
      assumptions.riskThreshold = assumptionsIn.riskThreshold as Severity;
    }
    if (
      typeof assumptionsIn.unknownHandling === 'string' &&
      HANDLING.has(assumptionsIn.unknownHandling)
    ) {
      assumptions.unknownHandling = assumptionsIn.unknownHandling as UnknownHandling;
    }

    const overridesIn = (doc.overrides ?? {}) as Record<string, unknown>;
    const overrides: Record<string, PlanEntry> = {};
    for (const [id, value] of Object.entries(overridesIn)) {
      if (id === '__proto__' || !value || typeof value !== 'object') continue;
      const entry = value as Record<string, unknown>;
      if (typeof entry.operatorBucket !== 'string' || !BUCKETS.has(entry.operatorBucket)) continue;
      overrides[id] = {
        findingId: id,
        engineBucket: (BUCKETS.has(String(entry.engineBucket))
          ? entry.engineBucket
          : 'review') as PlanEntry['engineBucket'],
        operatorBucket: entry.operatorBucket as PlanEntry['operatorBucket'],
        operatorReason:
          typeof entry.operatorReason === 'string' ? entry.operatorReason.slice(0, 300) : null,
        overriddenAt: typeof entry.overriddenAt === 'string' ? entry.overriddenAt : null,
      };
    }

    return { settings, assumptions, overrides };
  } catch {
    // A corrupt entry is not worth an error state; the defaults are fine.
    return null;
  }
}

export function persist(value: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Private browsing, a full quota, or storage disabled by policy. The app
    // works without persistence; failing loudly here would be worse.
  }
}

export function clearPersisted(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
