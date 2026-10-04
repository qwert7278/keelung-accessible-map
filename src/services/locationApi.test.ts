import { afterEach, describe, expect, it, vi } from 'vitest';
import { locationResponse } from '../../server/location/handler';
import { locationCityName, normalizeTgosSearch, tgosProvider, type LocationProvider } from '../../server/location/provider';
import { searchLocations, reverseLocation } from './locationApi';
import { CITIES } from '../config';

const result = {label:'國立臺灣海洋大學', address:'基隆市中正區北寧路2號',city:'基隆市',district:'中正區',location:{lat:25.150,lng:121.775},kind:'poi' as const};
const provider:LocationProvider = {search:vi.fn(async () => [result]),reverse:vi.fn(async () => ({address:result.address,city:result.city,district:result.district}))};
const request = (suffix:string) => new Request(`https://roadtag.org/api/location/${suffix}`);
afterEach(() => {vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});

describe('Road Tag location API boundary', () => {
  it('supports every enabled city context',()=>{
    expect(CITIES).toHaveLength(22);
    for (const city of CITIES) expect(locationCityName(city.id)).toBe(city.name);
  });
  it.each(['search?q=','search?q=一','search?q='+ '字'.repeat(121),'search?q=海洋&cityId=TW-NOPE'])('rejects invalid search %s',async suffix => {
    const search=vi.fn();
    expect((await locationResponse(request(suffix),'search',{...provider,search})).status).toBe(400);
    expect(search).not.toHaveBeenCalled();
  });
  it('trims the query, passes city context, bounds results and applies privacy headers', async () => {
    const search=vi.fn(async()=>Array(8).fill(result));
    const response=await locationResponse(request('search?q=%20海洋大學%20&cityId=TW-KEE'),'search',{...provider,search});
    expect(search).toHaveBeenCalledWith('海洋大學','TW-KEE');
    expect((await response.json()).results).toHaveLength(5);
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
  });
  it.each(['reverse','reverse?lat=&lng=121','reverse?lat=NaN&lng=121','reverse?lat=91&lng=121','reverse?lat=25&lng=181','reverse?lat=Infinity&lng=121'])('rejects invalid coordinate %s',async suffix=>{
    const reverse=vi.fn();
    expect((await locationResponse(request(suffix),'reverse',{...provider,reverse})).status).toBe(400);
    expect(reverse).not.toHaveBeenCalled();
  });
  it('returns normalized reverse data without snapping or returning coordinates',async()=>{
    const reverse=vi.fn(provider.reverse);
    const response=await locationResponse(request('reverse?lat=25.15001&lng=121.77502'),'reverse',{...provider,reverse});
    expect(reverse).toHaveBeenCalledWith({lat:25.15001,lng:121.77502});
    expect(await response.json()).toEqual({address:result.address,city:result.city,district:result.district});
  });
  it('returns controlled empty results',async()=>{
    expect(await (await locationResponse(request('search?q=查無地點'),'search',{...provider,search:async()=>[]})).json()).toEqual({results:[]});
    expect(await (await locationResponse(request('reverse?lat=25&lng=121'),'reverse',{...provider,reverse:async()=>null})).json()).toBeNull();
  });
  it.each(['timeout','HTTP 403','HTTP 500','malformed JSON'])('does not leak errors or credentials: %s',async reason=>{
    const response=await locationResponse(request('search?q=海洋大學'),'search',{...provider,search:async()=>{throw new Error(`${reason} APPID secret-key`);}});
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"error":"LOCATION_TEMPORARILY_UNAVAILABLE"}');
  });
  it('rejects POST and preserves the GET-only contract',async()=>{
    expect((await locationResponse(new Request('https://roadtag.org/api/location/search?q=海洋',{method:'POST'}),'search',provider)).status).toBe(405);
  });
});
describe('TGOS isolation',()=>{
  it('maps documented X/Y and county/town fields; strips raw provider fields',()=>{
    const row={name:result.label,address:result.address,county:result.city,town:result.district,X:'121.775',Y:'25.15',type:'poi',APIKey:'secret'};
    const rows=normalizeTgosSearch({status:'OK',results:[row,{...row,X:303891,Y:2773226},...Array(8).fill(row)]});
    expect(rows).toHaveLength(5);expect(rows[0]).toEqual(result);
    expect(JSON.stringify(rows)).not.toContain('secret');
  });
  it('rejects denied or malformed payloads and handles no results',()=>{
    expect(()=>normalizeTgosSearch({status:'REQUEST_DENIED',error_message:'secret'})).toThrow();
    expect(()=>normalizeTgosSearch({results:{}})).toThrow();
    expect(normalizeTgosSearch({status:'ZERO_RESULTS'})).toEqual([]);
  });
  it('does not call the provider before credentials and transport approval',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubEnv('TGOS_LOCATION_ENABLED','false');
    await expect(tgosProvider.search('海洋大學','TW-KEE')).rejects.toThrow();
    await expect(tgosProvider.reverse(result.location)).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();
  });
  it.each([403,500])('normalizes a failed HTTP response (%s)',async status=>{
    vi.stubEnv('TGOS_APP_ID','test-id');vi.stubEnv('TGOS_API_KEY','test-key');vi.stubEnv('TGOS_LOCATION_ENABLED','true');
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('provider internal error',{status})));
    await expect(tgosProvider.search('海洋大學','TW-KEE')).rejects.toThrow('Provider unavailable');
  });
  it('uses a five-second timeout and does not leak the aborted transport error',async()=>{
    vi.stubEnv('TGOS_APP_ID','test-id');vi.stubEnv('TGOS_API_KEY','test-key');vi.stubEnv('TGOS_LOCATION_ENABLED','true');
    const controller=new AbortController();
    const timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(controller.signal);
    vi.stubGlobal('fetch',vi.fn((_url:unknown,options:RequestInit)=>new Promise((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(new Error('test-key timeout'))))));
    const pending=locationResponse(request('search?q=海洋大學'),'search');
    controller.abort();
    const response=await pending;
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('test-key');
  });
  it('rejects malformed upstream JSON through the safe API boundary',async()=>{
    vi.stubEnv('TGOS_APP_ID','test-id');vi.stubEnv('TGOS_API_KEY','test-key');vi.stubEnv('TGOS_LOCATION_ENABLED','true');
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('secret provider HTML')));
    const response=await locationResponse(request('search?q=海洋大學'),'search');
    expect(response.status).toBe(503);expect(await response.text()).toBe('{"error":"LOCATION_TEMPORARILY_UNAVAILABLE"}');
  });
});
describe('thin location client',()=>{
  it('uses only Road Tag endpoints and passes abort signals',async()=>{
    const fetch=vi.fn<typeof globalThis.fetch>(async()=>Response.json({results:[result]}));vi.stubGlobal('fetch',fetch);
    const controller=new AbortController();
    expect(await searchLocations(' 海洋大學 ','TW-KEE',controller.signal)).toEqual([result]);
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/location/search?q=%E6%B5%B7%E6%B4%8B%E5%A4%A7%E5%AD%B8&cityId=TW-KEE');
    controller.abort();
    expect((fetch.mock.calls[0] as unknown as [string,RequestInit])[1].signal?.aborted).toBe(true);
  });
  it('rejects HTML/invalid data and handles controlled reverse no-result',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json(null)));
    expect(await reverseLocation(result.location)).toBeNull();
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({results:[{...result,location:{lat:999,lng:121}}]})));
    await expect(searchLocations('海洋大學','TW-KEE')).rejects.toThrow();
  });
});
