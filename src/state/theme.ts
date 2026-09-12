/* ============================================================================
   Theme switching, with a wave.

   The two themes are separate designs rather than an inversion — graphite
   workstation to buff log paper — so the switch is a real change of material.
   A hard cut reads as a glitch. A disc of the incoming ground sweeping out
   from the control that was pressed reads as a change the operator caused,
   which is the one thing a theme toggle should communicate.

   Built from a plain element rather than the View Transitions API. The API
   gives a nicer content-to-content wipe where it exists, but it exists in no
   Firefox and no Safari before 18, so for a good share of any audience it is a
   feature they would never see. A disc animating `transform` is composited on
   every engine, is inspectable with ordinary tools, and can carry the amber
   leading edge that the API version had no way to draw.

   Reduced motion, from either the OS or the in-product setting, skips straight
   to the swap.
   ========================================================================= */

const SWEEP_MS = 700;
const SETTLE_MS = 260;
/*
 * Not the product's standard ease. The house curve is exponential-out, which
 * is right for something arriving and settling and wrong for a wipe: it puts
 * 93% of the travel into the first 10% of the duration, so the front is never
 * anywhere the eye can follow. A sweep has to be watchable, which means close
 * to constant speed with the ease saved for the end.
 */
const SWEEP_EASE = 'cubic-bezier(0.35, 0.12, 0.28, 1)';
const OVERLAY_ID = 'sunset-theme-wave';

export type ResolvedTheme = 'dark' | 'light';

export interface WaveOrigin {
  x: number;
  y: number;
}

function motionIsReduced(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.getAttribute('data-reduce-motion') === 'true') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The centre of an element, for a wave that starts where the finger landed. */
export function originOf(element: Element | null): WaveOrigin | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** What 'system' resolves to right now. */
export function resolveTheme(preference: 'dark' | 'light' | 'system'): ResolvedTheme {
  if (preference !== 'system') return preference;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Reads tokens as the *incoming* theme would resolve them, without applying
 * that theme to the page. An off-screen probe carrying the target theme is the
 * only way to get real values: the tokens are CSS custom properties, so there
 * is nothing to look up from JavaScript.
 */
function tokensFor(theme: ResolvedTheme, names: string[]): string[] {
  const probe = document.createElement('div');
  probe.setAttribute('data-theme', theme);
  probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;';
  document.body.appendChild(probe);
  const styles = getComputedStyle(probe);
  const values = names.map((name) => styles.getPropertyValue(name).trim());
  probe.remove();
  return values;
}

function clearOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  document.documentElement.removeAttribute('data-theme-switching');
}

/**
 * Applies `theme`, sweeping a disc of the incoming ground out from `origin`.
 *
 * `commit` keeps the store in step and runs at the moment the disc covers the
 * viewport, together with the attribute write, so the two can never disagree
 * about which theme is showing and nothing is seen to jump.
 */
export function applyThemeWithWave(
  theme: ResolvedTheme,
  origin: WaveOrigin | null,
  commit?: () => void,
): void {
  const root = document.documentElement;
  const swap = () => {
    root.setAttribute('data-theme', theme);
    commit?.();
  };

  if (motionIsReduced() || !origin || typeof Element.prototype.animate !== 'function') {
    clearOverlay();
    swap();
    return;
  }

  // A second switch part-way through must not leave two discs on the page.
  clearOverlay();

  const [ground, amber] = tokensFor(theme, ['--c-ground', '--c-amber']);
  const { x, y } = origin;
  // Far enough to cover the furthest corner from wherever the wave began.
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const disc = document.createElement('div');
  disc.id = OVERLAY_ID;
  disc.setAttribute('aria-hidden', 'true');
  disc.style.cssText = [
    'position:fixed',
    `left:${x}px`,
    `top:${y}px`,
    `width:${radius * 2}px`,
    `height:${radius * 2}px`,
    `margin-left:${-radius}px`,
    `margin-top:${-radius}px`,
    'border-radius:50%',
    `background:${ground}`,
    // The leading edge, in the one colour this product reserves for transition
    // and deadline. It is what makes the sweep read as a front rather than as
    // a shape appearing.
    `border:2px solid ${amber}`,
    'pointer-events:none',
    'z-index:2147483647',
    'transform:scale(0)',
    'will-change:transform,opacity',
  ].join(';');

  document.body.appendChild(disc);

  // Every element carrying a colour transition would otherwise run its own
  // small fade on its own clock behind the disc. Suppressing them makes the
  // sweep the single piece of motion on screen.
  root.setAttribute('data-theme-switching', 'true');

  const sweep = disc.animate(
    { transform: ['scale(0)', 'scale(1)'] },
    { duration: SWEEP_MS, easing: SWEEP_EASE, fill: 'forwards' },
  );

  let handled = false;
  const cover = () => {
    if (handled) return;
    handled = true;

    // The disc covers the viewport at this instant, so the theme changes
    // underneath it and the swap itself is never seen.
    swap();

    const settle = disc.animate(
      { opacity: [1, 0] },
      { duration: SETTLE_MS, easing: 'linear', fill: 'forwards' },
    );
    const done = () => {
      disc.remove();
      root.removeAttribute('data-theme-switching');
    };
    settle.addEventListener('finish', done);
    settle.addEventListener('cancel', done);
    // A tab that is not producing frames never fires 'finish', so the events
    // above cannot be the only path. This is the floor that guarantees the
    // overlay is never left on screen; removing it early is always the safe
    // direction, since the theme is already applied underneath it.
    window.setTimeout(done, SETTLE_MS + 250);
  };

  sweep.addEventListener('finish', cover);
  sweep.addEventListener('cancel', cover);
  window.setTimeout(cover, SWEEP_MS + 250);
}
