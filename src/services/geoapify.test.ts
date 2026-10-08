import {afterEach,describe,it,expect,vi} from 'vitest';
import {geoapifyProvider,normalizeGeoapifySearch,normalizeGeoapifyReverse,createGeoapifyBudget} from '../../server/location/geoapify';
import {locationCapabilities} from '../../server/location/safety';
import {locationResponse} from '../../server/location/handler';
const row={name:'基隆長庚紀念醫院',formatted:'基隆市安樂區麥金路231號',state:'基隆市',city:'安樂區',country_code:'tw',lat:25.122,lon:121.723,result_type:'amenity'};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('Geoapify provider',()=>{
 it('maps Taiwan POIs and rejects foreign or malformed positions',()=>{
  expect(normalizeGeoapifySearch({results:[row,{...row,country_code:'us'},{...row,lat:100}]})).toMatchObject([{label:row.name,address:row.formatted,city:'基隆市',district:'安樂區',location:{lat:25.122,lng:121.723},kind:'poi',needs_confirmation:true,precision:'amenity',confidence:null}]);
  expect(normalizeGeoapifyReverse({results:[row]})).toEqual({address:row.formatted,city:'基隆市',district:'安樂區'});
  expect(normalizeGeoapifyReverse({results:[]})).toBeNull();
  expect(()=>normalizeGeoapifySearch({bad:true})).toThrow();
 });
 it('keeps missing key fail-closed',async()=>{
  vi.stubEnv('GEOAPIFY_LOCATION_ENABLED','true');vi.stubEnv('GEOAPIFY_API_KEY','');
  expect(locationCapabilities().searchReady).toBe(false);
  expect((await locationResponse(new Request('https://roadtag.org/api/location/search?q=長庚'),'search')).status).toBe(503);
 });
 it('queries autocomplete/reverse server side and never returns key',async()=>{
  vi.stubEnv('GEOAPIFY_LOCATION_ENABLED','true');vi.stubEnv('GEOAPIFY_API_KEY','test-secret');
  const upstream=vi.fn(async(url:URL)=>{expect(url.searchParams.get('apiKey')).toBe('test-secret');return Response.json({results:[row]});});
  vi.stubGlobal('fetch',upstream);
  const results=await geoapifyProvider.search('基隆長庚','TW-KEE');
  expect(results[0].location.lng).toBe(row.lon);
  expect(upstream.mock.calls[0][0].pathname).toBe('/v1/geocode/autocomplete');
  expect(upstream.mock.calls[0][0].searchParams.get('filter')).toBe('countrycode:tw');
  expect(JSON.stringify(results)).not.toContain('test-secret');
  expect((await geoapifyProvider.reverse({lat:25.122,lng:121.723}))?.city).toBe('基隆市');
  expect(upstream.mock.calls[1][0].pathname).toBe('/v1/geocode/reverse');
 });
});

describe('Geoapify release safety',()=>{
 const configured=()=>{vi.stubEnv('GEOAPIFY_LOCATION_ENABLED','true');vi.stubEnv('GEOAPIFY_API_KEY','mock-only');};
 it.each(['基隆市仁愛區精一路19之1號','基隆市仁愛區精一路19-1號'])('normalizes doorplate %s and keeps precision advisory',async query=>{
  configured();const fetch=vi.fn(async(url:URL)=>{expect(url.searchParams.get('text')).toContain('19-1號');return Response.json({results:[{...row,result_type:'building',rank:{confidence:0.45,match_type:'street'}}]});});vi.stubGlobal('fetch',fetch);
  const r=await geoapifyProvider.search(query);expect(r[0]).toMatchObject({confidence:0.45,precision:'street',needs_confirmation:true});
 });
 it('keeps multiple landmarks as candidates and zero results empty',()=>{
  expect(normalizeGeoapifySearch({results:[row,{...row,name:'第二候選'}]})).toHaveLength(2);expect(normalizeGeoapifySearch({results:[]})).toEqual([]);
 });
 it.each([429,500,502])('sanitizes upstream HTTP %s',async status=>{configured();vi.stubGlobal('fetch',vi.fn(async()=>new Response('mock-only',{status})));await expect(geoapifyProvider.search('基隆長庚')).rejects.toThrow('Geoapify unavailable');});
 it('sanitizes network/timeout failure at the API boundary',async()=>{configured();vi.stubGlobal('fetch',vi.fn(async(_url:URL,init:RequestInit)=>{expect(init.signal).toBeDefined();throw new DOMException('mock-only','TimeoutError');}));const r=await locationResponse(new Request('https://roadtag.org/api/location/search?q=基隆長庚'),'search');expect(r.status).toBe(503);expect(await r.text()).not.toContain('mock-only');});
 it('makes no upstream call when disabled or missing key',async()=>{const f=vi.fn();vi.stubGlobal('fetch',f);vi.stubEnv('GEOAPIFY_LOCATION_ENABLED','false');await expect(geoapifyProvider.search('基隆長庚')).rejects.toThrow();configured();vi.stubEnv('GEOAPIFY_API_KEY','');await expect(geoapifyProvider.search('基隆長庚')).rejects.toThrow();expect(f).not.toHaveBeenCalled();});
 it('rejects invalid input and cross-origin before provider I/O',async()=>{configured();const f=vi.fn();vi.stubGlobal('fetch',f);await expect(geoapifyProvider.reverse({lat:NaN,lng:121})).rejects.toThrow();await expect(geoapifyProvider.search('x'.repeat(201))).rejects.toThrow();expect((await locationResponse(new Request('https://roadtag.org/api/location/search?q=基隆長庚',{headers:{Origin:'https://evil.example'}}),'search')).status).toBe(403);expect(f).not.toHaveBeenCalled();});
 it('enforces minute/day budget and restores at window boundaries',()=>{let now=0;const reserve=createGeoapifyBudget(()=>now,1,2);reserve();expect(reserve).toThrow();now=60000;reserve();now=120000;expect(reserve).toThrow();now=86400000;expect(reserve).not.toThrow();});
});
