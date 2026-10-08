import { validLocation, type LocationPoint, type LocationResult, type ReverseLocationResult } from '../../src/services/locationContract.js';
import type { LocationProvider } from './provider.js';

type GeoRow = Record<string, unknown>;
const value = (v: unknown, max=200) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const isTaiwan = (r: GeoRow) => value(r.country_code).toLowerCase() === 'tw';
const admin = (r:GeoRow) => [r.state,r.county,r.city,r.suburb,r.district].map(x=>value(x,40));
const city = (r: GeoRow) => admin(r).find(x=>/[市縣]$/.test(x)) || value(r.city || r.county || r.state,40);
const district = (r: GeoRow) => admin(r).find(x=>/[區鄉鎮]$/.test(x)) || value(r.suburb || r.district || r.city,40);
function rows(payload: unknown): GeoRow[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as {results?:unknown}).results)) throw new Error('Invalid Geoapify response');
  return (payload as {results: unknown[]}).results.filter((v):v is GeoRow => !!v && typeof v === 'object' && !Array.isArray(v));
}
export function normalizeGeoapifySearch(payload: unknown): LocationResult[] {
  return rows(payload).filter(isTaiwan).flatMap(r => {
    const point = { lat:Number(r.lat), lng:Number(r.lon) };
    if (!validLocation(point) || point.lat < 21 || point.lat > 26.5 || point.lng < 118 || point.lng > 123) return [];
    const label=value(r.name || r.address_line1 || r.formatted);
    if (!label) return [];
    const type=value(r.result_type);
    const rank=r.rank && typeof r.rank==='object' ? r.rank as GeoRow : {};
    const confidence=typeof rank.confidence==='number' && Number.isFinite(rank.confidence) ? Math.max(0,Math.min(1,rank.confidence)) : null;
    const precision=value(rank.match_type || type,40);
    const kind:LocationResult['kind'] = type==='amenity'?'poi':type==='street'?'road':['city','county','state','district','suburb'].includes(type)?'district':['building','postcode','unknown'].includes(type)?'address':'other';
    return [{label,address:value(r.formatted),city:city(r),district:district(r),location:point,kind,precision,confidence,needs_confirmation:true as const,source:'Geoapify' as const}];
  }).slice(0,5);
}
export function normalizeGeoapifyReverse(payload:unknown):ReverseLocationResult|null {
  const r=rows(payload).find(isTaiwan);
  return r ? {address:value(r.formatted),city:city(r),district:district(r)} : null;
}
export function createGeoapifyBudget(now=()=>Date.now(), minuteMax=80, dayMax=1000) {
  let minute=-1,day=-1,minuteCount=0,dayCount=0;
  return () => {
    const m=Math.floor(now()/60000),d=Math.floor(now()/86400000);
    if(m!==minute){minute=m;minuteCount=0;}if(d!==day){day=d;dayCount=0;}
    if(minuteCount>=minuteMax||dayCount>=dayMax)throw new Error('Geoapify quota unavailable');
    minuteCount++;dayCount++;
  };
}
const reserveLookup=createGeoapifyBudget();
async function lookup(url:URL):Promise<unknown> {
  reserveLookup();
  const response=await fetch(url,{signal:AbortSignal.timeout(5000),redirect:'error'});
  if (!response.ok) throw new Error('Geoapify unavailable');
  return response.json();
}
function endpoint(action:'autocomplete'|'reverse') {
  if (process.env.GEOAPIFY_LOCATION_ENABLED!=='true' || !process.env.GEOAPIFY_API_KEY) throw new Error('Geoapify not configured');
  const url=new URL('https://api.geoapify.com/v1/geocode/'+action);
  url.searchParams.set('apiKey',process.env.GEOAPIFY_API_KEY);
  url.searchParams.set('format','json');
  url.searchParams.set('lang','zh');
  return url;
}
export const geoapifyProvider:LocationProvider={
  async search(query,cityId) {
    if(query.trim().length<2 || query.trim().length>200)throw new Error('Invalid location query');
    const url=endpoint('autocomplete');
    url.searchParams.set('text',query.trim().replace(/(\d+)之(\d+)(?=號)/g,'$1-$2'));
    url.searchParams.set('filter','countrycode:tw');
    url.searchParams.set('limit','5');
    // City hint is a ranking hint, never an exclusion: users can search across Taiwan.
    if (cityId==='TW-KEE') url.searchParams.set('bias','proximity:121.7405,25.1276');
    return normalizeGeoapifySearch(await lookup(url));
  },
  async reverse(point:LocationPoint) {
    if (!validLocation(point) || point.lat<21 || point.lat>26.5 || point.lng<118 || point.lng>123) throw new Error('Invalid location');
    const url=endpoint('reverse');
    url.searchParams.set('lat',String(point.lat));
    url.searchParams.set('lon',String(point.lng));
    url.searchParams.set('limit','1');
    return normalizeGeoapifyReverse(await lookup(url));
  }
};
