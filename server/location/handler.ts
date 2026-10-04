import { limitLocation, locationCapabilities } from './safety.js';
import { validLocation } from '../../src/services/locationContract.js';
import { locationCityName, tgosProvider, type LocationProvider } from './provider.js';

const headers = { 'Cache-Control':'private, no-store, max-age=0', 'X-Robots-Tag':'noindex', 'X-Content-Type-Options':'nosniff' };
export async function locationResponse(request:Request, operation:'search'|'reverse', provider:LocationProvider=tgosProvider) {
  const parameters = new URL(request.url).searchParams;
  const invalid = () => Response.json({ error:'INVALID_LOCATION_REQUEST' }, {status:400,headers});
  if (request.method !== 'GET') return Response.json({ error:'METHOD_NOT_ALLOWED' }, {status:405,headers:{...headers,Allow:'GET'}});
  const query = (parameters.get('q') ?? '').trim(), cityId = parameters.get('cityId') ?? undefined;
  const lat=parameters.get('lat'),lng=parameters.get('lng');
  const point={lat:lat?.trim() ? Number(lat) : NaN, lng:lng?.trim() ? Number(lng) : NaN};
  if (operation === 'search' && (query.length < 2 || query.length > 120 || cityId !== undefined && !locationCityName(cityId))) return invalid();
  if (operation === 'reverse' && !validLocation(point)) return invalid();
  const retry=limitLocation(request);
  if (retry) return Response.json({error:'LOCATION_RATE_LIMITED'},{status:429,headers:{...headers,'Retry-After':String(retry)}});
  const capabilities=locationCapabilities();
  if (provider===tgosProvider && !(operation==='search' ? capabilities.searchReady : capabilities.reverseReady)) return Response.json({error:'LOCATION_TEMPORARILY_UNAVAILABLE'},{status:503,headers});
  try {
    const data = await (operation === 'search' ? provider.search(query,cityId).then(results => ({results:results.slice(0,5)})) : provider.reverse(point));
    return Response.json(data,{headers});
  } catch {
    return Response.json({error:'LOCATION_TEMPORARILY_UNAVAILABLE'}, {status:503,headers});
  }
}
