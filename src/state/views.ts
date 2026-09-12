/* ============================================================================
   Views and their addresses.

   Every view carries a three-digit address as well as a name. The address is
   not decoration: it is typeable in the command palette, it prints in the
   status bar, and it gives the product a stable way to refer to a screen that
   does not depend on what the screen is currently called.
   ========================================================================= */

export type ViewId =
  | 'overview'
  | 'inventory'
  | 'triage'
  | 'timeline'
  | 'coverage'
  | 'simulation'
  | 'plan'
  | 'reports'
  | 'import'
  | 'settings';

export interface ViewDescriptor {
  id: ViewId;
  address: string;
  label: string;
  /** Second key of the G-chord, e.g. G then O. */
  chord: string;
  /** One line for the command palette and the empty state. */
  summary: string;
  /** False for views that are useful before an inventory is loaded. */
  requiresAnalysis: boolean;
}

export const VIEWS: ViewDescriptor[] = [
  {
    id: 'overview',
    address: '100',
    label: 'OVERVIEW',
    chord: 'o',
    summary: 'Readiness, the deadline column, and the head of the queue.',
    requiresAnalysis: true,
  },
  {
    id: 'inventory',
    address: '200',
    label: 'INVENTORY',
    chord: 'i',
    summary: 'Every cryptographic use, filterable and sortable.',
    requiresAnalysis: true,
  },
  {
    id: 'triage',
    address: '300',
    label: 'TRIAGE',
    chord: 'r',
    summary: 'The ranked migration queue, with the reason for each position.',
    requiresAnalysis: true,
  },
  {
    id: 'timeline',
    address: '400',
    label: 'TIMELINE',
    chord: 't',
    summary: 'Findings plotted against the published deadline horizons.',
    requiresAnalysis: true,
  },
  {
    id: 'coverage',
    address: '500',
    label: 'COVERAGE',
    chord: 'c',
    summary: 'What was assessed, what was not, and exactly why not.',
    requiresAnalysis: true,
  },
  {
    id: 'simulation',
    address: '600',
    label: 'SIMULATION',
    chord: 's',
    summary: 'What a policy would do to this inventory. Nothing is enforced.',
    requiresAnalysis: true,
  },
  {
    id: 'plan',
    address: '700',
    label: 'PLAN',
    chord: 'p',
    summary: 'The migration sequence, with operator overrides recorded.',
    requiresAnalysis: true,
  },
  {
    id: 'reports',
    address: '800',
    label: 'REPORTS',
    chord: 'e',
    summary: 'Assemble and export an assessment.',
    requiresAnalysis: true,
  },
  {
    id: 'import',
    address: '900',
    label: 'IMPORT',
    chord: 'm',
    summary: 'Load a CBOM, a repository scan, or a context file.',
    requiresAnalysis: false,
  },
  {
    id: 'settings',
    address: '000',
    label: 'SETTINGS',
    chord: 'g',
    summary: 'Theme, motion, and the assumptions the engine runs on.',
    requiresAnalysis: false,
  },
];

export const VIEW_BY_ID = new Map(VIEWS.map((v) => [v.id, v]));

export function viewByAddress(address: string): ViewDescriptor | undefined {
  return VIEWS.find((v) => v.address === address);
}

export function isViewId(value: string): value is ViewId {
  return VIEW_BY_ID.has(value as ViewId);
}
