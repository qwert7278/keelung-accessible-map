import {createGeoapifyProvider} from '../server/location/geoapify.js';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {LocalBackend} from '../scripts/mcp-local-backend.js';
import {hash,RoadTagService} from '../server/roadtag/service.js';
import {publicMcpEndpoint} from '../server/mcp/public.js';
import {publicRisk,PublicControlClient,type ControlDecision,type PublicEvent} from '../server/mcp/public-controls.js';
const local=await LocalBackend.open(await mkdtemp(join(tmpdir(),'roadtag-controls-')),'https://test.example');
const gate=randomBytes(32).toString('hex'),risk=hash('test-network'),other=hash('other-network');
const call=async(kind:string,r=risk,lease:string|null=null,secret=gate)=>local.db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query("select set_config('request.headers',$1,true)",[JSON.stringify({'x-roadtag-control-key':secret})]);return (await tx.query<{r:ControlDecision}>('select public.mcp_public_acquire($1,$2,$3) as r',[r,kind,lease])).rows[0].r;});
const release=async(lease:string,r=risk)=>local.db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query("select set_config('request.headers',$1,true)",[JSON.stringify({'x-roadtag-control-key':gate})]);await tx.query('select public.mcp_public_release($1,$2)',[r,lease]);});
try{
 assert.equal((await local.db.query<{allowed:boolean}>("select has_schema_privilege('anon','private','USAGE') as allowed")).rows[0].allowed,false,'Anonymous callers must not gain private schema access');
 await local.db.exec('create function private.p2a_future_probe() returns integer language sql as $$select 1$$; create function mcp_public_quota.p2a_future_probe() returns integer language sql as $$select 1$$;');
 for(const schema of ['private','mcp_public_quota']){
  assert.equal((await local.db.query<{allowed:boolean}>('select has_schema_privilege($1,$2,$3) as allowed',['anon',schema,'USAGE'])).rows[0].allowed,false);
  await assert.rejects(local.db.transaction(async tx=>{await tx.exec('set local role anon');await tx.exec('select '+schema+'.p2a_future_probe()');}));
 }
 // Even an explicit future PUBLIC grant cannot bypass the private namespace gate.
 await local.db.exec('grant execute on function private.p2a_future_probe() to public; create table private.p2a_future_business(id integer); grant select on private.p2a_future_business to public;');
 for(const sql of ['select private.p2a_future_probe()','select * from private.p2a_future_business'])await assert.rejects(local.db.transaction(async tx=>{await tx.exec('set local role anon');await tx.exec(sql);}));
 await local.db.exec('revoke execute on function private.p2a_future_probe(),mcp_public_quota.p2a_future_probe() from public');
 assert.equal((await local.db.query<{allowed:boolean}>("select has_schema_privilege('anon','mcp_public_quota','CREATE') as allowed")).rows[0].allowed,false);
 assert.equal((await call('request')).code,'SERVICE_UNAVAILABLE');
 await local.db.query('update private.mcp_public_control set enabled=true,gate_hash=$1',[hash(gate)]);
 assert.equal((await call('request',risk,null,'x'.repeat(64))).code,'SERVICE_UNAVAILABLE');
 await assert.rejects(call('admin'));await assert.rejects(call('request','raw-IP'));
 const a=await call('request');assert(a.allowed&&a.lease);assert.equal((await call('geocode',other,a.lease)).allowed,false);assert.equal((await call('geocode',risk,randomUUID())).allowed,false);
 await local.db.exec('update private.mcp_public_control set geocode_ip_minute=1');
 assert.equal((await call('geocode',risk,a.lease)).allowed,true);assert.equal((await call('geocode',risk,a.lease)).code,'RATE_LIMITED');
 await release(a.lease,other);assert.equal((await local.db.query('select * from private.mcp_public_leases')).rows.length,1);await release(a.lease);await release(a.lease);
 await local.db.exec('delete from private.mcp_public_counters; update private.mcp_public_control set request_ip_minute=2');
 const burst=await Promise.all(Array.from({length:6},()=>call('request')));assert.equal(burst.filter(r=>r.allowed).length,2);assert(burst.filter(r=>!r.allowed).every(r=>r.code==='RATE_LIMITED'));
 await local.db.exec('delete from private.mcp_public_counters; delete from private.mcp_public_leases; update private.mcp_public_control set request_ip_minute=60,request_global_minute=2');
 const global=await Promise.all([call('request',hash('one')),call('request',hash('two')),call('request',hash('three'))]);assert.equal(global.filter(r=>r.allowed).length,2);
 await local.db.exec('delete from private.mcp_public_counters; delete from private.mcp_public_leases; update private.mcp_public_control set request_global_minute=600,request_global_day=1');
 assert((await call('request')).allowed);assert.equal((await call('request',other)).code,'RATE_LIMITED');
 await local.db.exec('delete from private.mcp_public_counters; delete from private.mcp_public_leases; update private.mcp_public_control set request_global_day=5000,concurrent_ip=1');
 const live=await call('request');assert(live.allowed&&live.lease);assert.equal((await call('request')).code,'RATE_LIMITED');
 await local.db.exec("update private.mcp_public_leases set expires_at=clock_timestamp()-interval '1 second'");assert((await call('request')).allowed);
 await local.db.exec('update private.mcp_public_control set enabled=false');assert.equal((await call('request',other)).code,'SERVICE_UNAVAILABLE');
 await local.db.exec('delete from private.mcp_public_counters; delete from private.mcp_public_leases; update private.mcp_public_control set enabled=true,concurrent_global=1');
 const globalLease=await call('request');assert(globalLease.allowed);assert.equal((await call('request',other)).code,'RATE_LIMITED');
 await local.db.exec('delete from private.mcp_public_counters; delete from private.mcp_public_leases; update private.mcp_public_control set concurrent_ip=4,concurrent_global=16,geocode_ip_minute=5,geocode_global_minute=1,geocode_global_day=200,geocode_ip_day=20');
 const costA=await call('request'),costB=await call('request',other);assert(costA.lease&&costB.lease);assert((await call('geocode',risk,costA.lease)).allowed);assert.equal((await call('geocode',other,costB.lease)).code,'RATE_LIMITED');
 await local.db.exec('delete from private.mcp_public_counters; update private.mcp_public_control set geocode_global_minute=40,geocode_global_day=1');
 assert((await call('geocode',risk,costA.lease)).allowed);assert.equal((await call('geocode',other,costB.lease)).code,'RATE_LIMITED');
 await local.db.exec('delete from private.mcp_public_counters; update private.mcp_public_control set geocode_global_day=200,geocode_ip_day=1');
 assert((await call('geocode',risk,costA.lease)).allowed);assert.equal((await call('geocode',risk,costA.lease)).code,'RATE_LIMITED');
 for(const sql of ['select * from private.mcp_public_control','update private.mcp_public_control set enabled=true','select * from private.mcp_public_counters','select * from private.mcp_public_leases'])await assert.rejects(local.db.transaction(async tx=>{await tx.exec('set local role anon');await tx.exec(sql);}));
 const callable=(await local.db.query<{name:string}>("select p.proname as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and has_function_privilege('anon',p.oid,'EXECUTE') order by p.proname")).rows.map(r=>r.name);assert.deepEqual(callable,[]);
 const raw=new Request('https://test.example',{headers:{'x-forwarded-for':'203.0.113.77','x-real-ip':'203.0.113.88'}});
 assert.equal(publicRisk(raw,gate,false),publicRisk(new Request('https://test.example'),gate,false));assert(!publicRisk(raw,gate,true).includes('203.0.113'));assert.notEqual(publicRisk(raw,gate,true,0),publicRisk(raw,gate,true,86400000));
 const realFetch=globalThis.fetch;
 await local.db.exec('delete from private.mcp_public_counters; delete from private.mcp_public_leases; update private.mcp_public_control set request_ip_minute=1');
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input)),body=JSON.parse(String(init?.body)),headers=new Headers(init?.headers);assert.equal(headers.get('apikey'),'sb_publishable_test');assert(!headers.has('authorization'));assert.equal(init?.redirect,'error');
  assert.equal(headers.get('x-roadtag-control-key'),gate);assert(!String(init?.body).includes(gate));
  if(url.pathname.endsWith('/mcp_public_acquire'))return Response.json(await call(body.p_kind,body.p_risk,body.p_lease,headers.get('x-roadtag-control-key')!));
  await release(body.p_lease,body.p_risk);return new Response(null,{status:204});
 };
 try{
  const first=new PublicControlClient('https://staging.supabase.co','sb_publishable_test',gate),second=new PublicControlClient('https://staging.supabase.co','sb_publishable_test',gate);
  const one=await first.acquire(risk,'request');assert(one.lease);assert.equal((await second.acquire(risk,'request')).code,'RATE_LIMITED');await first.release(risk,one.lease);assert.equal((await new PublicControlClient('https://staging.supabase.co','sb_publishable_test',gate).acquire(risk,'request')).code,'RATE_LIMITED');
 }finally{globalThis.fetch=realFetch;}
 globalThis.fetch=async()=>{throw new Error('SECRET_BACKEND_FAILURE');};
 try{const client=new PublicControlClient('https://staging.supabase.co','sb_publishable_test',gate);await assert.rejects(client.acquire(risk,'request'),{message:'SERVICE_UNAVAILABLE'});}finally{globalThis.fetch=realFetch;}
 let reads=0,acquires=0;const events:PublicEvent[]=[];
 const service=new RoadTagService({feed:async()=>{reads++;return [];},observations:async()=>[],rpc:async()=>{throw Error('UNEXPECTED_WRITE');},put:async()=>{throw Error('UNEXPECTED_WRITE');},bytes:async()=>new Uint8Array(),photoUrl:()=>''},'https://test.example','');
 const req=()=>new Request('https://test.example/api/mcp-public',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_report',arguments:{report_id:randomUUID()}}})});
 const denied=publicMcpEndpoint(service,{enabled:true,origin:'https://test.example',riskSecret:gate,controls:{acquire:async()=>{acquires++;return {allowed:false,code:'RATE_LIMITED',retry_after:60};},release:async()=>{}},observe:e=>events.push(e)});
 const response=await denied(req());assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');assert.equal(reads,0);assert.equal(acquires,1);
 const unavailable=publicMcpEndpoint(service,{enabled:true,origin:'https://test.example',riskSecret:gate,controls:{acquire:async()=>{throw Error('SECRET_OUTAGE');},release:async()=>{}},observe:e=>events.push(e)});assert.equal((await unavailable(req())).status,503);assert.equal(reads,0);
 assert.equal((await publicMcpEndpoint(service,{enabled:true,origin:'https://test.example'})(req())).status,503);
 let slowComplete=false;
 const slow=new RoadTagService({...service.backend,feed:async()=>{slowComplete=false;await new Promise(resolve=>setTimeout(resolve,50));slowComplete=true;return [];}},service.origin,'');
 let releaseBeforeComplete=false,released=false;
 const held=publicMcpEndpoint(slow,{enabled:true,origin:service.origin,riskSecret:gate,controls:{acquire:async()=>({allowed:true,lease:randomUUID()}),release:async()=>{released=true;releaseBeforeComplete=!slowComplete;}},observe:e=>events.push(e)});
 assert.equal((await held(req())).status,200);assert(released&&!releaseBeforeComplete,'SSE headers must not release an executing tool lease');
 const timed=publicMcpEndpoint(slow,{enabled:true,origin:service.origin,riskSecret:gate,timeoutMs:10,controls:{acquire:async()=>({allowed:true,lease:randomUUID()}),release:async()=>{}},observe:e=>events.push(e)});assert.equal((await timed(req())).status,503);
 const env={...process.env};let upstream=0;
 try{
  process.env.GEOAPIFY_LOCATION_ENABLED='true';process.env.GEOAPIFY_API_KEY='isolated-provider-fixture';globalThis.fetch=async()=>{upstream++;throw Error('unexpected upstream');};
  const costBlocked=publicMcpEndpoint(new RoadTagService(service.backend,service.origin,'',createGeoapifyProvider('isolated-provider-fixture')),{geocoding:true,enabled:true,origin:service.origin,riskSecret:gate,controls:{acquire:async(_risk,kind)=>kind==='request'?{allowed:true,lease:randomUUID()}:{allowed:false,code:'RATE_LIMITED',retry_after:60},release:async()=>{}},observe:e=>events.push(e)});
  const geoReq=new Request(service.origin+'/api/mcp-public',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'resolve_location',arguments:{query:'PRIVATE_QUERY_MARKER'}}})});
  const costResponse=await costBlocked(geoReq);assert((await costResponse.text()).includes('RATE_LIMITED'));assert.equal(upstream,0);
 }finally{globalThis.fetch=realFetch;process.env=env;}
 assert(!JSON.stringify(events).includes(gate)&&!JSON.stringify(events).includes('SECRET')&&!JSON.stringify(events).includes('203.0.113')&&!JSON.stringify(events).includes('PRIVATE_QUERY_MARKER'));
 assert(events.some(e=>e.outcome==='RATE_LIMITED')&&events.some(e=>e.outcome==='TIMEOUT'));
 await local.db.exec('delete from private.mcp_public_control');assert.equal((await call('request')).code,'SERVICE_UNAVAILABLE');
 console.log('PASS P2A-02 isolated SQL quotas, leases, gate/kill switch, fail-closed HTTP, privacy, timeout. No hosted contention or provider billing claim.');
}finally{await local.db.close();}
