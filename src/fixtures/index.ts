import type { Inventory } from '@/types/domain';
import { parseContext, parseCycloneDX, parseRepoScan } from '@/engine/parse';
import cbomDoc from './reference-estate.cbom.json';
import contextDoc from './reference-estate.context.json';
import repoScanDoc from './payments-gateway.scan.json';

/* ============================================================================
   SYNTHETIC FIXTURES.

   Everything in this directory was authored for development. There is no real
   estate behind it, no real scan, no real organisation, and no claim that the
   distribution resembles anyone's production environment.

   Two rules keep this honest, and both are enforced elsewhere in the code
   rather than only stated here:

     1. Every inventory built from this directory carries `synthetic: true`.
     2. The shell renders a persistent SYNTHETIC marker whenever the loaded
        inventory has that flag, and every generated report carries the same
        marker in its header. There is no way to view or export fixture output
        without the label travelling with it.

   The fixtures go through the same parser as an imported file. They are not
   pre-parsed objects, so a parser bug shows up in development instead of
   hiding behind hand-written data.
   ========================================================================= */

export interface FixtureDescriptor {
  id: string;
  name: string;
  summary: string;
  build: () => Inventory;
}

function markSynthetic(inventory: Inventory): Inventory {
  return { ...inventory, synthetic: true };
}

function referenceEstate(): Inventory {
  const raw = JSON.stringify(cbomDoc);
  const inventory = parseCycloneDX(cbomDoc, byteLength(raw), 'reference-estate');
  return markSynthetic({
    ...inventory,
    name: 'SYNTHETIC reference estate',
    contexts: parseContext(contextDoc),
  });
}

function referenceEstateNoContext(): Inventory {
  const raw = JSON.stringify(cbomDoc);
  const inventory = parseCycloneDX(cbomDoc, byteLength(raw), 'reference-estate-bare');
  return markSynthetic({
    ...inventory,
    name: 'SYNTHETIC reference estate — discovery only',
    contexts: [],
  });
}

function paymentsScan(): Inventory {
  const raw = JSON.stringify(repoScanDoc);
  const inventory = parseRepoScan(repoScanDoc, byteLength(raw), 'payments-gateway-scan');
  return markSynthetic({
    ...inventory,
    name: 'SYNTHETIC payments-gateway repository scan',
    contexts: parseContext(contextDoc),
  });
}

export const FIXTURES: FixtureDescriptor[] = [
  {
    id: 'reference-estate',
    name: 'SYNTHETIC reference estate',
    summary:
      'CycloneDX 1.6 CBOM across 20 systems, with an operator context file supplying lifetime and effort for most of them.',
    build: referenceEstate,
  },
  {
    id: 'reference-estate-bare',
    name: 'SYNTHETIC reference estate — discovery only',
    summary:
      'The same CBOM with no context file. Shows what a discovery tool alone can tell you, which is much less than it looks like.',
    build: referenceEstateNoContext,
  },
  {
    id: 'payments-scan',
    name: 'SYNTHETIC payments-gateway repository scan',
    summary:
      'A repository crypto-discovery export with call-site locations rather than a component tree.',
    build: paymentsScan,
  },
];

export function buildFixture(id: string): Inventory | null {
  const descriptor = FIXTURES.find((f) => f.id === id);
  return descriptor ? descriptor.build() : null;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
