import { useEffect, useState } from 'react';

/**
 * True when either the operating system or the in-product setting asks for
 * reduced motion. Both are honoured; neither overrides the other, because a
 * user who set the OS preference should not have to set it again here.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => read());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(read());
    mq.addEventListener('change', update);

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-reduce-motion'],
    });

    return () => {
      mq.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return reduced;
}

function read(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.getAttribute('data-reduce-motion') === 'true') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
