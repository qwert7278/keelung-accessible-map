import {timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {cleanupPhotos} from '../supabase/functions/_shared/cleanup.js';
export const maxDuration=60;
export async function GET(request:Request) {
 const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex'};
 const secret=process.env.CRON_SECRET,url=process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const actual=Buffer.from(request.headers.get('authorization')||''),expected=Buffer.from('Bearer '+secret);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected)) return Response.json({error:'Unauthorized'},{status:401,headers});
 if(!url||!key) return Response.json({error:'Cleanup not configured'},{status:503,headers});
 try {
  // Leave time for the last batch's query/delete/metadata requests before the 60s ceiling.
  const result=await cleanupPhotos(createClient(url,key,{auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(5000)})}}),100,Date.now()+40000);
  return Response.json(result,{headers});
 } catch {return Response.json({error:'Cleanup failed; metadata retained for retry'},{status:503,headers});}
}
