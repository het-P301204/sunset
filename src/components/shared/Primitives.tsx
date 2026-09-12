import {
  forwardRef,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import type { Severity } from '@/types/domain';
import { SEVERITY_LABEL, SEVERITY_VAR, SeverityMark } from './Hatch';

/* ============================================================================
   Controls.

   Small radius, hairline borders, no fills that compete with the analytical
   surfaces. Everything here is keyboard-operable and carries a visible focus
   ring from the one global rule in base.css.
   ========================================================================= */

type ButtonVariant = 'primary' | 'default' | 'quiet' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // Amber is the deadline signal, so it is also the primary action: the thing
  // that moves you toward the deadline. It appears at most once per view.
  primary:
    'bg-amber text-[color:var(--c-amber-ink)] border-amber hover:bg-[color:var(--c-amber)] hover:brightness-110 font-medium',
  default:
    'bg-bed-2 text-ink border-rule hover:bg-bed-3 hover:border-rule-strong',
  quiet:
    'bg-transparent text-ink-dim border-transparent hover:text-ink hover:bg-bed-2',
  danger:
    'bg-transparent text-risk-critical border-[color:var(--c-critical)] hover:bg-[color:color-mix(in_srgb,var(--c-critical)_12%,transparent)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', icon, className = '', children, ...rest },
  ref,
) {
  const height = size === 'sm' ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm';
  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-control border transition-colors duration-fast ease-out disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap ${height} ${BUTTON_VARIANT[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, mono, className = '', id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={inputId} className="t-label">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-describedby={hintId}
        className={`h-8 rounded-control border border-rule bg-bed-0 px-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-fast ease-out hover:border-rule-strong focus:border-amber-dim ${mono ? 't-data' : ''} ${className}`}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, className = '', id, children, ...rest },
  ref,
) {
  const generated = useId();
  const selectId = id ?? generated;
  const hintId = hint ? `${selectId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={selectId} className="t-label">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-describedby={hintId}
          className={`h-8 w-full appearance-none rounded-control border border-rule bg-bed-0 pl-2 pr-7 text-sm text-ink transition-colors duration-fast ease-out hover:border-rule-strong focus:border-amber-dim ${className}`}
          {...rest}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted"
          width="9"
          height="6"
          viewBox="0 0 9 6"
          aria-hidden="true"
        >
          <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  id?: string;
}) {
  const generated = useId();
  const toggleId = id ?? generated;
  const descId = description ? `${toggleId}-desc` : undefined;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <label htmlFor={toggleId} className="block text-md text-ink">
          {label}
        </label>
        {description ? (
          <p id={descId} className="mt-0.5 text-sm text-ink-muted measure">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descId}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-fast ease-out ${
          checked ? 'border-amber-dim bg-amber-wash' : 'border-rule bg-bed-2'
        }`}
      >
        <span
          className={`absolute top-[3px] h-3 w-3 rounded-full transition-all duration-base ease-out ${
            checked ? 'left-[19px] bg-amber' : 'left-[3px] bg-ink-muted'
          }`}
        />
        <span className="sr-only">{checked ? 'on' : 'off'}</span>
      </button>
    </div>
  );
}

/* --- badges --------------------------------------------------------------- */

export function SeverityBadge({
  severity,
  size = 'md',
}: {
  severity: Severity;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${
        size === 'sm' ? 'text-2xs' : 'text-xs'
      } t-data uppercase tracking-[0.1em]`}
      style={{ color: SEVERITY_VAR[severity] }}
    >
      <SeverityMark severity={severity} size={size === 'sm' ? 8 : 10} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function Chip({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'amber' | 'muted';
  title?: string;
}) {
  const tones = {
    neutral: 'border-rule text-ink-dim',
    amber: 'border-amber-dim text-amber',
    muted: 'border-rule-faint text-ink-muted',
  };
  return (
    <span
      title={title}
      className={`inline-flex h-5 items-center rounded-control border px-1.5 text-2xs t-data uppercase tracking-[0.08em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* --- tooltip -------------------------------------------------------------- */

/**
 * Hover and focus both open it, Escape closes it, and the content is wired
 * with aria-describedby rather than a title attribute — a title is invisible
 * to a keyboard user and unreadable on touch.
 */
export function Tooltip({
  label,
  body,
  children,
  side = 'top',
}: {
  label: string;
  body?: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined} tabIndex={0} className="outline-none">
        {children}
      </span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={`anim-fade pointer-events-none absolute left-1/2 z-toast w-64 -translate-x-1/2 rounded-panel border border-rule bg-bed-2 p-2.5 shadow-pop ${
            side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
          }`}
        >
          <span className="block t-label text-ink">{label}</span>
          {body ? (
            <span className="mt-1 block text-sm leading-[17px] text-ink-dim">{body}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

/* --- structural ----------------------------------------------------------- */

/** A ruled section head. No eyebrow, no card: a rule and a name. */
export function SectionHead({
  title,
  meta,
  actions,
  id,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
      <div className="flex items-baseline gap-3 min-w-0">
        <h2 id={id} className="t-section shrink-0">
          {title}
        </h2>
        {meta ? <div className="min-w-0 truncate text-xs text-ink-muted">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

/** A labelled value pair, the log-sheet row this interface is built from. */
export function Field({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  tone?: 'default' | 'muted' | 'unknown';
}) {
  const toneClass =
    tone === 'unknown' ? 'text-risk-unknown' : tone === 'muted' ? 'text-ink-muted' : 'text-ink';
  return (
    <div className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-4 gap-y-0.5 border-b border-rule-faint py-1.5 last:border-b-0 sm:grid-cols-[minmax(0,13rem)_1fr]">
      <dt className="t-label pt-0.5">{label}</dt>
      <dd className={`text-sm ${mono ? 't-data' : ''} ${toneClass}`}>{value}</dd>
    </div>
  );
}

export function ValueOrUnknown({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null) {
    return <span className="text-risk-unknown">not supplied</span>;
  }
  return (
    <span>
      {value}
      {suffix ? <span className="text-ink-muted">{suffix}</span> : null}
    </span>
  );
}
