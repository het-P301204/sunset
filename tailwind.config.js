/** @type {import('tailwindcss').Config} */
// Every value here resolves to a CSS custom property declared in src/styles/tokens.css.
// Tailwind is the delivery mechanism; tokens.css is the single source of truth, which is
// what lets the light theme be a different design rather than an inversion.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ground: 'var(--c-ground)',
        bed: {
          0: 'var(--c-bed-0)',
          1: 'var(--c-bed-1)',
          2: 'var(--c-bed-2)',
          3: 'var(--c-bed-3)',
        },
        rule: {
          DEFAULT: 'var(--c-rule)',
          strong: 'var(--c-rule-strong)',
          faint: 'var(--c-rule-faint)',
        },
        ink: {
          DEFAULT: 'var(--c-ink)',
          dim: 'var(--c-ink-dim)',
          muted: 'var(--c-ink-muted)',
          faint: 'var(--c-ink-faint)',
        },
        amber: {
          DEFAULT: 'var(--c-amber)',
          dim: 'var(--c-amber-dim)',
          wash: 'var(--c-amber-wash)',
          ink: 'var(--c-amber-ink)',
        },
        coral: 'var(--c-coral)',
        risk: {
          critical: 'var(--c-critical)',
          high: 'var(--c-high)',
          medium: 'var(--c-medium)',
          low: 'var(--c-low)',
          safe: 'var(--c-safe)',
          unknown: 'var(--c-unknown)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Interface scale. Analytical surfaces live at the small end on purpose:
        // a core log is dense by nature and the density is the point.
        // The densest label tier on an analytical surface. It earned a name
        // once it had been reached for by hand in three dozen places.
        '3xs': ['9px', { lineHeight: '12px', letterSpacing: '0.1em' }],
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }],
        xs: ['11px', { lineHeight: '16px', letterSpacing: '0.04em' }],
        sm: ['12px', { lineHeight: '18px', letterSpacing: '0.01em' }],
        base: ['13px', { lineHeight: '20px' }],
        md: ['14px', { lineHeight: '22px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['20px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        '2xl': ['26px', { lineHeight: '30px', letterSpacing: '-0.02em' }],
        '3xl': ['34px', { lineHeight: '36px', letterSpacing: '-0.025em' }],
        '4xl': ['48px', { lineHeight: '48px', letterSpacing: '-0.03em' }],
        '5xl': ['64px', { lineHeight: '60px', letterSpacing: '-0.035em' }],
        '6xl': ['84px', { lineHeight: '76px', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        // Deliberately shallow. Analytical surfaces get none at all.
        none: '0',
        control: '2px',
        panel: '3px',
      },
      boxShadow: {
        // Offset + blur, never a zero-offset halo.
        drawer: '0 0 0 1px var(--c-rule) , -24px 0 48px -12px rgba(0,0,0,0.55)',
        pop: '0 12px 32px -8px rgba(0,0,0,0.5), 0 2px 6px -2px rgba(0,0,0,0.4)',
        lift: '0 2px 8px -2px rgba(0,0,0,0.4)',
      },
      spacing: {
        rail: 'var(--size-rail)',
        topbar: 'var(--size-topbar)',
        foot: 'var(--size-foot)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        inout: 'var(--ease-inout)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      zIndex: {
        rail: '30',
        drawer: '60',
        modal: '70',
        palette: '80',
        toast: '90',
        intro: '100',
      },
      screens: {
        '3xl': '1600px',
      },
    },
  },
  plugins: [],
};
