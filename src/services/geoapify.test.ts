import {afterEach,describe,it,expect,vi} from 'vitest';
import {geoapifyProvider,normalizeGeoapifySearch,normalizeGeoapifyReverse} from '../../server/location/geoapify';
import {locationCapabilities} from '../../server/location/safety';
import {locationResponse} from '../../server/location/handler';
const row={name:'基隆長庚紀念醫院',formatted:'基隆市安樂區麥金路231號',state:'基隆市',city:'安樂區',country_code:'tw',lat:25.122,lon:121.723,result_type:'amenity'};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('Geoapify provider',()=>{
 it('maps Taiwan POIs and rejects foreign or malformed positions',()=>{
  expect(normalizeGeoapifySearch({results:[row,{...row,country_code:'us'},{...row,lat:100}]})).toEqual([{label:row.name,address:row.formatted,city:'基隆市',district:'安樂區',location:{lat:25.122,lng:121.723},kind:'poi'}]);
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
