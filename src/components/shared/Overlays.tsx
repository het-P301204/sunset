import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useKeyboard';
import { Button } from './Primitives';

/* ============================================================================
   Drawer and modal.

   Both are real dialogs: role, label, focus trap, Escape, restored focus, and
   an inert backdrop. The drawer is the one used for findings, because it keeps
   the queue visible behind it — the operator's position in a ranked list is
   information, and a modal that covers it costs them that position.
   ========================================================================= */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-[min(46rem,92vw)]',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-drawer">
      <div
        className="anim-fade absolute inset-0 bg-[color:rgba(0,0,0,0.45)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Finding detail'}
        tabIndex={-1}
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-rule bg-ground shadow-drawer ${width}`}
        style={{ animation: 'drawer-in var(--dur-base) var(--ease-out) both' }}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-rule px-5 py-3">
          <div className="min-w-0">
            <div className="text-lg text-ink">{title}</div>
            {subtitle ? <div className="mt-0.5 text-sm text-ink-muted">{subtitle}</div> : null}
          </div>
          <Button variant="quiet" size="sm" onClick={onClose} aria-label="Close panel">
            <X size={14} strokeWidth={1.75} />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-rule bg-bed-0 px-5 py-3">{footer}</footer>
        ) : null}
      </div>
      <style>{`@keyframes drawer-in{from{transform:translateX(12px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>,
    document.body,
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-start justify-center p-4 pt-[12vh]">
      <div
        className="anim-fade absolute inset-0 bg-[color:rgba(0,0,0,0.5)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`anim-rise relative w-full rounded-panel border border-rule bg-bed-1 shadow-pop ${width}`}
      >
        <header className="flex items-center justify-between border-b border-rule px-4 py-2.5">
          <h2 className="t-section">{title}</h2>
          <Button variant="quiet" size="sm" onClick={onClose} aria-label="Close dialog">
            <X size={14} strokeWidth={1.75} />
          </Button>
        </header>
        <div className="px-4 py-3">{children}</div>
        {footer ? (
          <footer className="border-t border-rule bg-bed-0 px-4 py-2.5">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  return (
    <div role="tablist" aria-label={label} className="flex items-end gap-0 border-b border-rule">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              const index = tabs.findIndex((t) => t.id === value);
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                const next =
                  event.key === 'ArrowRight'
                    ? tabs[(index + 1) % tabs.length]!
                    : tabs[(index - 1 + tabs.length) % tabs.length]!;
                onChange(next.id);
                refs.current[next.id]?.focus();
              }
            }}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2 pt-1 text-xs uppercase tracking-[0.1em] transition-colors duration-fast ease-out ${
              selected
                ? 'border-amber text-ink'
                : 'border-transparent text-ink-muted hover:text-ink-dim'
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="t-data text-2xs text-ink-faint">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
