import { useEffect, useRef, useState } from 'react';

/**
 * Element width and height, tracked with a ResizeObserver.
 *
 * The analytical surfaces are drawn in real pixel coordinates rather than a
 * scaled viewBox, because a scaled viewBox stretches type and hairlines with
 * it — a 1px rule is not a 1px rule after a non-uniform scale, and in a
 * hairline-driven interface that is the whole design.
 */
export function useMeasure<T extends HTMLElement>(): [
  React.RefObject<T>,
  { width: number; height: number },
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
          ? prev
          : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
