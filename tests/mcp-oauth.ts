import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {generateKeyPair,SignJWT,createLocalJWKSet,exportJWK} from 'jose';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {oauthEndpoint,oauthEnvironment,verifyOAuth,resourceMetadata,type OAuthConfig} from '../server/mcp/oauth.js';
import {SupabaseBackend} from '../server/roadtag/supabase.js';
import {LocalBackend} from '../scripts/mcp-local-backend.js';
const actor=randomUUID(),clientId=randomUUID(),p={id:'oauth-test',actor,write:true};
const c:OAuthConfig={origin:'https://oauth-test.vercel.app',resource:'https://oauth-test.vercel.app/api/mcp-chatgpt',issuer:'https://wpravdqviylkcpsioybu.supabase.co/auth/v1',serviceKey:'sb_secret_test',publishable:'sb_publishable_test',sessionKey:randomBytes(32).toString('hex'),photoSecret:randomBytes(32).toString('base64url'),principals:[p],clients:[clientId]};
const passed:string[]=[];const ok=(s:string)=>{passed.push(s);console.log('PASS '+s);};
const env={...process.env};
try{
 Object.assign(process.env,{VERCEL_ENV:'preview',MCP_ENABLED:'true',MCP_OAUTH_ENABLED:'true',MCP_SUPABASE_URL:c.issuer.replace('/auth/v1',''),MCP_PUBLIC_ORIGIN:c.origin,MCP_SUPABASE_SERVICE_KEY:c.serviceKey,MCP_SUPABASE_PUBLISHABLE_KEY:c.publishable,MCP_SESSION_ENCRYPTION_KEY:c.sessionKey,MCP_PHOTO_SECRET:c.photoSecret,MCP_OAUTH_PRINCIPALS_JSON:JSON.stringify([p]),MCP_OAUTH_CLIENTS_JSON:JSON.stringify(c.clients)});
 assert(oauthEnvironment());for(const bad of ['production','development']){process.env.VERCEL_ENV=bad;assert.equal(oauthEnvironment(),null);}process.env.VERCEL_ENV='preview';process.env.MCP_SUPABASE_URL='https://production.supabase.co';assert.equal(oauthEnvironment(),null);ok('OAuth config only permits enabled staging Preview');
}finally{process.env=env;}
for(const alg of ['ES256','RS256']){
 const keys=await generateKeyPair(alg),jwk=await exportJWK(keys.publicKey);jwk.alg=alg;jwk.kid=alg;const getKey=createLocalJWKSet({keys:[jwk]});
 const claims={sub:actor,iss:c.issuer,aud:'authenticated',exp:Math.floor(Date.now()/1000)+600,iat:Math.floor(Date.now()/1000),client_id:clientId,resource:c.resource,role:'authenticated',is_anonymous:false};
 const sign=(changes:Record<string,unknown>={})=>new SignJWT({...claims,...changes}).setProtectedHeader({alg,kid:alg}).sign(keys.privateKey);
 assert.equal((await verifyOAuth(await sign(),c,getKey)).principal.actor,actor);
 for(const bad of [{iss:'https://attacker.example'},{aud:'another-api'},{resource:c.origin+'/other'},{exp:1},{nbf:Math.floor(Date.now()/1000)+600},{sub:randomUUID()},{client_id:randomUUID()},{role:'anon'},{is_anonymous:true},{client_id:undefined},{resource:undefined}])await assert.rejects(verifyOAuth(await sign(bad),c,getKey));
 const wrong=await generateKeyPair(alg);await assert.rejects(verifyOAuth(await new SignJWT(claims).setProtectedHeader({alg,kid:alg}).sign(wrong.privateKey),c,getKey));
}ok('ES256/RS256: signature issuer audience resource expiry nbf subject client and role fail closed');
const endpoint=oauthEndpoint(c),request=(body:unknown)=>new Request(c.resource,{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify(body)});
const denied=await endpoint(request({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'resolve_location',arguments:{lat:25,lng:121}}}));assert.equal(denied.status,401);assert(denied.headers.get('www-authenticate')?.includes('resource_metadata'));assert.equal(resourceMetadata(c).resource,c.resource);ok('anonymous tool call rejected with OAuth challenge before any domain I/O');
const mcp=new Client({name:'oauth-test',version:'1'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
await mcp.connect(new StreamableHTTPClientTransport(new URL(c.resource),{fetch:async(input,init)=>endpoint(new Request(input,init))}));
const list=await mcp.listTools();assert.deepEqual(list.tools.map(t=>t.name).sort(),['add_observation','create_report','get_report','resolve_location','search_nearby_reports']);
for(const tool of list.tools){assert.deepEqual(tool._meta?.securitySchemes,[{type:'oauth2',scopes:['openid']}]);}await mcp.close();ok('official MCP client initialize/list exposes exactly five OAuth tools without credentials');
const fetchBefore=globalThis.fetch;let requests=0;
try{
 globalThis.fetch=async(_input,init)=>{requests++;const headers=new Headers(init?.headers);assert.equal(headers.get('apikey'),c.publishable);assert.equal(headers.get('authorization'),'Bearer incoming-oauth');return new Response(null,{status:200});};
 const backend=new SupabaseBackend(c.issuer.replace('/auth/v1',''),c.serviceKey,c.publishable,c.sessionKey,{actor,token:'incoming-oauth'});backend.sessions.access=async()=>{throw new Error('alpha sessions must never be accessed');};
 await backend.put(actor+'/photo.jpg',new Uint8Array([1]),'image/jpeg',p);await assert.rejects(backend.put('other',new Uint8Array([1]),'image/jpeg',{...p,actor:randomUUID()}));assert.equal(requests,1);
 globalThis.fetch=async()=>{requests++;return new Response(null,{status:403});};await assert.rejects(backend.put('photo',new Uint8Array([1]),'image/jpeg',p));assert.equal(requests,2);ok('Storage uses incoming OAuth JWT plus publishable key; no alpha session, actor swap, or service fallback');
}finally{globalThis.fetch=fetchBefore;}
await mkdir('output',{recursive:true});const root=await mkdtemp(resolve('output/mcp-oauth-test-')),local=await LocalBackend.open(root,c.origin);
try{
 await local.register(p);await local.db.query('insert into private.mcp_oauth_clients(client_id,resource,enabled) values($1,$2,true)',[clientId,c.resource]);assert.equal((await local.db.query<{result:{actor:string}}>('select public.mcp_oauth_actor($1,$2,$3,$4) result',[p.id,actor,clientId,c.resource])).rows[0].result.actor,actor);
 await assert.rejects(local.db.query('select public.mcp_oauth_actor($1,$2,$3,$4)',[p.id,randomUUID(),clientId,c.resource]));
 const event={claims:{sub:actor,client_id:clientId,aud:'authenticated',is_anonymous:false,resource:'attacker-provided'}};
 const hook=async(e:unknown)=>(await local.db.query<{result:{claims:Record<string,unknown>}}>('select public.mcp_oauth_access_token_hook($1::jsonb) result',[JSON.stringify(e)])).rows[0].result.claims;
 assert.equal((await hook(event)).resource,c.resource);assert.equal((await hook(event)).aud,'authenticated');
 assert.equal((await hook({claims:{...event.claims,client_id:randomUUID()}})).resource,undefined);
 await local.db.query('update private.mcp_oauth_clients set enabled=false where client_id=$1',[clientId]);assert.equal((await hook(event)).resource,undefined);await assert.rejects(local.db.query('select public.mcp_oauth_actor($1,$2,$3,$4)',[p.id,actor,clientId,c.resource]));await local.db.query('update private.mcp_oauth_clients set enabled=true where client_id=$1',[clientId]);
 await local.db.query('update private.mcp_principals set enabled=false where principal=$1',[p.id]);assert.equal((await hook(event)).resource,undefined);await assert.rejects(local.db.query('select public.mcp_oauth_actor($1,$2,$3,$4)',[p.id,actor,clientId,c.resource]));
 await local.db.exec('set role authenticated');await assert.rejects(local.db.exec('select * from private.mcp_oauth_clients'));await assert.rejects(local.db.exec("select public.mcp_oauth_access_token_hook('{}'::jsonb)"));await local.db.exec('reset role');
 assert.equal((await local.db.query<{n:number}>('select count(*)::int n from private.mcp_actor_sessions')).rows[0].n,0);ok('SQL hook resource binding, revoked actor/client, least privilege and zero private alpha sessions');
}finally{await local.db.close();}
console.log(JSON.stringify({status:'PASS',checks:passed.length,hostedOAuth:'PENDING',chatgpt:'PENDING',fileParams:'PENDING'}));
