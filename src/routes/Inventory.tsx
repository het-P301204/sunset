import { forwardRef, useEffect, useMemo } from 'react';
import type { AnalysisResult, Finding } from '@/types/domain';
import { activeFilterCount, filterFindings, sortFindings } from '@/state/selectors';
import { useStore } from '@/state/store';
import { InventoryFilters } from '@/components/inventory/InventoryFilters';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { EmptyState } from '@/components/shared/States';

/* ============================================================================
   INVENTORY  /  200

   The explorer. Filters at the top, one dense table underneath, and a footer
   that always states how much of the current selection is UNKNOWN — because a
   filtered view is the easiest place to lose track of what the tool could not
   see.
   ========================================================================= */

export const Inventory = forwardRef<
  HTMLInputElement,
  {
    analysis: AnalysisResult;
    onSelect: (id: string) => void;
    selectedId: string | null;
    onVisibleChange: (findings: Finding[]) => void;
  }
>(function Inventory({ analysis, onSelect, selectedId, onVisibleChange }, searchRef) {
  const { state, dispatch } = useStore();
  const { filters, sort, settings } = state;

  const visible = useMemo(() => {
    const filtered = filterFindings(analysis.findings, filters);
    return sortFindings(filtered, sort);
  }, [analysis.findings, filters, sort]);

  // Keeps J/K traversal in the drawer aligned with what is actually on screen.
  useEffect(() => onVisibleChange(visible), [visible, onVisibleChange]);

  const deadlineYears = useMemo(
    () =>
      [
        ...new Set(
          analysis.findings.map((f) => f.anchor?.deadline.year).filter((y): y is number => !!y),
        ),
      ].sort((a, b) => a - b),
    [analysis.findings],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InventoryFilters
        ref={searchRef}
        filters={filters}
        onChange={(patch) => dispatch({ type: 'filters', patch })}
        onReset={() => dispatch({ type: 'filters/reset' })}
        findings={visible}
        allFindings={analysis.findings}
        deadlineYears={deadlineYears}
        density={settings.density}
        onDensity={(density) => dispatch({ type: 'settings', patch: { density } })}
        activeCount={activeFilterCount(filters)}
      />

      <div className="min-h-0 flex-1">
        {visible.length === 0 ? (
          <EmptyState
            title="NOTHING MATCHES THIS SELECTION"
            body={`${analysis.findings.length} findings are loaded, but none satisfy every active filter. Widen one of them, or clear the selection to start again.`}
            action={{ label: 'Clear filters', onClick: () => dispatch({ type: 'filters/reset' }) }}
          />
        ) : (
          <InventoryTable
            findings={visible}
            sort={sort}
            onSort={(next) => dispatch({ type: 'sort', sort: next })}
            onSelect={onSelect}
            selectedId={selectedId}
            density={settings.density}
          />
        )}
      </div>
    </div>
  );
});
