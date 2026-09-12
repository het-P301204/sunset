import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { VIEWS, type ViewId } from '@/state/views';

/* ============================================================================
   Mobile navigation.

   A sheet rather than a squeezed rail. The desktop rail is icon-only because
   its tooltips work; on a touch screen they do not, so the small-screen
   version shows the address, the name and the summary, which is more useful
   than five icons nobody can identify.
   ========================================================================= */

export function MobileNav({
  view,
  onNavigate,
  enabled,
}: {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  enabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = VIEWS.find((v) => v.id === view);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 border-t border-rule bg-bed-0 px-4 text-left"
      >
        <Menu size={14} strokeWidth={1.75} className="text-ink-muted" aria-hidden="true" />
        <span className="t-data text-2xs text-ink-faint">{current?.address}</span>
        <span className="t-label text-ink-dim">{current?.label}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-palette">
          <div
            className="anim-fade absolute inset-0 bg-[color:rgba(0,0,0,0.55)]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            aria-label="Sections"
            className="anim-rise absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto border-t border-rule bg-bed-1"
          >
            <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
              <span className="t-section">SECTIONS</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="text-ink-muted"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <ul className="divide-y divide-rule-faint">
              {VIEWS.map((descriptor) => {
                const disabled = !enabled && descriptor.requiresAnalysis;
                return (
                  <li key={descriptor.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onNavigate(descriptor.id);
                        setOpen(false);
                      }}
                      aria-current={view === descriptor.id ? 'page' : undefined}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left ${
                        view === descriptor.id ? 'bg-bed-2' : ''
                      } ${disabled ? 'opacity-35' : ''}`}
                    >
                      <span className="t-data pt-0.5 text-2xs text-ink-faint">
                        {descriptor.address}
                      </span>
                      <span className="min-w-0">
                        <span className="t-label block text-ink-dim">{descriptor.label}</span>
                        <span className="mt-0.5 block text-xs leading-[16px] text-ink-muted">
                          {descriptor.summary}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
