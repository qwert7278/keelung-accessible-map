import {createHmac} from 'node:crypto';
import {signGate} from '../supabase/functions/_shared/uploadGate.js';
export const maxDuration=30;
export async function POST(request:Request) {
 const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex'};
 const reply=(error:string,status:number)=>Response.json({error},{status,headers});
 const authorization=request.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer ')) return reply('Authentication required',401);
 const secret=process.env.UPLOAD_GATE_SECRET,url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 // Vercel overwrites X-Forwarded-For. Never trust this header on an arbitrary host.
 const ip=process.env.VERCEL==='1' ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() : null;
 if(!secret||!url||!key||!ip) return reply('上傳服務尚未完成設定。',503);
 if(Number(request.headers.get('content-length')||0)>2048) return reply('Invalid request',413);
 const body=await request.text();if(body.length>2048) return reply('Invalid request',413);
 const stamp=String(Date.now());
 // Daily HMAC prevents storing or returning the raw IP and expires linkage each day.
 const risk=createHmac('sha256',secret).update(new Date(Number(stamp)).toISOString().slice(0,10)+'\n'+ip).digest('hex');
 try {
  const response=await fetch(url+'/functions/v1/prepare-photo',{method:'POST',headers:{authorization,apikey:key,'Content-Type':'application/json','x-roadtag-risk-hash':risk,'x-roadtag-timestamp':stamp,'x-roadtag-signature':await signGate(secret,stamp,risk,authorization,body)},body,signal:AbortSignal.timeout(15000)});
  return new Response(await response.text(),{status:response.status,headers:{...headers,'Content-Type':'application/json'}});
 } catch {return reply('照片上傳服務暫時無法使用，請稍後重試。',503);}
}
