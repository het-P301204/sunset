import type {
  AnalysisResult,
  Assumptions,
  Finding,
  Inventory,
  PolicySpec,
  SimulationResult,
  StageRecord,
} from '@/types/domain';
import { analyze, ENGINE_VERSION } from '@/engine/analyze';
import { parseDocument, type ParsedDocument } from '@/engine/parse';
import { simulate } from '@/engine/simulate';

/* ============================================================================
   The engine boundary.

   Components never import from src/engine/**. They call this adapter, whose
   surface is deliberately async even though the local implementation is
   synchronous — so that replacing it with a worker, a WASM build, or a service
   call is a one-file change and not a component rewrite.

   `localEngine` is the real engine running in the page. It is not a mock and
   there is no mock: the numbers the interface shows are computed from whatever
   inventory is loaded. What is synthetic is the fixture inventories, and they
   are labelled at the source.
   ========================================================================= */

export interface EngineAdapter {
  readonly id: string;
  readonly version: string;
  readonly location: 'in-browser' | 'remote';
  parse(raw: string, fileName: string): ParsedDocument;
  analyze(
    inventory: Inventory,
    assumptions: Assumptions,
    onStage?: (stage: StageRecord) => void,
  ): Promise<AnalysisResult>;
  simulate(findings: Finding[], policy: PolicySpec): Promise<SimulationResult>;
}

export const localEngine: EngineAdapter = {
  id: 'sunset-local',
  version: ENGINE_VERSION,
  location: 'in-browser',

  parse(raw, fileName) {
    return parseDocument(raw, fileName);
  },

  async analyze(inventory, assumptions, onStage) {
    // Yield once before the work so the caller can paint its loading state.
    // Everything after this point is a single synchronous pass; splitting it
    // across frames would make the run non-deterministic for no benefit.
    await nextFrame();
    return analyze(inventory, assumptions, onStage);
  },

  async simulate(findings, policy) {
    await nextFrame();
    return simulate(findings, policy);
  },
};

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export type { ParsedDocument };
export { ParseError } from '@/engine/parse';
