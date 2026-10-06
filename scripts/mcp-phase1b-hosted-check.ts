import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {SupabaseBackend} from '../server/roadtag/supabase.js';
import {RoadTagService} from '../server/roadtag/service.js';
import {attachmentWrite} from '../server/mcp/attachment-write.js';
const config=JSON.parse(await readFile(process.argv[2],'utf8')),url='https://wpravdqviylkcpsioybu.supabase.co';
assert.equal(config.url,url);assert.equal(config.env.MCP_SUPABASE_URL,url);
const env=config.env,b=config.actors.find((x:{id:string})=>x.id==='staging-writer-b'),ro=config.actors.find((x:{write:boolean})=>!x.write);
assert(b&&ro);const sessions:{access_token:string}[]=[];
async function auth(body:unknown,grant:string){const r=await fetch(url+'/auth/v1/token?grant_type='+grant,{method:'POST',headers:{apikey:env.MCP_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});assert(r.ok,'staging Auth request failed');return r.json();}
const jwks=createRemoteJWKSet(new URL(url+'/auth/v1/.well-known/jwks.json'));
const backend=(actor:string,token:string)=>new SupabaseBackend(url,env.MCP_SUPABASE_SERVICE_KEY,env.MCP_SUPABASE_PUBLISHABLE_KEY,env.MCP_SESSION_ENCRYPTION_KEY,{actor,token});
try{
 const initial=await auth({email:b.email,password:b.password},'password'),rotated=await auth({refresh_token:initial.refresh_token},'refresh_token');sessions.push(rotated);
 const verified=await jwtVerify(rotated.access_token,jwks,{issuer:url+'/auth/v1',audience:'authenticated'});assert.equal(verified.payload.sub,b.actor);assert.equal(rotated.user.id,b.actor);assert(rotated.refresh_token!==initial.refresh_token);
 console.log('PASS real staging Auth refresh: new independent QA session, signed actor JWT, no ChatGPT/alpha session token copied');
 const readOnly=await auth({email:ro.email,password:ro.password},'password');sessions.push(readOnly);
 const p={id:b.id,actor:b.actor,write:true},bp=backend(b.actor,rotated.access_token),bp2=backend(b.actor,rotated.access_token),service=new RoadTagService(bp,env.MCP_PUBLIC_ORIGIN,env.MCP_PHOTO_SECRET),service2=new RoadTagService(bp2,env.MCP_PUBLIC_ORIGIN,env.MCP_PHOTO_SECRET);
 const jpeg=await sharp({create:{width:120,height:60,channels:3,background:'blue'}}).jpeg().toBuffer();
 const op=randomUUID(),input={operation_id:op,city_id:'TW-KEE',district:'仁愛區',lat:25.13,lng:121.74,title:'Phase1B hosted concurrency QA',category:'other',wheelchair_access:'passable',confirmed:true,photo_file:{download_url:'https://example.com/qa',file_id:randomUUID(),mime_type:'image/jpeg'}};
 const outcomes=await Promise.allSettled([attachmentWrite(service,'create_report',input,p,async()=>jpeg),attachmentWrite(service2,'create_report',input,p,async()=>jpeg)]);
 const success=outcomes.filter(x=>x.status==='fulfilled');assert(success.length>=1);for(const x of outcomes)if(x.status==='rejected')assert.match(String(x.reason),/RATE_LIMITED/);
 assert.equal(success.filter(x=>x.value.created===true&&x.value.replayed===false).length,1);
 const replay=await attachmentWrite(service,'create_report',{...input,photo_file:{...input.photo_file,download_url:'http://127.0.0.1/expired'}},p,async()=>{throw Error('refetch forbidden');});assert.equal(replay.report_id,op);assert.equal(replay.replayed,true);
 await assert.rejects(attachmentWrite(service,'create_report',{...input,photo_file:{...input.photo_file,file_id:randomUUID()}},p,async()=>jpeg),/IDEMPOTENCY_CONFLICT/);
 const report=(await bp.feed({id:op}))[0],path=String(report.before_image_path);
 await assert.rejects(bp.put(path,jpeg,'image/jpeg',p));
 const unreserved=randomUUID()+'/before/'+randomUUID()+'.webp';await assert.rejects(bp.put(unreserved,jpeg,'image/webp',p));
 await assert.rejects(bp.put(op+'/after/'+randomUUID()+'.webp',jpeg,'image/webp',p));
 assert((await backend(ro.actor,readOnly.access_token).bytes(path,{id:ro.id,actor:ro.actor,write:false})).length>0); // Existing public-photo read policy is intentional.
 const negativeOp=randomUUID(),handoff={operation_id:negativeOp,report_id:negativeOp,kind:'before',format:'webp'},reservation=await service.reserve(handoff,p);
 await assert.rejects(backend(ro.actor,readOnly.access_token).put(String(reservation.path),jpeg,'image/webp',{id:ro.id,actor:ro.actor,write:false}));
 const normalized=await sharp(jpeg).webp().toBuffer();await bp.put(String(reservation.path),normalized,'image/webp',p);
 const finalized=await service.finalize(handoff,p),wrongOp={...input,operation_id:randomUUID(),photo_token:finalized.photo_token} as Record<string,unknown>;delete wrongOp.photo_file;
 await assert.rejects(service.call('create_report',wrongOp,p),/PHOTO_TOKEN_INVALID/);
 await assert.rejects(bp.rpc('mcp_attachment_begin',{p:ro.id,op:randomUUID(),tool_name:'create_report',data:{confirmed:true},file_hash:'a'.repeat(64),lease:randomUUID()}),/FORBIDDEN/);
 const rpcDenied=await fetch(url+'/rest/v1/rpc/mcp_attachment_release',{method:'POST',headers:{apikey:env.MCP_SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+rotated.access_token,'Content-Type':'application/json'},body:JSON.stringify({p:p.id,op,lease:randomUUID()})});assert(!rpcDenied.ok);
 console.log('PASS real PostgreSQL separate-instance concurrency, expired-URL replay and file conflict; Storage overwrite/unreserved/after/cross-user upload/token misuse and direct private RPC denied; public photo read retained');
 const observation=randomUUID(),webp=await sharp(jpeg).webp().toBuffer(),obs={operation_id:observation,report_id:op,message:'Phase1B hosted lost-ack QA',suggested_status:'resolved',confirmed:true,photo_file:{download_url:'https://example.com/qa.webp',file_id:randomUUID(),mime_type:'image/webp'}};
 const original=bp.rpc.bind(bp);let injected=false;bp.rpc=async(name,args)=>{const r=await original(name,args);if(name==='mcp_write'&&args.op===observation&&!injected){injected=true;throw Error('lost acknowledgement');}return r;};
 await assert.rejects(attachmentWrite(service,'add_observation',obs,p,async()=>webp),/lost acknowledgement/);
 const obsReplay=await attachmentWrite(service2,'add_observation',{...obs,photo_file:{...obs.photo_file,download_url:'expired'}},p,async()=>{throw Error('no refetch');});assert.equal(obsReplay.replayed,true);
 assert.equal((await bp.feed({id:op}))[0].status,'open');assert.equal((await bp.observations(op,50)).filter((x:{id?:unknown})=>x.id===obsReplay.observation_id).length,1);
 console.log(JSON.stringify({status:'PASS',hosted_report_operation:op,hosted_observation_operation:observation,observation_id:obsReplay.observation_id,chatgpt_refresh:'PENDING: client-owned lifecycle not inspected'}));
}finally{
 for(const session of sessions){const r=await fetch(url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:env.MCP_SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+session.access_token}});assert(r.ok,'QA local-session logout failed');}
}
