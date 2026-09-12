import type { CoverageState, Severity } from '@/types/domain';

/* ============================================================================
   Hatch fills.

   Severity is encoded by pattern first and colour second. This is not
   decoration borrowed from a geological log — it is the reason the log uses
   it. A stratigraphic column has to survive photocopying, so lithology is
   carried by hatch and colour is the second channel. The same discipline gives
   SUNSET a severity encoding that survives a grayscale print, a projector, and
   a reader with deuteranopia, without needing a parallel "accessible mode".

   Density is ordinal: CRITICAL is the densest ruling, SAFE the sparsest, and
   UNKNOWN is the only pattern that runs the other way — a widely spaced
   counter-diagonal, borrowed from the NO RECOVERY interval on a core log,
   which is drawn precisely so nobody mistakes it for material that was there.
   ========================================================================= */

export const SEVERITY_VAR: Record<Severity, string> = {
  critical: 'var(--c-critical)',
  high: 'var(--c-high)',
  medium: 'var(--c-medium)',
  low: 'var(--c-low)',
  safe: 'var(--c-safe)',
  unknown: 'var(--c-unknown)',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  safe: 'SAFE',
  unknown: 'UNKNOWN',
};

export function hatchId(severity: Severity): string {
  return `hx-${severity}`;
}

export function hatchFill(severity: Severity): string {
  return `url(#${hatchId(severity)})`;
}

export function coverageHatchFill(state: CoverageState): string {
  if (state === 'assessed') return 'url(#hx-assessed)';
  if (state === 'partial') return 'url(#hx-partial)';
  return 'url(#hx-unknown)';
}

/**
 * Mounted once, at the root. Every hatch in the application references these
 * by id, so there is exactly one definition of what CRITICAL looks like.
 */
export function HatchDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <defs>
        <pattern
          id="hx-critical"
          width="3"
          height="3"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="3" height="3" fill="var(--c-critical)" opacity="0.14" />
          <line x1="0" y1="0" x2="0" y2="3" stroke="var(--c-critical)" strokeWidth="1.4" />
        </pattern>

        <pattern
          id="hx-high"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="5" height="5" fill="var(--c-high)" opacity="0.1" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--c-high)" strokeWidth="1.2" />
        </pattern>

        <pattern id="hx-medium" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="var(--c-medium)" opacity="0.08" />
          <line x1="0" y1="0.5" x2="4" y2="0.5" stroke="var(--c-medium)" strokeWidth="1" />
        </pattern>

        <pattern id="hx-low" width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill="var(--c-low)" opacity="0.07" />
          <circle cx="1.2" cy="1.2" r="0.85" fill="var(--c-low)" />
        </pattern>

        <pattern id="hx-safe" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.7" fill="var(--c-safe)" />
          <circle cx="5.5" cy="5.5" r="0.7" fill="var(--c-safe)" />
        </pattern>

        {/* NO RECOVERY. Sparse, counter-diagonal, never mistakable for a bed. */}
        <pattern
          id="hx-unknown"
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <line x1="0" y1="0" x2="0" y2="9" stroke="var(--c-unknown)" strokeWidth="1" />
        </pattern>

        <pattern
          id="hx-assessed"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="4" height="4" fill="var(--c-ink-dim)" opacity="0.1" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--c-ink-dim)" strokeWidth="1.1" />
        </pattern>

        <pattern id="hx-partial" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="0.9" fill="var(--c-ink-muted)" />
          <circle cx="4.4" cy="4.4" r="0.9" fill="var(--c-ink-muted)" />
        </pattern>

        {/* The amber marker-horizon rule, used on the timeline and the column. */}
        <pattern
          id="hx-marker"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--c-amber)" strokeWidth="1.6" />
        </pattern>
      </defs>
    </svg>
  );
}

/**
 * The inline key.
 *
 * Five hatch patterns exist so that severity survives a grayscale print and a
 * reader who cannot separate red from orange. That only works if the reader is
 * told what the patterns mean, and a key that lives behind a keyboard shortcut
 * is a key most readers never open. This one sits on the surface the patterns
 * are used on.
 */
export function HatchKey({ className = '' }: { className?: string }) {
  const order: Severity[] = ['critical', 'high', 'medium', 'low', 'safe', 'unknown'];
  return (
    <ul
      className={`hidden flex-wrap items-center gap-x-3 gap-y-1 xl:flex ${className}`}
      aria-label="Severity key"
    >
      {order.map((severity) => (
        <li key={severity} className="flex items-center gap-1.5">
          <SeverityMark severity={severity} size={9} />
          <span
            className="t-data text-3xs uppercase tracking-[0.08em]"
            style={{ color: SEVERITY_VAR[severity] }}
          >
            {SEVERITY_LABEL[severity]}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A small filled square carrying a severity's pattern. Used wherever a label
 * needs its own mark rather than relying on the text colour.
 */
export function SeverityMark({
  severity,
  size = 10,
  className = '',
}: {
  severity: Severity;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <rect
        x="0.5"
        y="0.5"
        width={size - 1}
        height={size - 1}
        fill={hatchFill(severity)}
        stroke={SEVERITY_VAR[severity]}
        strokeWidth="1"
      />
    </svg>
  );
}
