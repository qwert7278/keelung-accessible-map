import { readConsent } from '../src/utils/consent.ts';
import { cityFromHeaders } from '../src/utils/geo-city.ts';

export function GET(request: Request) {
  const consent = readConsent(request.headers.get('cookie') || '')?.preferences;
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie', 'X-Robots-Tag': 'noindex' };
  if (!consent) return Response.json({ cityId: null }, { status: 403, headers });
  // Vercel supplies these coarse geo headers. Never return or store the raw IP.
  return Response.json({ cityId: cityFromHeaders(request.headers), source: 'ip-city' }, { headers });
}
