// Secret-free staging-only discovery and fail-closed smoke; no business writes.
import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
const origin='https://keelung-accessible-map-git-feat-6bfac3-masons-projects-2c78a251.vercel.app';
const metadata=await fetch(origin+'/api/mcp-oauth-resource');assert.equal(metadata.status,200);const m=await metadata.json();assert.equal(m.resource,origin+'/api/mcp-chatgpt');assert.deepEqual(m.authorization_servers,['https://wpravdqviylkcpsioybu.supabase.co/auth/v1']);
const client=new Client({name:'phase1c1-staging-smoke',version:'1'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
await client.connect(new StreamableHTTPClientTransport(new URL(origin+'/api/mcp-chatgpt')));
const list=await client.listTools();assert.deepEqual(list.tools.map(t=>t.name).sort(),['add_observation','create_report','get_report','resolve_location','search_nearby_reports']);for(const tool of list.tools)assert.deepEqual(tool._meta?.securitySchemes,[{type:'oauth2',scopes:['openid']}]);await client.close();
const anon=await fetch(origin+'/api/mcp-chatgpt',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'resolve_location',arguments:{lat:25.13,lng:121.74}}})});assert.equal(anon.status,401);assert(anon.headers.get('www-authenticate')?.includes('Road Tag OAuth authentication required'));
for(const path of ['/api/mcp','/api/mcp-photo'])assert.equal((await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
console.log(JSON.stringify({status:'PASS',officialClient:'initialize/list',tools:list.tools.map(t=>t.name),anonymousCall:401,legacyMcp:503,legacyPhoto:503,issuer:'staging',businessWrites:0}));
