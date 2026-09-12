/* ============================================================================
   Theme switching, with a wave.

   The two themes are separate designs rather than an inversion, so the switch
   is a real change of material — graphite workstation to buff log paper. A
   hard cut makes that read as a glitch. A circular wipe expanding from the
   control the operator actually pressed makes it read as a deliberate change
   they caused, which is the one thing a theme toggle should communicate.

   Built on the View Transitions API, which snapshots the old and new frames
   and lets us clip between them. Everything degrades to an instant swap: no
   API support, reduced motion, or a failed transition all end at the same
   place, with the same theme applied.
   ========================================================================= */

const DURATION_MS = 560;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

export type ResolvedTheme = 'dark' | 'light';

export interface WaveOrigin {
  x: number;
  y: number;
}

/**
 * The DOM lib types `startViewTransition` as always present, but it ships in
 * no Firefox and no Safari before 18, so the call is guarded at runtime and
 * the type is narrowed here rather than asserted at the call site.
 */
type MaybeViewTransitions = {
  startViewTransition?: Document['startViewTransition'];
};

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

/**
 * Applies `theme` to the document, wiping it in from `origin`.
 *
 * `commit` keeps the store in step. It is called immediately rather than after
 * the animation, because the only visual the store's own theme effect produces
 * is the same `data-theme` value this function has already written — so the
 * re-render that follows changes nothing on screen and cannot interfere with
 * the transition's snapshot.
 */
export function applyThemeWithWave(
  theme: ResolvedTheme,
  origin: WaveOrigin | null,
  commit?: () => void,
): void {
  const doc = document as Document & MaybeViewTransitions;
  const paint = () => document.documentElement.setAttribute('data-theme', theme);

  if (typeof doc.startViewTransition !== 'function' || motionIsReduced() || !origin) {
    paint();
    commit?.();
    return;
  }

  let transition: ViewTransition;
  try {
    transition = doc.startViewTransition(paint);
  } catch {
    paint();
    commit?.();
    return;
  }
  commit?.();

  const { x, y } = origin;
  // Far enough to cover the furthest corner from wherever the wave began.
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: DURATION_MS,
          easing: EASE,
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {
      /* The transition was skipped or interrupted; the theme is already applied. */
    });
}

/** What 'system' resolves to right now. */
export function resolveTheme(preference: 'dark' | 'light' | 'system'): ResolvedTheme {
  if (preference !== 'system') return preference;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
