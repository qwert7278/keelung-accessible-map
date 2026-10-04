import { afterEach, describe, expect, it, vi } from 'vitest';
import { abortRequest } from './abortRequest';
import { geographyAt } from './locationSelection';
import { CITIES } from '../config';
import { createLocationLimiter, locationCapabilities } from '../../server/location/safety';
import { locationResponse } from '../../server/location/handler';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('location safety',()=>{
  it('finds Keelung RenAi from GPS even when Taipei is selected',async()=>{
    const result=await geographyAt({lat:25.1283,lng:121.7419},CITIES[1]);
    expect(result?.city.id).toBe('TW-KEE');expect(result?.district).toBe('仁愛區');
  });
  it('rejects overseas and invalid coordinates',async()=>{
    expect(await geographyAt({lat:40.7,lng:-74})).toBeNull();
    expect(await geographyAt({lat:NaN,lng:121})).toBeNull();
  });
  it.each(CITIES.map(city=>[city.id,city]))('resolves the starting location for %s by polygons',async(_id,city)=>{
    const result=await geographyAt(city.center,city);
    expect(result?.city.id).toBe(city.id);expect(city.districts).toContain(result?.district);
  });
  it('times out without static AbortSignal APIs and releases the timer',()=>{
    vi.useFakeTimers();const pending=abortRequest(undefined,80);
    vi.advanceTimersByTime(80);expect(pending.signal.aborted).toBe(true);
    pending.cleanup();expect(vi.getTimerCount()).toBe(0);
  });
  it('merges external abort and removes its listener after cleanup',()=>{
    vi.useFakeTimers();const external=new AbortController();const remove=vi.spyOn(external.signal,'removeEventListener');
    const pending=abortRequest(external.signal);external.abort();expect(pending.signal.aborted).toBe(true);
    pending.cleanup();expect(remove).toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
  });
  it('handles an already aborted external request',()=>{
    const external=new AbortController();external.abort();const pending=abortRequest(external.signal);
    expect(pending.signal.aborted).toBe(true);pending.cleanup();
  });
  it('enforces network and whole-instance ceilings, then resets the minute',()=>{
    let now=60000;const limit=createLocationLimiter(()=>now,2,3,true);
    const request=(ip:string)=>new Request('https://roadtag.org/api/location/search',{headers:{'x-forwarded-for':ip}});
    expect(limit(request('test-network-a'))).toBe(0);expect(limit(request('test-network-a'))).toBe(0);
    expect(limit(request('test-network-a'))).toBe(60);expect(limit(request('test-network-b'))).toBe(0);
    expect(limit(request('test-network-c'))).toBe(60);now+=60000;expect(limit(request('test-network-a'))).toBe(0);
  });
  it('keeps both live capabilities off and never fetches a pending TGOS transport',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    expect(locationCapabilities()).toEqual({searchReady:false,reverseReady:false});
    expect((await locationResponse(new Request('https://roadtag.org/api/location/search?q=海洋'),'search')).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns 429 with Retry-After and private no-store headers',async()=>{
    const request=()=>new Request('https://roadtag.org/api/location/search?q=海洋');
    const provider={search:async()=>[],reverse:async()=>null};
    let response:Response|undefined;
    for(let i=0;i<31;i++) response=await locationResponse(request(),'search',provider);
    expect(response?.status).toBe(429);expect(Number(response?.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(response?.headers.get('Cache-Control')).toContain('no-store');
  });
});
