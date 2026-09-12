/* ============================================================================
   Imported inventories are untrusted input.

   A CBOM is a JSON document produced by a scanner someone else ran against a
   codebase someone else wrote. Strings inside it reach the DOM, filenames
   reach the evidence panel, and keys reach object literals. Everything that
   crosses that boundary comes through this module first.

   React escapes text nodes, so this is not the only defence — but the app
   never uses dangerouslySetInnerHTML, and these functions also stop the
   quieter problems: control characters that break table layout, megabyte
   strings that freeze the renderer, prototype keys that poison lookups, and
   absolute local paths that leak a developer's directory structure into a
   report someone emails out.
   ========================================================================= */

const MAX_TEXT = 400;
const MAX_LOCATOR = 200;
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * C0 and C1 control characters plus the zero-width and bidi-override range.
 * The bidi codepoints matter here: a right-to-left override inside a filename
 * can make a rendered path read as something it is not, which is a real trick
 * and not a theoretical one. Built through the RegExp constructor so the
 * escapes survive any source transform.
 */
const CONTROL_CHARS = new RegExp(
  '[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029]',
  'g',
);

/** Strip control characters, collapse whitespace, and cap length. */
export function text(value: unknown, max = MAX_TEXT): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

/**
 * A file location from a scanner. Absolute paths and drive letters are reduced
 * to the repository-relative tail so a shared report does not carry someone's
 * home directory.
 */
export function locator(value: unknown): string {
  const raw = text(value, MAX_LOCATOR);
  if (!raw) return '';
  const normalized = raw.replace(/\\/g, '/');
  const stripped = normalized
    .replace(/^[A-Za-z]:\//, '')
    .replace(/^\/(home|Users|root)\/[^/]+\//, '')
    .replace(/^\/+/, '');
  const parts = stripped.split('/').filter((p) => p !== '.' && p !== '..');
  return parts.slice(-4).join('/');
}

export function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** A bounded, non-negative number, for lifetimes and effort estimates. */
export function boundedNumber(value: unknown, min: number, max: number): number | undefined {
  const n = finiteNumber(value);
  if (n === undefined) return undefined;
  if (n < min || n > max) return undefined;
  return n;
}

export function boolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function stringArray(value: unknown, max = 24): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, max)
    .map((v) => text(v, 80))
    .filter(Boolean);
}

/** A record safe to spread into an object literal and render as a table. */
export function attributes(value: unknown, max = 32): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  if (!value || typeof value !== 'object') return { ...out };
  let count = 0;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (count >= max) break;
    const key = text(k, 60);
    if (!key || DANGEROUS_KEYS.has(key)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') continue;
    out[key] = text(v, 160);
    count += 1;
  }
  return { ...out };
}

/** An ISO date string, or null. Never a partially-parsed Date. */
export function isoDate(value: unknown): string | null {
  const raw = text(value, 40);
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

/** A safe object property read that ignores prototype keys. */
export function prop(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  if (DANGEROUS_KEYS.has(key)) return undefined;
  return Object.prototype.hasOwnProperty.call(obj, key)
    ? (obj as Record<string, unknown>)[key]
    : undefined;
}
