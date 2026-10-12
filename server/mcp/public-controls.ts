import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {z} from 'zod';
import {RoadError} from '../roadtag/contracts.js';
export type ControlDecision={allowed:boolean;code?:'RATE_LIMITED'|'SERVICE_UNAVAILABLE';retry_after?:number;lease?:string|null};
export interface PublicControls {
 acquire(risk:string,kind:'request'|'geocode',lease?:string):Promise<ControlDecision>;
 release(risk:string,lease:string):Promise<void>;
}
export type PublicEvent={event:'mcp_public';operation:'request'|'resolve_location'|'search_nearby_reports'|'get_report';outcome:'OK'|'ERROR'|'RATE_LIMITED'|'SERVICE_UNAVAILABLE'|'TIMEOUT';duration_ms:number;http_status?:number};
export const observePublic=(event:PublicEvent)=>console.info(JSON.stringify(event));
// Vercel overwrites x-forwarded-for. Never trust alternate headers or local input.
export function publicRisk(request:Request,secret:string,trustVercel=false,now=Date.now()){
 const forwarded=trustVercel?request.headers.get('x-forwarded-for')?.split(',')[0].trim():undefined;
 const network=forwarded&&forwarded.length<=45&&isIP(forwarded)?forwarded:'unknown';
 return createHmac('sha256',secret).update(Math.floor(now/86400000)+'\n'+network).digest('hex');
}
const decision=z.strictObject({allowed:z.boolean(),code:z.enum(['RATE_LIMITED','SERVICE_UNAVAILABLE']).optional(),retry_after:z.number().int().min(1).max(86400).optional(),lease:z.uuid().nullable().optional()});
export class PublicControlClient implements PublicControls {
 constructor(private url:string,private publishable:string,private gate:string){
  const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.origin!==url||!publishable.startsWith('sb_publishable_')||gate.length<32||gate.length>128)throw new RoadError('SERVICE_UNAVAILABLE');
 }
 private async rpc(name:'acquire'|'release',args:Record<string,unknown>){
  try{const response=await fetch(this.url+'/rest/v1/rpc/mcp_public_'+name,{method:'POST',headers:{apikey:this.publishable,'Content-Type':'application/json','x-roadtag-control-key':this.gate},body:JSON.stringify(args),signal:AbortSignal.timeout(3000),redirect:'error',cache:'no-store'});if(!response.ok)throw new Error();return name==='acquire'?await response.json():null;}
  catch{throw new RoadError('SERVICE_UNAVAILABLE');}
 }
 async acquire(risk:string,kind:'request'|'geocode',lease?:string){
  const parsed=decision.safeParse(await this.rpc('acquire',{p_risk:risk,p_kind:kind,p_lease:lease||null}));
  if(!parsed.success||parsed.data.allowed&&kind==='request'&&!parsed.data.lease||!parsed.data.allowed&&!parsed.data.code)throw new RoadError('SERVICE_UNAVAILABLE');return parsed.data;
 }
 async release(risk:string,lease:string){await this.rpc('release',{p_risk:risk,p_lease:lease});}
}
