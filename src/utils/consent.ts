export type Consent = { version: 1; preferences: boolean; expires: number };
export const CONSENT_EVENT = 'roadtag-consent-change';
const KEY = 'roadtag-consent';
export function readConsent(cookie = typeof document === 'undefined' ? '' : document.cookie, now = Date.now()): Consent | null {
  try {
    const raw = cookie.split('; ').find(item => item.startsWith(KEY + '='))?.slice(KEY.length + 1);
    const value = JSON.parse(decodeURIComponent(raw || ''));
    return value.version === 1 && typeof value.preferences === 'boolean' && Number.isFinite(value.expires) && value.expires > now ? value : null;
  } catch { return null; }
}
export function saveConsent(preferences: boolean) {
  const value: Consent = { version: 1, preferences, expires: Date.now() + 180 * 86400000 };
  document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  if (!preferences) {
    try { localStorage.removeItem('roadtag-geography'); sessionStorage.removeItem('roadtag-geography'); } catch { /* Storage may be disabled. */ }
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
  return value;
}
