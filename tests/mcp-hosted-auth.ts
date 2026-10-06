// Adapter/SQL tests with mocked Auth and Storage HTTP. NOT hosted RLS evidence
// and NOT genuine multi-connection PostgreSQL contention.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {LocalBackend} from '../scripts/mcp-local-backend.js';
import {SupabaseBackend} from '../server/roadtag/supabase.js';
import {environment} from '../server/mcp/config.js';
import {safeError} from '../server/roadtag/contracts.js';

await mkdir('output',{recursive:true});const root=await mkdtemp(resolve('output/mcp-auth-'));
let local=await LocalBackend.open(root,'http://127.0.0.1');
const url='https://isolated-test.supabase.co',service='sb_secret_test-service',pub='sb_publishable_test',key=randomBytes(32).toString('hex');
const a={id:'auth-a',actor:randomUUID(),write:true},b={id:'auth-b',actor:randomUUID(),write:true},r={id:'auth-r',actor:randomUUID(),write:false};
for(const p of [a,b,r])await local.register(p);
const jwt=(actor:string,expiry:number)=>'eyJhbGciOiJSUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:actor,role:'authenticated',iss:url+'/auth/v1',exp:expiry})).toString('base64url')+'.mock-signature';
const now=()=>Math.floor(Date.now()/1000);
const initial=jwt(a.actor,now()+3600);
let refreshes=0,wrongRefresh=false,wrongUser=false,uncertain=false,deniedStorage=false;const storageHeaders:Headers[]=[];
let userFailure:'timeout'|'503'|null=null,afterAcquire:undefined|(()=>Promise<void>),failRead=false,loseAcquireAck=false;
const rpcCalls:Record<string,number>={};
const refreshed=jwt(a.actor,now()+3600),refreshToken=randomBytes(32).toString('base64url');
const realFetch=globalThis.fetch;
const passed:string[]=[];const ok=(name:string)=>{passed.push(name);console.log('PASS '+name);};
globalThis.fetch=async(input,init)=>{
 const path=new URL(String(input)),headers=new Headers(init?.headers);
 if(path.pathname.startsWith('/rest/v1/rpc/')){
  assert.equal(headers.get('apikey'),service);assert.equal(headers.has('authorization'),false);
  const name=path.pathname.split('/').pop()!;rpcCalls[name]=(rpcCalls[name]||0)+1;
  if(name==='mcp_session_acquire'&&afterAcquire){const hook=afterAcquire;afterAcquire=undefined;await hook();}
  const result=await local.rpc(name,JSON.parse(String(init?.body)));
  if(name==='mcp_session_read'&&failRead)throw new Error('simulated process/read response interruption');
  if(name==='mcp_session_acquire'&&loseAcquireAck){loseAcquireAck=false;throw new Error('lost acquire acknowledgement');}
  return Response.json(result);
 }
 assert.equal(headers.get('apikey'),pub);assert(!JSON.stringify([...headers]).includes(service));
 if(path.pathname==='/auth/v1/token'){
  refreshes++;assert.equal(JSON.parse(String(init?.body)).refresh_token,refreshToken);
  if(uncertain)throw new Error('NETWORK_SECRET_SHOULD_NOT_ESCAPE');
  return Response.json({access_token:wrongRefresh?jwt(b.actor,now()+3600):refreshed,refresh_token:'rotated-private-refresh'});
 }
 if(path.pathname==='/auth/v1/user'){
  if(userFailure==='timeout')throw new Error('temporary Auth timeout');
  if(userFailure==='503')return new Response('temporary upstream error',{status:503});
  const token=headers.get('authorization')!.slice(7);const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  return Response.json({id:wrongUser?b.actor:claims.sub});
 }
 if(path.pathname.startsWith('/storage/v1/object/')){
  storageHeaders.push(headers);assert.equal(headers.get('authorization'),'Bearer '+refreshed);
  return deniedStorage?new Response('upstream private error',{status:403}):new Response(new Uint8Array([1,2,3]));
 }
 throw new Error('Unexpected test HTTP request');
};
const adapter=()=>new SupabaseBackend(url,service,pub,key);
try{
 assert.throws(()=>new SupabaseBackend(url,service,service,key));ok('mixed service/publishable credentials refused');
 await adapter().sessions.provision(a,{access_token:initial,refresh_token:refreshToken});
 const row=(await local.db.query<{sealed:string}>('select sealed from private.mcp_actor_sessions where principal=$1',[a.id])).rows[0];
 assert(!row.sealed.includes(refreshToken));assert(!row.sealed.includes('eyJ'));ok('durable session is encrypted, not plaintext Auth credentials');
 await assert.rejects(adapter().sessions.provision(b,{access_token:jwt(a.actor,now()+3600),refresh_token:refreshToken}));
 await assert.rejects(adapter().sessions.provision(r,{access_token:jwt(r.actor,now()+3600),refresh_token:refreshToken}));ok('provisioning wrong actor/read-only fails closed');
 await assert.rejects(adapter().sessions.provision(a,{access_token:jwt(a.actor,now()+3600),refresh_token:refreshToken}));ok('provision cannot overwrite an existing session');
 const lockRow=async()=>(await local.db.query<{lock_id:string|null}>('select lock_id from private.mcp_actor_sessions where principal=$1',[a.id])).rows[0].lock_id;
 const acquireCount=rpcCalls.mcp_session_acquire||0;
 assert((await adapter().sessions.access(a))===initial);assert.equal(refreshes,0);assert.equal(rpcCalls.mcp_session_acquire||0,acquireCount);assert.equal(await lockRow(),null);ok('fresh verification returns token without acquiring durable refresh lock');
 for(const failure of ['timeout','503'] as const){
  userFailure=failure;await assert.rejects(adapter().sessions.access(a),error=>safeError(error).code==='SERVICE_UNAVAILABLE');userFailure=null;
  assert.equal(await lockRow(),null);assert((await adapter().sessions.access(a))===initial);
 }ok('fresh /user timeout and 503 leave no lock; next request retries successfully');
 failRead=true;await assert.rejects(adapter().sessions.access(a));failRead=false;
 assert.equal(await lockRow(),null);assert((await adapter().sessions.access(a))===initial);ok('fresh read interruption creates no durable lock and restart/retry succeeds');
 // Re-provision simulated by test owner only; real recovery requires Auth revocation.
 await local.db.query('delete from private.mcp_actor_sessions where principal=$1',[a.id]);
 await adapter().sessions.provision(a,{access_token:jwt(a.actor,now()+40),refresh_token:refreshToken});
 const realNow=Date.now;let tokens:string[];
 try{Date.now=()=>realNow()+120000;tokens=await Promise.all([adapter().sessions.access(a),adapter().sessions.access(a)]);}
 finally{Date.now=realNow;}
 assert(tokens.every(token=>token===refreshed));assert.equal(refreshes,1);ok('expired JWT refreshed once across separate adapter instances through persisted SQL lock (PGlite)');
 assert.equal(await lockRow(),null);ok('rotated pair commit clears rotation lock');
 // Deterministic stale-read race: another instance rotates between read and acquire.
 for(const failure of [false,true]){
  await local.db.query('delete from private.mcp_actor_sessions where principal=$1',[a.id]);
  await adapter().sessions.provision(a,{access_token:jwt(a.actor,now()+40),refresh_token:refreshToken});
  const count:number=refreshes;
  afterAcquire=async()=>{assert((await adapter().sessions.access(a))===refreshed);if(failure)userFailure='timeout';};
  if(failure){await assert.rejects(adapter().sessions.access(a));userFailure=null;assert((await adapter().sessions.access(a))===refreshed);}
  else assert((await adapter().sessions.access(a))===refreshed);
  assert.equal(refreshes,count+1);assert.equal(await lockRow(),null);
 }ok('acquire rechecks latest refreshed pair; unchanged release precedes transient /user failure and retry');
 // No lock exists when the acquire request fails before its SQL mutation.
 await local.db.query('delete from private.mcp_actor_sessions where principal=$1',[a.id]);
 await adapter().sessions.provision(a,{access_token:jwt(a.actor,now()+40),refresh_token:refreshToken});
 afterAcquire=async()=>{throw new Error('pre-refresh acquire transport failure');};
 const beforeSafe=refreshes;await assert.rejects(adapter().sessions.access(a));assert.equal(await lockRow(),null);assert.equal(refreshes,beforeSafe);
 assert((await adapter().sessions.access(a))===refreshed);ok('pre-refresh safe acquire failure retries without operator intervention');
 await local.db.query('delete from private.mcp_actor_sessions where principal=$1',[a.id]);
 await adapter().sessions.provision(a,{access_token:jwt(a.actor,now()+40),refresh_token:refreshToken});
 loseAcquireAck=true;const beforeAck=refreshes;await assert.rejects(adapter().sessions.access(a));assert.equal(await lockRow(),null);assert.equal(refreshes,beforeAck);
 assert((await adapter().sessions.access(a))===refreshed);ok('lost acquire acknowledgement safely releases own pre-dispatch lock and retries');
 const persistedRefreshes=refreshes;await local.db.close();local=await LocalBackend.open(root,'http://127.0.0.1');
 assert((await adapter().sessions.access(a))===refreshed);assert.equal(refreshes,persistedRefreshes);ok('adapter/database restart uses persisted rotated session');
 await adapter().put('fixture',new Uint8Array([1]),'image/jpeg',a);assert.deepEqual(await adapter().bytes('fixture',a),Buffer.from([1,2,3]));
 assert.equal(storageHeaders.length,2);assert(storageHeaders.every(h=>h.get('apikey')===pub&&!JSON.stringify([...h]).includes(service)));ok('Storage upload/read use publishable API key and fresh actor Bearer only');
 deniedStorage=true;await assert.rejects(adapter().put('fixture',new Uint8Array([1]),'image/jpeg',a));deniedStorage=false;ok('Storage denial fails closed without privileged retry');
 wrongUser=true;await assert.rejects(adapter().sessions.access(a));wrongUser=false;
 assert.equal(await lockRow(),null);ok('fresh Auth identity mismatch rejected without acquiring rotation lock');
 await local.db.query('delete from private.mcp_actor_sessions where principal=$1',[a.id]);
 await adapter().sessions.provision(a,{access_token:jwt(a.actor,now()+40),refresh_token:refreshToken});wrongRefresh=true;
 await assert.rejects(adapter().sessions.access(a));wrongRefresh=false;ok('refresh response actor sub mismatch rejected before Storage');
 await local.db.query('delete from private.mcp_actor_sessions where principal=$1',[a.id]);
 await adapter().sessions.provision(a,{access_token:jwt(a.actor,now()+40),refresh_token:refreshToken});uncertain=true;
 await assert.rejects(adapter().sessions.access(a),error=>{assert.equal(safeError(error).code,'SERVICE_UNAVAILABLE');assert(!String(error).includes('NETWORK_SECRET'));return true;});uncertain=false;
 const previous=refreshes;
 await local.db.query("update private.mcp_actor_sessions set locked_at=now()-interval '1 day'");
 await assert.rejects(adapter().sessions.access(a));assert.equal(refreshes,previous);ok('uncertain rotation/crashed old lock cannot be stolen or refreshed again');
 await local.rpc('mcp_session_release',{p:a.id,a:a.actor,lock_id:randomUUID()});assert(await lockRow());ok('safe release cannot clear another instance rotation lock');
 await assert.rejects(local.rpc('mcp_session_commit',{p:a.id,a:a.actor,lock_id:randomUUID(),sealed:'x'.repeat(50)}));ok('stale/incorrect lock owner cannot commit session');
 await assert.rejects(local.rpc('mcp_session_acquire',{p:a.id,a:b.actor,lock_id:randomUUID()}));ok('configured actor must match durable principal mapping');
 await assert.rejects(local.rpc('mcp_session_acquire',{p:a.id,a:null,lock_id:randomUUID()}));ok('null actor cannot bypass SQL binding predicate');
 await assert.rejects(local.rpc('mcp_session_read',{p:a.id,a:b.actor}));
 await assert.rejects(local.rpc('mcp_session_read',{p:r.id,a:r.actor}));
 await local.db.query('insert into private.admin_users(user_id) values($1)',[b.actor]);
 await assert.rejects(local.rpc('mcp_session_read',{p:b.id,a:b.actor}));
 await local.db.query('delete from private.admin_users where user_id=$1',[b.actor]);ok('session read rejects wrong/read-only/admin actor');
 await local.db.query('delete from private.mcp_actor_sessions where principal=$1',[a.id]);
 await adapter().sessions.provision(a,{access_token:refreshed,refresh_token:refreshToken});
 await local.db.query('update private.mcp_actor_sessions set sealed=$1 where principal=$2',['x'.repeat(50),a.id]);
 await assert.rejects(adapter().sessions.access(a));
 assert.equal(await lockRow(),null);await assert.rejects(adapter().sessions.access(a));ok('tampered ciphertext rejected repeatedly without returning credentials');
 for(const role of ['anon','authenticated','service_role']){
  const rights=(await local.db.query<{read:boolean}>("select has_table_privilege($1,'private.mcp_actor_sessions','select') as read",[role])).rows[0];assert.equal(rights.read,false);
 }
 for(const role of ['anon','authenticated'])for(const sig of ['mcp_session_release(text,uuid,uuid)','mcp_session_read(text,uuid)','mcp_session_provision(text,uuid,text)','mcp_session_acquire(text,uuid,uuid)','mcp_session_commit(text,uuid,uuid,text)']){
  assert.equal((await local.db.query<{allowed:boolean}>('select has_function_privilege($1,$2,\'execute\') allowed',[role,'public.'+sig])).rows[0].allowed,false);
 }ok('encrypted session table/RPC unavailable to public and actor roles');
 const saved={...process.env};
 try{
  Object.assign(process.env,{MCP_ENABLED:'true',MCP_LEGACY_ALPHA_ENABLED:'true',MCP_PUBLIC_ORIGIN:'https://preview.example',MCP_SUPABASE_URL:url,MCP_SUPABASE_SERVICE_KEY:service,MCP_SUPABASE_PUBLISHABLE_KEY:pub,MCP_SESSION_ENCRYPTION_KEY:key,MCP_PHOTO_SECRET:'x'.repeat(32),MCP_PRINCIPALS_JSON:JSON.stringify([{...a,credentialHash:'a'.repeat(64)}])});
  assert(environment());process.env.MCP_SUPABASE_URL='https://ifcicahnrpkwjcxmnmug.supabase.co';assert.equal(environment(),null);ok('Production project hard block retained with otherwise valid config');
  process.env.MCP_SUPABASE_URL=url;process.env.MCP_PRINCIPALS_JSON=JSON.stringify([{...a,credentialHash:'a'.repeat(64),actorToken:'deprecated'}]);assert.equal(environment(),null);ok('static actorToken config rejected');
 }finally{for(const name of Object.keys(process.env))if(!(name in saved))delete process.env[name];Object.assign(process.env,saved);}
 await writeFile(resolve(root,'result.json'),JSON.stringify({passed:passed.length,checks:passed,hostedAuthStorage:'PENDING',realPostgresConcurrency:'PENDING',preview:'PENDING',production:'DISABLED'},null,2));
 console.log(`${passed.length} adapter/session checks PASS; mocked HTTP + PGlite only.`);
}finally{globalThis.fetch=realFetch;await local.db.close();}
