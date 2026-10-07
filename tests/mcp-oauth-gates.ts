// All Production tuples/tokens here are synthetic and all HTTP is mocked. No Production I/O.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {generateKeyPair,SignJWT,createLocalJWKSet,exportJWK} from 'jose';
import {oauthEnvironment,verifyOAuth,oauthBackend} from '../server/mcp/oauth.js';
import {environment} from '../server/mcp/config.js';
import {POST as legacyMcp} from '../api/mcp.js';
import {POST as legacyPhoto} from '../api/mcp-photo.js';
import {oauthTuple,consentEnvironment,consentRedirect,STAGING_SUPABASE,PRODUCTION_SUPABASE} from '../src/utils/mcp-oauth-environment.js';
import {LocalBackend} from '../scripts/mcp-local-backend.js';
const actor=randomUUID(),client=randomUUID(),principal={id:'gates-test',actor,write:true};
const preview='https://gates-test.vercel.app',production='https://roadtag.org';
const originalEnv={...process.env};
const base={MCP_ENABLED:'true',MCP_OAUTH_ENABLED:'true',MCP_SUPABASE_SERVICE_KEY:'sb_secret_synthetic-test',MCP_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic-test',MCP_SESSION_ENCRYPTION_KEY:randomBytes(32).toString('hex'),MCP_PHOTO_SECRET:randomBytes(32).toString('base64url'),MCP_OAUTH_PRINCIPALS_JSON:JSON.stringify([principal]),MCP_OAUTH_CLIENTS_JSON:JSON.stringify([client]),MCP_PRINCIPALS_JSON:JSON.stringify([{...principal,credentialHash:'a'.repeat(64)}])};
const configs=[];
try{
 for(const [env,origin,url] of [['preview',preview,STAGING_SUPABASE],['production',production,PRODUCTION_SUPABASE]]){
  process.env={...originalEnv,...base,VERCEL_ENV:env,MCP_PUBLIC_ORIGIN:origin,MCP_SUPABASE_URL:url};delete process.env.MCP_LEGACY_ALPHA_ENABLED;
  const c=oauthEnvironment();assert(c);configs.push(c);assert.equal(c.supabaseUrl,url);assert.equal(c.issuer,url+'/auth/v1');assert.equal(c.resource,origin+'/api/mcp-chatgpt');
  assert.equal(environment(),null);
  assert.equal((await legacyMcp(new Request(origin+'/api/mcp',{method:'POST'}))).status,503);
  assert.equal((await legacyPhoto(new Request(origin+'/api/mcp-photo',{method:'POST'}))).status,503);
  process.env.MCP_LEGACY_ALPHA_ENABLED='true';assert.equal(Boolean(environment()),env==='preview');
  for(const flag of ['MCP_ENABLED','MCP_OAUTH_ENABLED']){delete process.env[flag];assert.equal(oauthEnvironment(),null);process.env[flag]='false';assert.equal(oauthEnvironment(),null);process.env[flag]='true';}
  const malformed=['http://roadtag.org','https://www.roadtag.org','https://roadtag.org.evil.example','https://roadtag.org:443','https://roadtag.org:8443',origin+'/',origin+'/wrong',origin+'?x=1',origin+'#x','https://user@'+origin.slice(8),'https://evil.example','https://-bad.vercel.app','https://bad_.vercel.app','https://vercel.app','https://x.vercel.app:443'];
  for(const badOrigin of malformed){process.env.MCP_PUBLIC_ORIGIN=badOrigin;assert.equal(oauthEnvironment(),null);}process.env.MCP_PUBLIC_ORIGIN=origin;
  for(const badDb of [url+'/',url+'?x=1',url+'#x',url.replace('https:','http:'),url.replace('.co','.co.evil.example'),env==='production'?STAGING_SUPABASE:PRODUCTION_SUPABASE]){process.env.MCP_SUPABASE_URL=badDb;assert.equal(oauthEnvironment(),null);}process.env.MCP_SUPABASE_URL=url;
  process.env.VERCEL_ENV=env==='production'?'preview':'production';assert.equal(oauthEnvironment(),null);process.env.VERCEL_ENV='development';assert.equal(oauthEnvironment(),null);
  assert(consentEnvironment(origin,url,'true',base.MCP_SUPABASE_PUBLISHABLE_KEY));assert.equal(consentEnvironment(origin,url,undefined,base.MCP_SUPABASE_PUBLISHABLE_KEY),null);assert.equal(consentEnvironment(origin,url,'true','sb_secret_synthetic-test'),null);
 }
 assert.equal(oauthTuple(production,STAGING_SUPABASE),null);assert.equal(oauthTuple(preview,PRODUCTION_SUPABASE),null);
 assert.equal(consentEnvironment(production,STAGING_SUPABASE,'true',base.MCP_SUPABASE_PUBLISHABLE_KEY),null);assert.equal(consentEnvironment(preview,PRODUCTION_SUPABASE,'true',base.MCP_SUPABASE_PUBLISHABLE_KEY),null);
}finally{process.env=originalEnv;}
console.log('PASS strict server/consent tuples, malformed origins/URLs, explicit flags, legacy endpoints independently closed');
for(const path of ['/connector/oauth/test','/connector_platform_oauth_redirect'])assert.equal(consentRedirect('https://chatgpt.com'+path),'https://chatgpt.com'+path);
for(const bad of ['http://chatgpt.com/connector/oauth/x','https://chatgpt.com:443/connector/oauth/x','https://chatgpt.com:8443/connector/oauth/x','https://user@chatgpt.com/connector/oauth/x','https://chatgpt.com.evil.example/connector/oauth/x','https://evil.example/connector/oauth/x','https://chatgpt.com/wrong'])assert.throws(()=>consentRedirect(bad));
console.log('PASS callback destinations remain restricted including explicit default ports');
for(const c of configs){
 const keys=await generateKeyPair('ES256'),jwk=await exportJWK(keys.publicKey);jwk.alg='ES256';jwk.kid='test';const getKey=createLocalJWKSet({keys:[jwk]});
 const claims={sub:actor,iss:c.issuer,aud:'authenticated',exp:Math.floor(Date.now()/1000)+600,iat:Math.floor(Date.now()/1000),client_id:client,resource:c.resource,role:'authenticated',is_anonymous:false};
 const sign=(changes:Record<string,unknown>={})=>new SignJWT({...claims,...changes}).setProtectedHeader({alg:'ES256',kid:'test'}).sign(keys.privateKey);
 assert.equal((await verifyOAuth(await sign(),c,getKey)).principal.actor,actor);
 for(const bad of [{iss:configs.find(x=>x!==c)!.issuer},{resource:configs.find(x=>x!==c)!.resource},{aud:'other'},{client_id:randomUUID()},{sub:randomUUID()},{is_anonymous:true},{role:'anon'},{exp:1},{iat:undefined},{nbf:Math.floor(Date.now()/1000)+600}])await assert.rejects(verifyOAuth(await sign(bad),c,getKey));
 const originalFetch=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async(input,init)=>{calls++;assert.equal(new URL(String(input)).origin,c.supabaseUrl);const headers=new Headers(init?.headers);if(String(input).includes('/storage/')){assert.equal(headers.get('apikey'),c.publishable);assert.equal(headers.get('authorization'),'Bearer synthetic-oauth');return new Response(null,{status:200});}return Response.json({actor,can_write:true});};
  const backend=oauthBackend(c,principal,'synthetic-oauth');await backend.rpc('mcp_oauth_actor',{p:principal.id,a:actor,c:client,r:c.resource});await backend.put('synthetic.webp',new Uint8Array([1]),'image/webp',principal);assert.equal(calls,2);
 }finally{globalThis.fetch=originalFetch;}
}
console.log('PASS synthetic issuer/resource swaps rejected and RPC/Storage use selected backend only, no real Production calls');
await mkdir('output',{recursive:true});const root=await mkdtemp(resolve('output/mcp-gates-'));const local=await LocalBackend.open(root,preview);
try{
 await local.register(principal);
 const resource=(origin:string)=>origin+'/api/mcp-chatgpt';
 for(const good of [resource(preview),resource(production)])await local.db.query('insert into private.mcp_oauth_clients(client_id,resource,enabled) values($1,$2,false)',[randomUUID(),good]);
 for(const bad of ['http://roadtag.org/api/mcp-chatgpt','https://www.roadtag.org/api/mcp-chatgpt','https://evil.example/api/mcp-chatgpt','https://roadtag.org.evil.example/api/mcp-chatgpt','https://roadtag.org/api/wrong',resource(production)+'?x=1',resource(production)+'#x','https://roadtag.org:443/api/mcp-chatgpt','https://roadtag.org:8443/api/mcp-chatgpt','https://user@x.vercel.app/api/mcp-chatgpt','https://x.vercel.app:443/api/mcp-chatgpt','https://x.vercel.app/api/mcp-chatgpt?x=1','https://x.vercel.app/api/mcp-chatgpt#x','https://-bad.vercel.app/api/mcp-chatgpt','https://bad_.vercel.app/api/mcp-chatgpt'])await assert.rejects(local.db.query('insert into private.mcp_oauth_clients(client_id,resource) values($1,$2)',[randomUUID(),bad]));
 await local.db.query('insert into private.mcp_oauth_clients(client_id,resource,enabled) values($1,$2,true)',[client,resource(preview)]);
 assert.equal((await local.db.query<{v:{actor:string}}>('select public.mcp_oauth_actor($1,$2,$3,$4) v',[principal.id,actor,client,resource(preview)])).rows[0].v.actor,actor);
 await assert.rejects(local.db.query('select public.mcp_oauth_actor($1,$2,$3,$4)',[principal.id,actor,client,resource(production)]));
 await local.db.query('insert into private.admin_users(user_id) values($1)',[actor]);await assert.rejects(local.db.query('select public.mcp_oauth_actor($1,$2,$3,$4)',[principal.id,actor,client,resource(preview)]));
 console.log('PASS fresh ordered migrations, exact resource constraints, Preview mapping rejects Production resource, live admin denial');
}finally{await local.db.close();}
console.log(JSON.stringify({status:'PASS',hosted:'NOT_RUN',productionCalls:0}));
