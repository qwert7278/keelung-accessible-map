import type {SupabaseClient} from '@supabase/supabase-js';
import {verifyGate} from '../_shared/uploadGate.ts';
import {cleanupPhotos} from '../_shared/cleanup.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function preparePhotoHandler(deps:{gateSecret:string;authenticate:(authorization:string)=>Promise<{id:string;anonymous:boolean}|null>;maintenance:()=>SupabaseClient}) {
 return async (request:Request)=>{
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
  if(request.method!=='POST') return reply({error:'Method not allowed'},405);
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')) return reply({error:'Authentication required'},401);
  try {
   if(!deps.gateSecret) return reply({error:'Upload gate not configured'},503);
   if(Number(request.headers.get('content-length')||0)>2048) return reply({error:'Invalid request'},413);
   const body=await request.text();if(body.length>2048) return reply({error:'Invalid request'},413);
   if(!await verifyGate(deps.gateSecret,request.headers,body)) return reply({error:'Verified upload gate required'},403);
   const user=await deps.authenticate(authorization);
   if(!user) return reply({error:'Authentication required'},401);
   const input=JSON.parse(body);
   if(!uuid.test(input.report)||!uuid.test(input.operation)||!['before','updates','after'].includes(input.kind)) return reply({error:'Invalid request'},400);
   const admin=deps.maintenance();
   const {data,error}=await admin.rpc('reserve_photo_verified',{actor:user.id,anonymous:user.anonymous,report:input.report,kind_name:input.kind,operation:input.operation,risk_hash:request.headers.get('x-roadtag-risk-hash')});
   if(error) return reply({error:error.message},429);
   // Scheduled worker owns retries; opportunistic cleanup must not fail a valid upload.
   try {await cleanupPhotos(admin);} catch { /* Scheduled retry retains metadata. */ }
   return reply(data);
  } catch {return reply({error:'照片上傳服務暫時無法使用，請稍後重試。'},503);}
 };
}
