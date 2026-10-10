import type {SupabaseClient} from '@supabase/supabase-js';
import {verifyGate} from '../_shared/uploadGate.ts';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable={error:'照片上傳服務暫時無法使用，請稍後重試。',status:503};
// Existing SQL raises P0001 for expected business rejections. Everything else
// is a dependency failure; never expose arbitrary database messages.
const reservationErrors:Record<string,{error:string;status:number}>={
 'Authentication required':{error:'登入已過期，請重新登入。',status:401},
 'Admin required':{error:'沒有此照片操作的權限。',status:403},
 'Verified request required':{error:'照片請求無法驗證。',status:403},
 'Upload belongs to another operation':{error:'沒有此照片操作的權限。',status:403},
 'Report not found':{error:'找不到此案件。',status:404},
 'Invalid upload request':{error:'無效的照片上傳請求。',status:400},
 'Original upload must use its report ID':{error:'無效的照片上傳請求。',status:400},
 'Invalid photo format':{error:'無效的照片格式。',status:400},
 'Upload reservation expired; start a new report':{error:'照片上傳預約已過期，請重新開始回報。',status:409},
 '照片上傳過於頻繁，請稍後再試':{error:'照片上傳過於頻繁，請稍後再試。',status:429},
 '今日照片上傳額度已達上限，請稍後再試':{error:'今日照片上傳額度已達上限，請稍後再試。',status:429},
 '尚有未完成的照片上傳，請完成後再試':{error:'尚有未完成的照片上傳，請完成後再試。',status:429},
 '此網路的照片請求過於頻繁，請稍後再試。':{error:'此網路的照片請求過於頻繁，請稍後再試。',status:429},
};
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
   const format=input.format === undefined ? 'webp' : input.format;
   if(!['webp','jpeg'].includes(format)) return reply({error:'Invalid photo format'},400);
   const admin=deps.maintenance();
   const {data,error}=await admin.rpc('reserve_photo_verified_format',{actor:user.id,anonymous:user.anonymous,report:input.report,kind_name:input.kind,operation:input.operation,risk_hash:request.headers.get('x-roadtag-risk-hash'),format_name:format});
   if(error) {
    const rejection=error.code==='P0001' && Object.hasOwn(reservationErrors,error.message) ? reservationErrors[error.message] : unavailable;
    return reply({error:rejection.error},rejection.status);
   }
   // /api/photo-cleanup owns maintenance; never delay a valid reservation.

   return reply(data);
  } catch {return reply({error:'照片上傳服務暫時無法使用，請稍後重試。'},503);}
 };
}
