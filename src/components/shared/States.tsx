import type { ReactNode } from 'react';
import { AlertTriangle, FileSearch } from 'lucide-react';
import { Button } from './Primitives';

/* ============================================================================
   Data states.

   A product whose subject is honest uncertainty cannot have a component that
   renders "No data found." Every state here names what is missing and what the
   operator can do about it.
   ========================================================================= */

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 text-ink-faint">
        {icon ?? <FileSearch size={22} strokeWidth={1.25} />}
      </div>
      <h3 className="t-section text-ink">{title}</h3>
      <p className="mt-2 max-w-[42ch] text-sm leading-[19px] text-ink-muted">{body}</p>
      {action ? (
        <Button variant="primary" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      role="alert"
      className="border-y border-[color:var(--c-critical)] bg-[color:color-mix(in_srgb,var(--c-critical)_7%,transparent)] px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={15}
          strokeWidth={1.75}
          className="mt-px shrink-0 text-risk-critical"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3 className="t-section text-risk-critical">{title}</h3>
          <p className="mt-1 max-w-[68ch] text-sm leading-[19px] text-ink-dim">{detail}</p>
          {action ? (
            <Button size="sm" className="mt-3" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A skeleton that matches the shape of a ruled log row, not a rounded card. */
export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-rule-faint">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-2.5">
          <div
            className="h-2 w-6 bg-bed-3"
            style={{ opacity: 0.7 - i * 0.05, animation: 'pulse-rule 1.6s ease-in-out infinite' }}
          />
          <div
            className="h-2 flex-1 bg-bed-2"
            style={{
              maxWidth: `${44 - (i % 4) * 7}%`,
              animation: 'pulse-rule 1.6s ease-in-out infinite',
              animationDelay: `${i * 70}ms`,
            }}
          />
          <div
            className="h-2 w-14 bg-bed-2"
            style={{ animation: 'pulse-rule 1.6s ease-in-out infinite', animationDelay: `${i * 90}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The persistent marker for a synthetic inventory. It travels with the data,
 * not with the screen, so there is no view in which fixture numbers can be
 * mistaken for a real result.
 */
export function SyntheticMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="This inventory ships with SUNSET for development and demonstration. It is not a real estate and these are not real results."
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border border-risk-unknown px-1.5 text-2xs t-data uppercase tracking-[0.1em] text-risk-unknown ${
        compact ? 'h-4' : 'h-5'
      }`}
    >
      <svg width="7" height="7" viewBox="0 0 7 7" aria-hidden="true">
        <rect width="7" height="7" fill="url(#hx-unknown)" />
      </svg>
      Synthetic
    </span>
  );
}
