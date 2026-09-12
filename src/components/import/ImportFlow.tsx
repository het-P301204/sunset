import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Check, FileJson, Upload } from 'lucide-react';
import type { Inventory, StageId } from '@/types/domain';
import { localEngine, ParseError } from '@/adapters/engine';
import { formatBytes } from '@/engine/analyze';
import { recognize } from '@/engine/algorithms';
import { useStore } from '@/state/store';
import { FIXTURES } from '@/fixtures';
import { Button, SectionHead } from '@/components/shared/Primitives';
import { ErrorState } from '@/components/shared/States';
import type { ViewId } from '@/state/views';

/* ============================================================================
   INGEST

   Four steps, and the second one is the reason the flow exists. A CBOM is
   permissive enough that "it parsed" says almost nothing, so VALIDATE shows
   what actually came out of the document — including the fields that were
   absent — before any analysis is run. An operator should know the inventory
   is thin before they read a ranking built on it.
   ========================================================================= */

const MAX_BYTES = 24 * 1024 * 1024;

const PIPELINE: { id: StageId; label: string }[] = [
  { id: 'ingest', label: 'INGEST' },
  { id: 'parse', label: 'PARSE' },
  { id: 'classify', label: 'CLASSIFY' },
  { id: 'score', label: 'SCORE' },
  { id: 'anchor', label: 'ANCHOR' },
  { id: 'triage', label: 'TRIAGE' },
];

type Step = 'upload' | 'validate' | 'analyze' | 'ready';

export function ImportFlow({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { state, runAnalysis, loadFixture } = useStore();
  const [step, setStep] = useState<Step>('upload');
  const [staged, setStaged] = useState<Inventory | null>(null);
  const [contextCount, setContextCount] = useState<number | null>(null);
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ingest = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_BYTES) {
        setError({
          title: 'File too large',
          detail: `${formatBytes(file.size)} exceeds the ${formatBytes(MAX_BYTES)} limit. SUNSET parses the whole document in memory; split the inventory or raise the limit in the source if you need more.`,
        });
        return;
      }
      let raw: string;
      try {
        raw = await file.text();
      } catch {
        setError({ title: 'Could not read the file', detail: 'The browser refused to read it.' });
        return;
      }
      try {
        const parsed = localEngine.parse(raw, file.name);
        if (parsed.inventory) {
          setStaged(parsed.inventory);
          setContextCount(null);
          setStep('validate');
        } else if (parsed.contexts) {
          if (!state.inventory) {
            setError({
              title: 'No inventory to attach this context to',
              detail:
                'A context file supplies per-asset facts for an inventory that is already loaded. Import a CBOM or a repository scan first, then add this file.',
            });
            return;
          }
          setStaged({ ...state.inventory, contexts: parsed.contexts });
          setContextCount(parsed.contexts.length);
          setStep('validate');
        }
      } catch (err) {
        if (err instanceof ParseError) {
          setError({ title: err.message, detail: err.detail });
        } else {
          setError({
            title: 'The file could not be parsed',
            detail: err instanceof Error ? err.message : 'Unknown parser failure.',
          });
        }
      }
    },
    [state.inventory],
  );

  const analyze = useCallback(async () => {
    if (!staged) return;
    setStep('analyze');
    await runAnalysis(staged);
    setStep('ready');
  }, [staged, runAnalysis]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <StepRail step={step} />

      {error ? (
        <div className="mt-5">
          <ErrorState
            title={error.title}
            detail={error.detail}
            action={{ label: 'Choose another file', onClick: () => inputRef.current?.click() }}
          />
        </div>
      ) : null}

      {step === 'upload' ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void ingest(file);
            }}
            className={`mt-6 flex flex-col items-center justify-center border border-dashed px-6 py-14 text-center transition-colors duration-base ease-out ${
              dragging
                ? 'border-amber bg-amber-wash'
                : 'border-rule-strong bg-bed-0 hover:border-rule-strong'
            }`}
          >
            <Upload
              size={22}
              strokeWidth={1.25}
              className={dragging ? 'text-amber' : 'text-ink-faint'}
              aria-hidden="true"
            />
            <h2 className="t-section mt-4 text-ink">DROP AN INVENTORY</h2>
            <p className="mt-2 max-w-[46ch] text-sm leading-[19px] text-ink-muted">
              A CycloneDX 1.6 CBOM, a repository crypto-discovery export, or a SUNSET context
              file. The file is read in this page and never uploaded anywhere.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".json,.cdx,.cbom,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void ingest(file);
                e.target.value = '';
              }}
            />
            <Button variant="primary" className="mt-5" onClick={() => inputRef.current?.click()}>
              Choose a file
            </Button>
          </div>

          <section className="mt-6">
            <SectionHead title="OR LOAD A SAMPLE" meta="synthetic, authored for development" />
            <ul className="mt-2 divide-y divide-rule-faint border-y border-rule-faint">
              {FIXTURES.map((fixture) => (
                <li key={fixture.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void loadFixture(fixture.id);
                      onNavigate('overview');
                    }}
                    className="group flex w-full items-start gap-3 py-3 text-left transition-colors duration-fast ease-out hover:bg-bed-1"
                  >
                    <FileJson
                      size={14}
                      strokeWidth={1.5}
                      className="mt-0.5 shrink-0 text-ink-faint"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-ink">{fixture.name}</span>
                      <span className="mt-0.5 block text-xs leading-[16px] text-ink-muted">
                        {fixture.summary}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {step === 'validate' && staged ? (
        <Validation
          inventory={staged}
          contextCount={contextCount}
          onAnalyze={analyze}
          onBack={() => {
            setStaged(null);
            setStep('upload');
          }}
        />
      ) : null}

      {step === 'analyze' || step === 'ready' ? (
        <Pipeline
          stages={state.stages}
          done={step === 'ready'}
          onOpen={() => onNavigate('overview')}
        />
      ) : null}
    </div>
  );
}

