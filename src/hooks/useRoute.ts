import { useCallback, useEffect, useState } from 'react';
import { isViewId, type ViewId } from '@/state/views';

/* ============================================================================
   Hash routing.

   Hash rather than history for one product reason: SUNSET must work when
   opened from the filesystem with no server, which is how an offline analysis
   tool gets used on a locked-down workstation.

   Only the view id ever enters the URL. Finding ids, algorithm names, filter
   queries and inventory names stay out of it: a URL is copied into tickets and
   chat, and the name of a weak algorithm on a named internal system is not
   something this product should put on anyone's clipboard by default.
   ========================================================================= */

function read(): ViewId {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  return isViewId(raw) ? raw : 'overview';
}

export function useRoute(): [ViewId, (view: ViewId) => void] {
  const [view, setView] = useState<ViewId>(read);

  useEffect(() => {
    const onChange = () => setView(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: ViewId) => {
    if (read() === next) {
      setView(next);
      return;
    }
    window.location.hash = `#/${next}`;
  }, []);

  return [view, navigate];
}
