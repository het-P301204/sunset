import { useEffect, useRef } from 'react';

/* ============================================================================
   Global keyboard control.

   Two rules keep this from fighting the rest of the app:

   1. Nothing fires while focus is in a text field, except Escape and the
      command-palette chord. A security engineer typing "critical" into the
      search box must not find themselves navigated to COVERAGE.
   2. The G-chord has a timeout. A stray G followed thirty seconds later by an
      I is two keystrokes, not a navigation.
   ========================================================================= */

const CHORD_TIMEOUT_MS = 1200;

export interface KeyboardHandlers {
  onChord: (key: string) => void;
  onPalette: () => void;
  onSearch: () => void;
  onEscape: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onLegend?: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    let chordArmed = false;
    let chordTimer: number | undefined;

    const disarm = () => {
      chordArmed = false;
      if (chordTimer) window.clearTimeout(chordTimer);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        disarm();
        ref.current.onPalette();
        return;
      }

      if (event.key === 'Escape') {
        disarm();
        ref.current.onEscape();
        return;
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '/') {
        event.preventDefault();
        disarm();
        ref.current.onSearch();
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        disarm();
        ref.current.onLegend?.();
        return;
      }

      if (chordArmed) {
        disarm();
        ref.current.onChord(event.key.toLowerCase());
        event.preventDefault();
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        chordArmed = true;
        chordTimer = window.setTimeout(disarm, CHORD_TIMEOUT_MS);
        event.preventDefault();
        return;
      }

      if (event.key === 'j') {
        ref.current.onNext?.();
        return;
      }
      if (event.key === 'k') {
        ref.current.onPrevious?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      disarm();
    };
  }, []);
}

/** Traps focus inside a dialog or drawer while it is open. */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  active: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

    const first = focusable()[0] ?? container;
    first.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      previous?.focus?.({ preventScroll: true });
    };
  }, [active, containerRef, onClose]);
}
