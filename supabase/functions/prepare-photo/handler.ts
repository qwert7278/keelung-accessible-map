import type { SupabaseClient } from '@supabase/supabase-js';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function preparePhotoHandler(deps:{authenticate:(authorization:string)=>Promise<SupabaseClient|null>;maintenance:()=>SupabaseClient}) {
 return async (request:Request)=>{
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
  if(request.method!=='POST') return reply({error:'Method not allowed'},405);
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')) return reply({error:'Authentication required'},401);
  try {
   const client=await deps.authenticate(authorization);
   if(!client) return reply({error:'Authentication required'},401);
   if(Number(request.headers.get('content-length')||0)>2048) return reply({error:'Invalid request'},413);
   const body=await request.text(); if(body.length>2048) return reply({error:'Invalid request'},413);
   const input=JSON.parse(body);
   if(!uuid.test(input.report)||!uuid.test(input.operation)||!['before','updates','after'].includes(input.kind)) return reply({error:'Invalid request'},400);
   const {data,error}=await client.rpc('reserve_photo',{report:input.report,kind_name:input.kind,operation:input.operation});
   if(error) return reply({error:error.message},429);
   // Cleanup is bounded and lazy: an upload request processes at most 20 old
   // objects. Idle sites create no new orphan growth. A failed delete is retried.
   const admin=deps.maintenance();
   const expired=await admin.rpc('expired_photos');
   if(!expired.error && expired.data?.length) {
    const removed=await admin.storage.from('report-photos').remove(expired.data);
    if(!removed.error) await admin.rpc('finish_photo_cleanup',{paths:expired.data});
   }
   return reply(data);
  } catch { return reply({error:'照片上傳服務暫時無法使用，請稍後重試。'},503); }
 };
}
