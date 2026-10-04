import { validLocation, type LocationPoint, type LocationResult, type ReverseLocationResult } from './locationContract';

export const LOCATION_SEARCH_UNAVAILABLE = '位置搜尋暫時無法使用，你仍可使用目前位置或直接點地圖。';
async function request(path:string, parameters:URLSearchParams, signal?:AbortSignal):Promise<unknown> {
  const response = await fetch(`/api/location/${path}?${parameters}`, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    credentials:'same-origin', cache:'no-store',
  });
  if (!response.ok) throw new Error(LOCATION_SEARCH_UNAVAILABLE);
  return response.json();
}
export async function searchLocations(query:string, cityId:string, signal?:AbortSignal):Promise<LocationResult[]> {
  const payload = await request('search', new URLSearchParams({ q:query.trim(), cityId }), signal) as { results?:LocationResult[] };
  if (!Array.isArray(payload?.results) || payload.results.some(result => !result || !validLocation(result.location ?? { lat:NaN,lng:NaN }) || typeof result.label !== 'string' || typeof result.address !== 'string' || typeof result.city !== 'string' || typeof result.district !== 'string')) throw new Error(LOCATION_SEARCH_UNAVAILABLE);
  return payload.results.slice(0,5);
}
export async function reverseLocation(point:LocationPoint, signal?:AbortSignal):Promise<ReverseLocationResult|null> {
  const payload = await request('reverse', new URLSearchParams({ lat:String(point.lat), lng:String(point.lng) }), signal) as ReverseLocationResult|null;
  if (payload === null) return null;
  if (!payload || typeof payload.address !== 'string' || typeof payload.city !== 'string' || typeof payload.district !== 'string') throw new Error(LOCATION_SEARCH_UNAVAILABLE);
  return payload;
}