function StepRail({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'UPLOAD' },
    { id: 'validate', label: 'VALIDATE' },
    { id: 'analyze', label: 'ANALYSE' },
    { id: 'ready', label: 'TRIAGE READY' },
  ];
  const index = steps.findIndex((s) => s.id === step);

  return (
    <ol className="flex items-stretch border border-rule">
      {steps.map((s, i) => (
        <li
          key={s.id}
          className={`flex flex-1 items-center gap-2 border-r border-rule px-3 py-2 last:border-r-0 ${
            i === index ? 'bg-bed-2' : ''
          }`}
        >
          <span
            className={`t-data text-2xs ${i < index ? 'text-risk-safe' : i === index ? 'text-amber' : 'text-ink-faint'}`}
          >
            {i < index ? <Check size={11} strokeWidth={2.25} /> : String(i + 1)}
          </span>
          <span
            className={`t-label text-3xs ${i <= index ? 'text-ink-dim' : 'text-ink-faint'}`}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Validation({
  inventory,
  contextCount,
  onAnalyze,
  onBack,
}: {
  inventory: Inventory;
  contextCount: number | null;
  onAnalyze: () => void;
  onBack: () => void;
}) {
  const byKind = inventory.assets.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.source.kind] = (acc[asset.source.kind] ?? 0) + 1;
    return acc;
  }, {});
  const algorithms = new Set(inventory.assets.map((a) => recognize(a.rawAlgorithm).canonical));
  const unrecognized = inventory.assets.filter((a) => recognize(a.rawAlgorithm).profile === null);
  const noPrimitive = inventory.assets.filter((a) => !a.primitive && !a.functions?.length);
  const errors = inventory.parseWarnings.filter((w) => w.severity === 'error');
  const warnings = inventory.parseWarnings.filter((w) => w.severity === 'warning');

  return (
    <div className="mt-6">
      <SectionHead
        title="WHAT CAME OUT OF THE DOCUMENT"
        meta={`${inventory.name} · ${inventory.version} · ${formatBytes(inventory.sourceBytes)}`}
      />

      <div className="mt-3 grid gap-px bg-rule-faint sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="CRYPTOGRAPHIC USES" value={inventory.assets.length} />
        <Stat label="DISTINCT ALGORITHMS" value={algorithms.size} />
        <Stat
          label="CONTEXT ENTRIES"
          value={contextCount ?? inventory.contexts.length}
          tone={
            (contextCount ?? inventory.contexts.length) === 0 ? 'var(--c-unknown)' : undefined
          }
        />
        <Stat
          label="UNRECOGNIZED"
          value={unrecognized.length}
          tone={unrecognized.length > 0 ? 'var(--c-unknown)' : undefined}
        />
      </div>

      <dl className="mt-4 divide-y divide-rule-faint border-y border-rule-faint">
        {Object.entries(byKind).map(([kind, count]) => (
          <div key={kind} className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className="t-label">{kind.replace('-', ' ')}</dt>
            <dd className="t-data text-sm text-ink-dim">{count}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="t-label">PURPOSE NOT DECLARED</dt>
          <dd
            className={`t-data text-sm ${noPrimitive.length ? 'text-risk-unknown' : 'text-ink-dim'}`}
          >
            {noPrimitive.length}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="t-label">PRODUCER</dt>
          <dd className="t-data text-sm text-ink-dim">{inventory.producer ?? 'not declared'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="t-label">GENERATED</dt>
          <dd className="t-data text-sm text-ink-dim">
            {inventory.generatedAt ? inventory.generatedAt.slice(0, 19).replace('T', ' ') : 'not declared'}
          </dd>
        </div>
      </dl>

      {(contextCount ?? inventory.contexts.length) === 0 ? (
        <p className="mt-4 border-l border-risk-unknown bg-[color:color-mix(in_srgb,var(--c-unknown)_6%,transparent)] py-2 pl-3 text-sm leading-[18px] text-ink-dim measure">
          No context file is attached. Data-secrecy lifetime and migration effort are not
          discoverable by scanning, so without them most findings will come back UNKNOWN. That is
          the correct result, not a failure — but it is worth knowing before you read the queue.
        </p>
      ) : null}

      {inventory.parseWarnings.length > 0 ? (
        <div className="mt-4">
          <h3 className="t-label mb-2">
            PARSER NOTES
            <span className="ml-2 text-ink-faint">
              {errors.length} error{errors.length === 1 ? '' : 's'}, {warnings.length} warning
              {warnings.length === 1 ? '' : 's'}
            </span>
          </h3>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto border border-rule bg-bed-0 p-3">
            {inventory.parseWarnings.slice(0, 60).map((warning, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle
                  size={11}
                  strokeWidth={1.75}
                  className={`mt-0.5 shrink-0 ${
                    warning.severity === 'error' ? 'text-risk-critical' : 'text-risk-medium'
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="t-data block text-2xs text-ink-faint">{warning.at}</span>
                  <span className="block text-xs text-ink-dim">{warning.message}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-2">
        <Button
          variant="primary"
          onClick={onAnalyze}
          disabled={inventory.assets.length === 0}
        >
          Analyse {inventory.assets.length} cryptographic uses
        </Button>
        <Button variant="quiet" onClick={onBack}>
          Choose a different file
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-bed-0 px-3 py-3">
      <div className="t-label text-3xs">{label}</div>
      <div
        className="t-data mt-1 text-2xl font-light leading-none"
        style={{ color: tone ?? 'var(--c-ink)' }}
      >
        {value}
      </div>
    </div>
  );
}

function Pipeline({
  stages,
  done,
  onOpen,
}: {
  stages: { id: StageId; label: string; detail: string; durationMs: number }[];
  done: boolean;
  onOpen: () => void;
}) {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const total = stages.reduce((sum, s) => sum + s.durationMs, 0);

  return (
    <div className="mt-6">
      <SectionHead
        title={done ? 'ANALYSIS COMPLETE' : 'ANALYSING CRYPTOGRAPHIC POSTURE'}
        meta={done ? `${total.toFixed(2)} ms, measured` : 'running in this page'}
      />

      <ol className="mt-3 divide-y divide-rule-faint border-y border-rule-faint">
        {PIPELINE.map((stage, i) => {
          const record = byId.get(stage.id);
          return (
            <li
              key={stage.id}
              className="grid grid-cols-[1.5rem_7rem_minmax(0,1fr)_4rem] items-baseline gap-3 py-2"
              style={{ animation: `rise 300ms var(--ease-out) ${i * 70}ms both` }}
            >
              <span className="pt-0.5">
                {record ? (
                  <Check size={12} strokeWidth={2.25} className="text-risk-safe" />
                ) : (
                  <span
                    className="block h-1.5 w-1.5 rounded-full bg-amber"
                    style={{ animation: 'pulse-rule 1s ease-in-out infinite' }}
                  />
                )}
              </span>
              <span className="t-label">{stage.label}</span>
              <span className="text-sm text-ink-dim">
                {record ? record.detail : 'waiting'}
              </span>
              <span className="t-data text-right text-2xs text-ink-faint">
                {record ? `${record.durationMs.toFixed(2)} ms` : ''}
              </span>
            </li>
          );
        })}
      </ol>

      {done ? (
        <div className="mt-5 flex items-center gap-3">
          <Button variant="primary" onClick={onOpen}>
            Open the migration sequence
          </Button>
          <span className="text-sm text-ink-muted">Your migration sequence is ready.</span>
        </div>
      ) : null}
    </div>
  );
}
