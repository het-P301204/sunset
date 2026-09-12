import type { Severity, UnknownHandling } from '@/types/domain';
import { SEVERITY_ORDER } from '@/types/domain';
import { localEngine } from '@/adapters/engine';
import { useStore } from '@/state/store';
import { clearPersisted } from '@/state/persistence';
import { VIEWS } from '@/state/views';
import { SEVERITY_LABEL } from '@/components/shared/Hatch';
import { Button, Input, SectionHead, Select, Toggle } from '@/components/shared/Primitives';

/* ============================================================================
   SETTINGS  /  000

   The assumptions block is the reason this screen is not an afterthought. The
   CRQC horizon in particular is presented as what it is — a number the
   operator chose, which every score in the product depends on — and never as a
   constant the tool knows.
   ========================================================================= */

export function Settings() {
  const { state, dispatch, reanalyze, clear } = useStore();
  const { settings, assumptions, analysis } = state;

  const setAssumption = (patch: Partial<typeof assumptions>) => {
    dispatch({ type: 'assumptions', patch });
    if (analysis) void reanalyze();
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <section>
        <SectionHead title="ANALYSIS ASSUMPTIONS" meta="inputs, not constants" />
        <p className="mt-3 text-sm leading-[19px] text-ink-muted measure">
          Changing anything here re-runs the engine over the loaded inventory. The results are
          deterministic: the same inventory with the same assumptions produces the same ranking,
          every time.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            type="number"
            label="CRQC horizon (assumed year)"
            min={2026}
            max={2060}
            mono
            value={assumptions.crqcYear}
            onChange={(e) => {
              const year = Number(e.target.value);
              if (year >= 2026 && year <= 2060) setAssumption({ crqcYear: year });
            }}
            hint="The year you assume a cryptographically relevant quantum computer exists. Nobody knows this date. It is the denominator of every urgency score in this product, and it appears in the top bar of every screen for that reason."
          />

          <Select
            label="Default risk threshold"
            value={assumptions.riskThreshold}
            onChange={(e) => setAssumption({ riskThreshold: e.target.value as Severity })}
            hint="Findings below this severity are de-emphasised in the default queue. Nothing is hidden."
          >
            {SEVERITY_ORDER.filter((s) => s !== 'unknown').map((severity) => (
              <option key={severity} value={severity}>
                {SEVERITY_LABEL[severity]}
              </option>
            ))}
          </Select>

          <Select
            label="Unknown handling"
            value={assumptions.unknownHandling}
            onChange={(e) => setAssumption({ unknownHandling: e.target.value as UnknownHandling })}
            hint="The default a new policy simulation starts from. Unscored findings are never hidden from the inventory whatever this is set to."
          >
            <option value="block">Block</option>
            <option value="warn">Warn</option>
            <option value="allow">Allow, counted separately</option>
          </Select>

          <Select
            label="Default view"
            value={settings.defaultView}
            onChange={(e) => dispatch({ type: 'settings', patch: { defaultView: e.target.value } })}
          >
            {VIEWS.filter((v) => v.requiresAnalysis).map((view) => (
              <option key={view.id} value={view.id}>
                {view.address} {view.label}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section className="mt-8">
        <SectionHead title="INTERFACE" />
        <div className="mt-2 divide-y divide-rule-faint">
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <span className="block text-md text-ink">Theme</span>
              <span className="mt-0.5 block text-sm text-ink-muted">
                Dark is the default because this is read on a workstation for long stretches. The
                light theme is a separate design on warm paper, not an inversion.
              </span>
            </div>
            <Select
              value={settings.theme}
              onChange={(e) =>
                dispatch({
                  type: 'settings',
                  patch: { theme: e.target.value as typeof settings.theme },
                })
              }
              className="w-28"
              aria-label="Theme"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </Select>
          </div>

          <Toggle
            label="Reduce motion"
            description="Collapses every transition and entrance to an instant state change. Your operating system preference is honoured independently of this switch."
            checked={settings.reduceMotion}
            onChange={(reduceMotion) => dispatch({ type: 'settings', patch: { reduceMotion } })}
          />

          <Toggle
            label="Skip the entry sequence"
            description="The 1.4-second column draw shown when the application opens."
            checked={settings.introSeen}
            onChange={(introSeen) => dispatch({ type: 'settings', patch: { introSeen } })}
          />

          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <span className="block text-md text-ink">Default inventory density</span>
              <span className="mt-0.5 block text-sm text-ink-muted">
                Row height and column set in the inventory explorer.
              </span>
            </div>
            <Select
              value={settings.density}
              onChange={(e) =>
                dispatch({
                  type: 'settings',
                  patch: { density: e.target.value as typeof settings.density },
                })
              }
              className="w-32"
              aria-label="Density"
            >
              <option value="analytical">Analytical</option>
              <option value="table">Table</option>
              <option value="compact">Compact</option>
            </Select>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionHead title="ABOUT" />
        <dl className="mt-2 divide-y divide-rule-faint border-y border-rule-faint">
          {[
            ['ENGINE', `${localEngine.id} ${localEngine.version}`],
            ['EXECUTION', 'in this browser page'],
            ['NETWORK', 'no request is made at any point'],
            ['CREDENTIALS', 'none required'],
            ['DETERMINISM', 'identical inputs produce identical output'],
            ['STORAGE', 'settings and overrides only; no inventory is persisted'],
            ['ANALYSIS ID', analysis?.id ?? 'no analysis loaded'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="t-label">{label}</dt>
              <dd className="t-data text-sm text-ink-dim">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm leading-[19px] text-ink-muted measure">
          SUNSET implements no cryptography. It reads an inventory someone else produced, applies
          published deadlines and Mosca&rsquo;s inequality, and reports what it could and could not
          determine. Deadlines cite EO 14412 and NIST IR 8547 as published; nothing is extrapolated
          from them.
        </p>
      </section>

      <section className="mt-8">
        <SectionHead title="DATA" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={clear} disabled={!analysis}>
            Unload inventory
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              clearPersisted();
              window.location.reload();
            }}
          >
            Clear stored settings and overrides
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-muted measure">
          Unloading removes the inventory and its analysis from memory. Clearing storage also
          discards every recorded operator override; that cannot be undone.
        </p>
      </section>
    </div>
  );
}
