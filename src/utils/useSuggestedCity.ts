import { useEffect, useState } from 'react';
import { CONSENT_EVENT, readConsent } from './consent';

export function useSuggestedCity() {
  const [cityId, setCityId] = useState<string | null>(null);
  useEffect(() => {
    let controller: AbortController | undefined;
    let active = true;
    function refresh() {
      controller?.abort();
      if (!readConsent()?.preferences) { setCityId(null); return; }
      controller = new AbortController();
      const current = controller;
      void fetch('/api/location', { credentials: 'same-origin', signal: current.signal, cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .then(data => { if (active && !current.signal.aborted && readConsent()?.preferences) setCityId(typeof data?.cityId === 'string' ? data.cityId : null); })
        .catch(() => { /* Local dev, unknown geo, or network failure keeps manual selection available. */ });
    }
    refresh();
    window.addEventListener(CONSENT_EVENT, refresh);
    return () => { active = false; controller?.abort(); window.removeEventListener(CONSENT_EVENT, refresh); };
  }, []);
  return cityId;
}
