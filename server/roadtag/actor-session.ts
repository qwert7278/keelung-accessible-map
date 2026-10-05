import {createCipheriv,createDecipheriv,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {RoadError,type Principal,type PublicRow} from './contracts.js';

const sessionSchema=z.strictObject({access_token:z.string().min(1).max(16384),refresh_token:z.string().min(1).max(16384)});
export type ActorSession=z.infer<typeof sessionSchema>;
type Rpc=(name:string,args:Record<string,unknown>)=>Promise<PublicRow>;

// No auto-refresh client or instance-local session cache. PostgreSQL owns the lock
// and encrypted session. Fresh verification never takes a rotation lock.
// A crash in the rotation section/uncertain refresh leaves the lock closed until
// an operator revokes the old Auth session and provisions a new one.
export class ActorSessions {
 private key:Buffer;
 constructor(private url:string,private publishable:string,key:string,private rpc:Rpc){
  if(!/^[0-9a-f]{64}$/.test(key))throw new RoadError('SERVICE_UNAVAILABLE');
  this.key=Buffer.from(key,'hex');
 }
 private seal(p:Principal,value:ActorSession){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);
  cipher.setAAD(Buffer.from(this.url+'|'+p.id+'|'+p.actor));
  const bytes=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64url');
 }
 private open(p:Principal,sealed:string){
  const bytes=Buffer.from(sealed,'base64url');
  const decipher=createDecipheriv('aes-256-gcm',this.key,bytes.subarray(0,12));
  decipher.setAAD(Buffer.from(this.url+'|'+p.id+'|'+p.actor));decipher.setAuthTag(bytes.subarray(12,28));
  return sessionSchema.parse(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8')));
 }
 private claims(token:string,p:Principal){
  const parts=token.split('.');if(parts.length!==3)throw new RoadError('FORBIDDEN');
  const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  if(claims.sub!==p.actor||claims.role!=='authenticated'||claims.iss!==this.url+'/auth/v1'||!Number.isFinite(claims.exp))throw new RoadError('FORBIDDEN');
  return claims as {exp:number}; // Parsing is not verification; /user below verifies the JWT.
 }
 private async auth(path:string,init:RequestInit){
  const response=await fetch(this.url+'/auth/v1/'+path,{...init,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new RoadError('SERVICE_UNAVAILABLE');return response.json();
 }
 private async verify(p:Principal,session:ActorSession){
  if(this.claims(session.access_token,p).exp*1000<=Date.now()+30000)throw new RoadError('SERVICE_UNAVAILABLE');
  const user=await this.auth('user',{headers:{apikey:this.publishable,authorization:'Bearer '+session.access_token}});
  if(user.id!==p.actor)throw new RoadError('FORBIDDEN');
 }
 async provision(p:Principal,input:unknown){
  if(!p.write)throw new RoadError('FORBIDDEN');const session=sessionSchema.parse(input);
  await this.verify(p,session);
  await this.rpc('mcp_session_provision',{p:p.id,a:p.actor,sealed:this.seal(p,session)});
 }
 async access(p:Principal){
  if(!p.write)throw new RoadError('FORBIDDEN');
  try{return await this.accessSession(p);}catch{throw new RoadError('SERVICE_UNAVAILABLE');}
 }
 private async accessSession(p:Principal){
  let initial:unknown;
  for(let attempt=0;attempt<20;attempt++){
   const row=await this.rpc('mcp_session_read',{p:p.id,a:p.actor});
   if(!row.busy){initial=row.sealed;break;}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(typeof initial!=='string')throw new RoadError('SERVICE_UNAVAILABLE');
  const current=this.open(p,initial);
  if(this.claims(current.access_token,p).exp*1000>Date.now()+60000){
   await this.verify(p,current);return current.access_token;
  }
  const lock=randomUUID();let sealed:unknown;
  const release=()=>this.rpc('mcp_session_release',{p:p.id,a:p.actor,lock_id:lock});
  // Bounded wait, no lease stealing: a slow/crashed refresher cannot overlap a successor.
  for(let attempt=0;attempt<20;attempt++){
   let row:PublicRow;
   try{row=await this.rpc('mcp_session_acquire',{p:p.id,a:p.actor,lock_id:lock});}
   catch(error){
    // The acquire response may be lost after SQL commits. No refresh has been
    // dispatched by this instance; release only our UUID, never another owner.
    try{await release();}catch{/* Unavailable DB: no blind takeover. */}
    throw error;
   }
   if(!row.busy){sealed=row.sealed;break;}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(typeof sealed!=='string')throw new RoadError('SERVICE_UNAVAILABLE');
  const state={refreshAttempted:false,rotatedPairReceived:false,sessionCommitted:false,lockReleased:false};
  try{
   let session=this.open(p,sealed);
   // Acquire returns the latest session, not the snapshot read above.
   if(this.claims(session.access_token,p).exp*1000>Date.now()+60000){
    // Another instance already rotated. Release unchanged BEFORE /user IO so
    // ordinary verification failure cannot strand this redundant lock.
    await release();
    state.lockReleased=true;
    await this.verify(p,session);return session.access_token;
   }else{
    state.refreshAttempted=true; // Set before dispatch: a timeout may consume the token.
    const refreshed=await this.auth('token?grant_type=refresh_token',{method:'POST',headers:{apikey:this.publishable,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
    session=sessionSchema.parse({access_token:refreshed.access_token,refresh_token:refreshed.refresh_token});
    state.rotatedPairReceived=true;
   }
   await this.verify(p,session);
   await this.rpc('mcp_session_commit',{p:p.id,a:p.actor,lock_id:lock,sealed:this.seal(p,session)});
   state.sessionCommitted=true;
   return session.access_token;
  }catch(error){
   // Only the owning instance can release a known-safe failure before dispatch.
   // Integrity/identity failures and uncertain rotation remain fail closed.
   if(!state.refreshAttempted&&!state.rotatedPairReceived&&!state.sessionCommitted&&!state.lockReleased&&error instanceof RoadError&&error.code==='SERVICE_UNAVAILABLE'){
    try{await release();}catch{/* No lease stealing or secret errors. */}
   }
   throw new RoadError('SERVICE_UNAVAILABLE');
  }
 }
}
