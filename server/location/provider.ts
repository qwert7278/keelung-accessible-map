import { validLocation, type LocationPoint, type LocationResult, type ReverseLocationResult } from '../../src/services/locationContract.js';

export type LocationProvider = {
  search(query:string, cityId?:string):Promise<LocationResult[]>;
  reverse(point:LocationPoint):Promise<ReverseLocationResult|null>;
};
const cityNames:Record<string,string> = {
  'TW-KEE':'基隆市','TW-TPE':'臺北市','TW-NWT':'新北市','TW-TAO':'桃園市','TW-TXG':'臺中市','TW-TNN':'臺南市','TW-KHH':'高雄市',
  'TW-HSZ':'新竹市','TW-HSQ':'新竹縣','TW-MIA':'苗栗縣','TW-CHA':'彰化縣','TW-NAN':'南投縣','TW-YUN':'雲林縣','TW-CYI':'嘉義市','TW-CYQ':'嘉義縣',
  'TW-PIF':'屏東縣','TW-ILA':'宜蘭縣','TW-HUA':'花蓮縣','TW-TTT':'臺東縣','TW-PEN':'澎湖縣','TW-KIN':'金門縣','TW-LIE':'連江縣',
};
export const locationCityName = (id:string) => cityNames[id];
const text = (value:unknown, limit=200) => typeof value === 'string' ? value.trim().slice(0,limit) : '';
export function normalizeTgosSearch(payload:unknown):LocationResult[] {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid provider response');
  const data = payload as { results?:unknown; status?:unknown };
  if (data.status === 'ZERO_RESULTS') return [];
  if (data.status && data.status !== 'OK') throw new Error('Provider unavailable');
  if (!Array.isArray(data.results)) throw new Error('Invalid provider response');
  return data.results.flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string,unknown>;
    const location = { lat: typeof row.Y === 'number' || typeof row.Y === 'string' && row.Y.trim() ? Number(row.Y) : NaN,
      lng: typeof row.X === 'number' || typeof row.X === 'string' && row.X.trim() ? Number(row.X) : NaN };
    const label = text(row.name), city=text(row.county,40), district=text(row.town,40);
    if (!label || !validLocation(location)) return [];
    const kind:LocationResult['kind'] = ['address','poi','road','district'].includes(String(row.type)) ? row.type as LocationResult['kind'] : 'other';
    return [{ label, address:text(row.address), city, district, location, kind }];
  }).slice(0,5);
}

export const tgosProvider:LocationProvider = {
  async search(query, cityId) {
    const appId=process.env.TGOS_APP_ID, key=process.env.TGOS_API_KEY;
    // The official service contract must be read back with the owner's approved key
    // before enabling live calls. No browser SDK or credential is shipped to React.
    if (!appId || !key || process.env.TGOS_LOCATION_ENABLED !== 'true') throw new Error('Provider not configured');
    const url = new URL('https://gis.tgos.tw/TGLocator/TGLocator.ashx');
    url.search = new URLSearchParams({ format:'json', input:query, srs:'EPSG:4326', ignoreGeometry:'true', pnum:'1', APPID:appId, APIKey:key,
      ...(cityId ? {county:cityNames[cityId]} : {}) }).toString();
    const response = await fetch(url, { signal:AbortSignal.timeout(5000), redirect:'error' });
    if (!response.ok) throw new Error('Provider unavailable');
    return normalizeTgosSearch(await response.json());
  },
  async reverse() {
    // TGOS documents nearestAddress through its browser SDK, but the authenticated
    // server transport is not yet available. Fail closed rather than invent a URL
    // or expose the SDK key. UI and API contracts work with an isolated provider.
    throw new Error('TGOS server reverse transport pending');
  },
};
