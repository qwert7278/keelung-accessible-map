import assert from 'node:assert/strict';
import {publicEnvironment,publicMcpEndpoint} from '../server/mcp/public.js';
import {RoadTagService} from '../server/roadtag/service.js';
const saved={...process.env};
const prod='https://roadtag.org',db='https://ifcicahnrpkwjcxmnmug.supabase.co';
try{
 for(const name of Object.keys(process.env))if(name.startsWith('MCP_PUBLIC_'))delete process.env[name];
 process.env.VERCEL='1';process.env.VERCEL_ENV='production';
 Object.assign(process.env,{MCP_PUBLIC_PRODUCTION_READ_ENABLED:'true',MCP_PUBLIC_PRODUCTION_READ_ORIGIN:prod,MCP_PUBLIC_PRODUCTION_READ_SUPABASE_URL:db,MCP_PUBLIC_PRODUCTION_READ_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',MCP_PUBLIC_PRODUCTION_CONTROL_SECRET:'production-fixture-independent-'.repeat(2)});
 assert(publicEnvironment(),'Explicit independent Production settings must be supported');
 const valid={...process.env};
 for(const [key,values] of Object.entries({VERCEL:['0',''],VERCEL_ENV:['preview','development',''],MCP_PUBLIC_PRODUCTION_READ_ENABLED:['false',''],MCP_PUBLIC_PRODUCTION_READ_ORIGIN:['https://www.roadtag.org',prod+'/path',prod+'?x=1',prod+'#x','https://evil.example','http://roadtag.org'],MCP_PUBLIC_PRODUCTION_READ_SUPABASE_URL:['https://wpravdqviylkcpsioybu.supabase.co',db+'/path',db+'?x=1',db+'.evil.example'],MCP_PUBLIC_PRODUCTION_READ_SUPABASE_PUBLISHABLE_KEY:['sb_secret_fixture',''],MCP_PUBLIC_PRODUCTION_CONTROL_SECRET:['short','']})){
  for(const value of values){process.env={...valid,[key]:value};assert.equal(publicEnvironment(),null,'Reject invalid '+key);}
 }
 for(const name of ['MCP_PUBLIC_CONTROL_SECRET','MCP_PHOTO_SECRET','UPLOAD_GATE_SECRET','SUPABASE_SERVICE_ROLE_KEY','MCP_SUPABASE_SERVICE_KEY','MCP_SESSION_ENCRYPTION_KEY']){process.env={...valid,[name]:valid.MCP_PUBLIC_PRODUCTION_CONTROL_SECRET};assert.equal(publicEnvironment(),null,'Never reuse '+name);}
 process.env={...valid,MCP_PUBLIC_READ_ENABLED:'true',MCP_PUBLIC_READ_SUPABASE_URL:'https://wpravdqviylkcpsioybu.supabase.co'};assert(publicEnvironment(),'Preview settings must not replace Production settings');
 delete process.env.MCP_PUBLIC_PRODUCTION_CONTROL_SECRET;assert.equal(publicEnvironment(),null,'No fallback to staging gate');
 process.env={...valid};const configured=publicEnvironment()!;assert.equal(configured.service.origin,prod);
 Object.assign(process.env,{GEOAPIFY_LOCATION_ENABLED:'true',GEOAPIFY_API_KEY:'private-alpha-provider-fixture'});
 const realFetch=globalThis.fetch;let providerCalls=0;globalThis.fetch=async()=>{providerCalls++;throw Error('Unexpected provider');};
 let reads=0;const service=new RoadTagService({feed:async()=>{reads++;return [];},observations:async()=>[],rpc:async()=>{throw Error('Write');},put:async()=>{throw Error('Write');},bytes:async()=>new Uint8Array(),photoUrl:()=>''},prod,'');
 const endpoint=publicMcpEndpoint(service,{...configured.settings,observe:()=>{},controls:{acquire:async()=>({allowed:true,lease:'00000000-0000-4000-8000-000000000001'}),release:async()=>{}}});
 const request=(method:string,params:object,headers:Record<string,string>={})=>new Request(prod+'/api/mcp-public',{method:'POST',headers:{Accept:'application/json, text/event-stream','Content-Type':'application/json',...headers},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
 try{
  const denied=await endpoint(request('tools/list',{}, {host:'evil.example'}));assert.equal(denied.status,403);assert.equal(reads,0);
  for(const host of ['ROADTAG.ORG','roadtag.org:443'])assert.equal((await endpoint(request('tools/list',{}, {host}))).status,200,'Accept equivalent canonical HTTPS Host');
  assert.equal((await endpoint(request('tools/list',{}, {Origin:'https://evil.example'}))).status,403);
  const listing=await (await endpoint(request('tools/list',{}))).text();assert(listing.includes('座標'));assert(listing.includes('暫停'));assert(!listing.includes('create_report'));assert(!listing.includes('add_observation'));
  const result=await (await endpoint(request('tools/call',{name:'resolve_location',arguments:{query:'基隆車站'}}))).text();assert(result.includes('LOCATION_SEARCH_UNAVAILABLE'));assert.equal(providerCalls,0);
 }finally{globalThis.fetch=realFetch;}
 console.log('PASS Production config/environment/source/gate isolation, Host/Origin rejection, coordinate-only descriptor and no inherited paid provider. Local fixtures only.');
}finally{process.env=saved;}
