import {z} from 'zod';
import {type Settings} from './handler.js';
import {RoadTagService} from '../roadtag/service.js';
import {SupabaseBackend} from '../roadtag/supabase.js';
const principalSchema=z.array(z.strictObject({id:z.string().min(1).max(100),actor:z.uuid(),write:z.boolean(),credentialHash:z.string().regex(/^[0-9a-f]{64}$/)})).min(1);
export function environment(){
 const disabled:Settings={enabled:false,origin:'https://roadtag.org',principals:[]};
 try{
  if(process.env.MCP_ENABLED!=='true')return null;
  const publicUrl=new URL(process.env.MCP_PUBLIC_ORIGIN||''),origin=publicUrl.origin,url=new URL(process.env.MCP_SUPABASE_URL||'');
  if(publicUrl.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(publicUrl.hostname))return null;
  // Phase 1A never enables the production project, including by accidental env reuse.
  if(url.hostname==='ifcicahnrpkwjcxmnmug.supabase.co'||url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))return null;
  const key=process.env.MCP_SUPABASE_SERVICE_KEY,secret=process.env.MCP_PHOTO_SECRET,publishable=process.env.MCP_SUPABASE_PUBLISHABLE_KEY,sessionKey=process.env.MCP_SESSION_ENCRYPTION_KEY;
  if(!key||!secret||secret.length<32||!publishable?.startsWith('sb_publishable_')||publishable===key||!sessionKey||!/^[0-9a-f]{64}$/.test(sessionKey))return null;
  const principals=principalSchema.parse(JSON.parse(process.env.MCP_PRINCIPALS_JSON||''));
  if(new Set(principals.map(p=>p.id)).size!==principals.length||new Set(principals.map(p=>p.actor)).size!==principals.length||new Set(principals.map(p=>p.credentialHash)).size!==principals.length)return null;
  return {settings:{...disabled,enabled:true,origin,principals},service:new RoadTagService(new SupabaseBackend(url.origin,key,publishable,sessionKey),origin,secret)};
 }catch{return null;}
}
