import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import type { AnalysisResult } from '@/types/domain';
import { simulate } from '@/engine/simulate';
import { useStore } from '@/state/store';
import {
  buildReport,
  download,
  reportFilename,
  REPORT_SECTIONS,
  toCSV,
  toJSON,
  type ReportSection,
} from '@/export/report';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { Button, SectionHead, Toggle } from '@/components/shared/Primitives';

/* ============================================================================
   REPORTS  /  800

   PDF is produced by the browser's own print pipeline against a dedicated
   print stylesheet, not by a bundled PDF library. That keeps the dependency
   list honest and the offline claim true, and it means the printed document is
   the same markup the operator just reviewed rather than a second template
   that can drift from it.
   ========================================================================= */

const DEFAULT_SECTIONS: ReportSection[] = [
  'executive',
  'coverage',
  'technical',
  'roadmap',
  'overrides',
];

export function Reports({ analysis }: { analysis: AnalysisResult }) {
  const { state } = useStore();
  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS);

  const simulation = useMemo(
    () => (sections.includes('simulation') ? simulate(analysis.findings, state.policy) : null),
    [sections, analysis.findings, state.policy],
  );

  const model = useMemo(
    () => buildReport(analysis, state.plan, simulation, sections),
    [analysis, state.plan, simulation, sections],
  );

  const toggle = (id: ReportSection) =>
    setSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <aside className="report-controls border-b border-rule px-4 py-5 xl:border-b-0 xl:border-r lg:px-5">
        <SectionHead title="ASSEMBLE" meta={`${sections.length} sections`} />

        <div className="mt-2 divide-y divide-rule-faint">
          {REPORT_SECTIONS.map((section) => (
            <Toggle
              key={section.id}
              label={section.label}
              description={section.summary}
              checked={sections.includes(section.id)}
              onChange={() => toggle(section.id)}
            />
          ))}
        </div>

        <div className="mt-5 border-t border-rule pt-4">
          <h3 className="t-label mb-2">EXPORT</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => window.print()}
              icon={<Printer size={13} strokeWidth={1.75} />}
            >
              Generate PDF
            </Button>
            <Button
              onClick={() =>
                download(
                  reportFilename(analysis, 'json'),
                  toJSON(analysis, state.plan),
                  'application/json',
                )
              }
            >
              JSON
            </Button>
            <Button
              onClick={() =>
                download(reportFilename(analysis, 'csv'), toCSV(analysis, state.plan), 'text/csv')
              }
            >
              CSV
            </Button>
          </div>
          <p className="mt-3 text-xs leading-[16px] text-ink-muted">
            PDF uses your browser&rsquo;s print dialogue against a print stylesheet. JSON and CSV
            carry every finding including the unscored ones, plus the analysis id and the
            assumptions, so the result can be reproduced.
          </p>
          {analysis.inventory.synthetic ? (
            <p className="mt-3 border border-risk-unknown px-2 py-1.5 text-xs leading-[16px] text-risk-unknown">
              This inventory is synthetic. Every export carries that label; it cannot be removed
              from the interface.
            </p>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 bg-bed-0 px-3 py-5 lg:px-6 lg:py-7">
        <div className="mx-auto max-w-3xl border border-rule shadow-lift">
          <ReportPreview model={model} />
        </div>
      </div>
    </div>
  );
}
