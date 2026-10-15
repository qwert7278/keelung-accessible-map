import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {publicEnvironment,publicMcpEndpoint} from '../server/mcp/public.js';
import {createGeoapifyProvider} from '../server/location/geoapify.js';
import {RoadTagService} from '../server/roadtag/service.js';
import {regions} from '../server/roadtag/geography.js';
import type {PublicEvent} from '../server/mcp/public-controls.js';
const saved={...process.env},realFetch=globalThis.fetch;
const origin='https://roadtag.org',lease='00000000-0000-4000-8000-000000000001',reportId='00000000-0000-4000-8000-000000000002';
const base={VERCEL:'1',VERCEL_ENV:'production',MCP_PUBLIC_PRODUCTION_READ_ENABLED:'true',MCP_PUBLIC_PRODUCTION_READ_ORIGIN:origin,MCP_PUBLIC_PRODUCTION_READ_SUPABASE_URL:'https://ifcicahnrpkwjcxmnmug.supabase.co',MCP_PUBLIC_PRODUCTION_READ_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',MCP_PUBLIC_PRODUCTION_CONTROL_SECRET:'independent-public-control-fixture-'.repeat(2),MCP_PUBLIC_PRODUCTION_GEOCODING_ENABLED:'true',MCP_PUBLIC_PRODUCTION_GEOAPIFY_API_KEY:'public-fixture-only',GEOAPIFY_LOCATION_ENABLED:'false',GEOAPIFY_API_KEY:'private-fixture-only'};
const address={name:'門牌候選',formatted:'基隆市仁愛區精一路19-1號',country_code:'tw',lat:25.1263728,lon:121.7413938,result_type:'building',rank:{confidence:0.8,match_type:'full_match'}};
let rows:object[]=[address],mode:number|'throw'|'stall'=200,quota:'allow'|'deny'|'off'='allow',upstream=0,aborts=0,active=0;
const order:string[]=[],observed:PublicEvent[]=[];
const request=(method:string,params:object,signal?:AbortSignal)=>new Request(origin+'/api/mcp-public',{method:'POST',signal,headers:{Accept:'application/json, text/event-stream','Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
const endpoint=()=>{const env=publicEnvironment();assert(env);return publicMcpEndpoint(env.service,{...env.settings,observe:e=>observed.push(e)});};
const decode=(text:string)=>JSON.parse(text.trim().startsWith('{')?text:text.split('\n').find(line=>line.startsWith('data:'))!.slice(5));
const call=async(run:ReturnType<typeof endpoint>,args:object,name='resolve_location')=>{const response=await run(request('tools/call',{name,arguments:args}));return {response,result:decode(await response.text()).result};};
try{
 process.env={...base};
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));
  if(url.hostname==='api.geoapify.com'){
   upstream++;order.push('provider');assert.equal(url.searchParams.get('apiKey'),'public-fixture-only');assert.equal(url.searchParams.get('filter'),'countrycode:tw');assert.equal(url.searchParams.get('limit'),'5');assert.equal(init?.redirect,'error');
   assert(init?.signal);init.signal.throwIfAborted();
   if(mode==='throw')throw Error('PRIVATE_UPSTREAM_KEY_URL_QUERY');
   if(mode==='stall')return new Promise<Response>((_,reject)=>{init.signal!.addEventListener('abort',()=>{aborts++;reject(Error('PRIVATE_TIMEOUT'));},{once:true});});
   if(mode!==200)return new Response('PRIVATE_UPSTREAM_KEY_URL_QUERY',{status:mode});
   return Response.json({results:rows});
  }
  assert.equal(url.hostname,'ifcicahnrpkwjcxmnmug.supabase.co');
  if(url.pathname.endsWith('mcp_public_acquire')){
   const body=JSON.parse(String(init?.body));order.push(body.p_kind);
   if(quota==='off')return Response.json({allowed:false,code:'SERVICE_UNAVAILABLE'});
   if(body.p_kind==='geocode'){assert.equal(body.p_lease,lease);if(quota==='deny')return Response.json({allowed:false,code:'RATE_LIMITED',retry_after:60});}
   else active++;
   return Response.json({allowed:true,lease});
  }
  if(url.pathname.endsWith('mcp_public_release')){order.push('release');active--;return new Response(null,{status:204});}
  if(url.pathname==='/rest/v1/report_feed')return Response.json([{id:reportId,city_id:'TW-KEE',district:'仁愛區',title:'Fixture public report',address:'公開測試地點',category:'ramp',lat:address.lat,lng:address.lon,status:'open',created_by:'PRIVATE_ACTOR',admin_note:'PRIVATE_NOTE'}]);
  if(url.pathname==='/rest/v1/report_update_feed')return Response.json([]);
  throw Error('Unexpected network destination');
 };
 const run=endpoint();
 const first=await call(run,{query:'基隆市仁愛區精一路19之1號'});
 assert.equal(first.result.structuredContent.ok,true,'dedicated key works with Alpha disabled');assert.equal(upstream,1);assert.deepEqual(order,['request','geocode','provider','release']);assert.equal(active,0);
 const candidate=first.result.structuredContent.data.candidates[0];assert.equal(candidate.city_id,'TW-KEE');assert.equal(candidate.district,'仁愛區');assert.equal(candidate.needs_confirmation,true);assert.equal(candidate.confidence,0.8);assert.equal(candidate.kind,'address');assert.equal(first.result.structuredContent.data.attribution.provider.url,'https://www.geoapify.com/');
 const client=new Client({name:'public-geocoding-fixture',version:'1.0.0'});
 try{
  await client.connect(new StreamableHTTPClientTransport(new URL(origin+'/api/mcp-public'),{fetch:async(input,init)=>run(new Request(input,init))}));
  const listed=await client.listTools();assert.deepEqual(listed.tools.map(t=>t.name).sort(),['get_report','resolve_location','search_nearby_reports']);assert(listed.tools.every(t=>t.annotations?.readOnlyHint));assert(listed.tools.find(t=>t.name==='resolve_location')!.description!.includes('不得擅選第一筆'));
  const cases=[['基隆市仁愛區精一路19-1號','building'],['基隆市仁愛區精一路19巷2弄1號','building'],['基隆車站','amenity'],['基隆長庚','amenity'],['精一路便利商店','amenity']] as const;
  for(const [query,result_type] of cases){rows=[{...address,name:query,result_type}];const result=await client.callTool({name:'resolve_location',arguments:{query}});assert.equal(result.isError,undefined);const data=(result.structuredContent as {data:unknown}).data as {needs_confirmation:boolean;candidates:object[]};assert.equal(data.needs_confirmation,true);assert.equal(data.candidates.length,1);}
  // Geometry fixtures cover all 22 cities, including offshore islands. Not live geocoder accuracy evidence.
  for(const cityId of new Set(regions.map(r=>r.cityId))){const region=regions.find(r=>r.cityId===cityId)!;const [lon,lat]=region.polygons[0][0][0];rows=[{...address,name:cityId,lat,lon}];const result=await client.callTool({name:'resolve_location',arguments:{query:cityId,city_hint:'基隆市'}});assert.equal(result.isError,undefined);assert(((result.structuredContent as {data:unknown}).data as {candidates:{city_id:string}[]}).candidates.some(c=>c.city_id===cityId));}
  rows=[{...address,name:'臺北車站',lat:25.0478,lon:121.517,result_type:'amenity'}];const taipei=await client.callTool({name:'resolve_location',arguments:{query:'臺北車站',city_hint:'基隆市'}});assert.equal(taipei.isError,undefined);assert(((taipei.structuredContent as {data:unknown}).data as {candidates:{city_id:string}[]}).candidates.some(c=>c.city_id==='TW-TPE'));
  rows=[address,{...address,name:'第二候選',lat:25.128,lon:121.741},address,{...address,country_code:'us'},{...address,lat:100}];const ambiguous=await client.callTool({name:'resolve_location',arguments:{query:'中正路'}});assert.equal(((ambiguous.structuredContent as {data:unknown}).data as {status:string}).status,'ambiguous');assert.equal(((ambiguous.structuredContent as {data:unknown}).data as {candidates:object[]}).candidates.length,2);
  rows=[];assert.equal((((await client.callTool({name:'resolve_location',arguments:{query:'找不到的地點'}})).structuredContent as {data:{status:string}}).data.status),'not_found');
  rows=[address];
  for(const [name,args] of [['resolve_location',{lat:address.lat,lng:address.lon}],['search_nearby_reports',{lat:address.lat,lng:address.lon,radius_m:500}],['get_report',{report_id:reportId,include_observations:true}]] as const){const result=await client.callTool({name,arguments:args});assert.equal(result.isError,undefined);assert(!JSON.stringify(result).includes('PRIVATE_'));}
  for(const name of ['create_report','add_observation'])await assert.rejects(client.callTool({name,arguments:{confirmed:true}}));
 }finally{await client.close();}
 const before=upstream,costs=order.filter(x=>x==='geocode').length;
 for(const input of [{query:'x'},{query:'x'.repeat(201)},{query:'基隆',lat:25,lng:121},{query:'基隆',lat:91},{query:'基隆',unexpected:true}])assert.equal((await call(run,input)).result.structuredContent.error.code,'INVALID_INPUT');
 assert.equal(upstream,before);assert.equal(order.filter(x=>x==='geocode').length,costs);
 quota='deny';const denied=await call(run,{query:'基隆車站'});assert.equal(denied.result.structuredContent.error.code,'RATE_LIMITED');assert.equal(denied.response.headers.get('Retry-After'),'60');assert.equal(upstream,before);
 const deniedAgain=await call(endpoint(),{query:'基隆車站'});assert.equal(deniedAgain.result.structuredContent.error.code,'RATE_LIMITED');assert.equal(upstream,before); // Another endpoint shares authoritative control decisions.
 quota='off';assert.equal((await run(request('tools/list',{}))).status,503);assert.equal(upstream,before);quota='allow';
 for(const failure of [401,429,500,503,'throw'] as const){mode=failure;const count:number=upstream;const result=await call(run,{query:'基隆車站'});assert.equal(result.result.structuredContent.error.code,'LOCATION_SEARCH_UNAVAILABLE');assert.equal(upstream,count+1,'one attempt, no retries');assert(!JSON.stringify(result.result).includes('PRIVATE_'));assert.equal(active,0);}
 mode=200;
 for(const overrides of [{MCP_PUBLIC_PRODUCTION_GEOCODING_ENABLED:'false'},{MCP_PUBLIC_PRODUCTION_GEOAPIFY_API_KEY:''},{MCP_PUBLIC_PRODUCTION_GEOAPIFY_API_KEY:'   '},{MCP_PUBLIC_PRODUCTION_GEOAPIFY_API_KEY:base.GEOAPIFY_API_KEY},{MCP_PUBLIC_PRODUCTION_GEOAPIFY_API_KEY:'',MCP_PUBLIC_GEOAPIFY_API_KEY:'preview-fixture'},{MCP_PUBLIC_GEOAPIFY_API_KEY:base.MCP_PUBLIC_PRODUCTION_GEOAPIFY_API_KEY}]){
  process.env={...base,...overrides,GEOAPIFY_LOCATION_ENABLED:'true'};const disabled=endpoint(),count:number=upstream;assert.equal((await call(disabled,{query:'基隆車站'})).result.structuredContent.error.code,'LOCATION_SEARCH_UNAVAILABLE');assert.equal(upstream,count);assert.equal((await call(disabled,{lat:address.lat,lng:address.lon})).result.structuredContent.ok,true);const list=await(await disabled(request('tools/list',{}))).text();assert(list.includes('暫停'));
 }
 process.env={...base};
 // Per-request backend clones must retain the dedicated provider and abort propagation.
 const env=publicEnvironment()!,background:Promise<void>[]=[];
 const timed=publicMcpEndpoint(env.service,{...env.settings,timeoutMs:20,waitUntil:p=>background.push(p),observe:e=>observed.push(e)});
 mode='stall';let count:number=upstream;assert.equal((await timed(request('tools/call',{name:'resolve_location',arguments:{query:'基隆車站'}}))).status,503);await Promise.all(background);assert.equal(upstream,count+1);assert.equal(aborts,1);assert.equal(active,0);
 // Direct provider timeout is bounded at 5 seconds, independent of MCP's 25-second deadline.
 const timeoutStart=Date.now();await assert.rejects(call(run,{query:'基隆車站'}).then(x=>{assert.equal(x.result.structuredContent.error.code,'LOCATION_SEARCH_UNAVAILABLE');throw Error('bounded timeout complete');}),{message:'bounded timeout complete'});assert(Date.now()-timeoutStart<8000);assert.equal(aborts,2);assert.equal(active,0);
 const abort=new AbortController();abort.abort();count=upstream;await run(request('tools/call',{name:'resolve_location',arguments:{query:'基隆車站'}},abort.signal));assert.equal(upstream,count);
 // Even an explicitly injected provider cannot execute when the public feature gate is absent.
 const injected=new RoadTagService(env.service.backend,origin,'',createGeoapifyProvider('public-fixture-only'));
 const off=publicMcpEndpoint(injected,{...env.settings,geocoding:false,observe:()=>{}});assert.equal((await call(off,{query:'基隆車站'})).result.structuredContent.error.code,'LOCATION_SEARCH_UNAVAILABLE');assert.equal(upstream,count);
 assert.equal(active,0);assert(!JSON.stringify(observed).includes('PRIVATE_'));assert(!JSON.stringify(observed).includes('apiKey'));assert(!JSON.stringify(observed).includes('基隆'));
 console.log('PASS Public geocoding: SDK 3 tools; address/POI/shop/lane/22-city fixtures; confirmation/dedup; Alpha and environment isolation; quota before I/O; denied quota/kill switch; one-attempt 401/429/5xx; abort/deadline/5s provider timeout; lease release; data privacy. Live external calls: 0.');
}finally{process.env=saved;globalThis.fetch=realFetch;}
