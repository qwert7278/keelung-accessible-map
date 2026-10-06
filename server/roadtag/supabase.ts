import {RoadError,type Backend,type Principal,type PublicRow} from './contracts.js';
import {ActorSessions} from './actor-session.js';
const reportFields='id,city_id,district,title,address,description,category,lat,lng,status,wheelchair_access,created_at,updated_at,before_image_path,after_image_path';
export class SupabaseBackend implements Backend {
 readonly sessions:ActorSessions;
 constructor(private url:string,private key:string,private publishable:string,sessionKey:string,private oauthToken?:{actor:string;token:string}){
  if(!publishable.startsWith('sb_publishable_')||publishable===key)throw new RoadError('SERVICE_UNAVAILABLE');
  this.sessions=new ActorSessions(url,publishable,sessionKey,(name,args)=>this.rpc(name,args));
 }
 private async privilegedRequest(path:string,init:RequestInit={}){
  const headers=new Headers(init.headers);headers.set('apikey',this.key);
  // New secret keys are not JWTs. Legacy service-role JWTs require Bearer.
  if(!this.key.startsWith('sb_secret_'))headers.set('authorization','Bearer '+this.key);
  const response=await fetch(this.url+path,{...init,headers,signal:AbortSignal.timeout(15000)});
  if(!response.ok){let code='SERVICE_UNAVAILABLE';try{const e=await response.json();if(typeof e.message==='string')code=e.message;}catch{/* Never return upstream bytes. */}throw new RoadError(code);}return response;
 }
 private async actorRequest(path:string,p:Principal,init:RequestInit={}){
  if(this.oauthToken&&this.oauthToken.actor!==p.actor)throw new RoadError('FORBIDDEN');
  const token=this.oauthToken?this.oauthToken.token:await this.sessions.access(p),headers=new Headers(init.headers);
  headers.set('apikey',this.publishable);headers.set('authorization','Bearer '+token);
  const response=await fetch(this.url+path,{...init,headers,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new RoadError('SERVICE_UNAVAILABLE');return response;
 }
 async rpc(name:string,args:Record<string,unknown>){return (await this.privilegedRequest('/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)})).json();}
 async feed(filters:Record<string,string>,offset=0,limit=500):Promise<PublicRow[]>{
  const q=new URLSearchParams({select:reportFields,order:'id.asc',offset:String(offset),limit:String(limit)});
  for(const [k,v] of Object.entries(filters))if(k==='id'||k==='category')q.set(k,'eq.'+v);else if(k==='exclude_status')q.set('status','neq.'+v);
  if(filters.south)q.set('and',`(lat.gte.${filters.south},lat.lte.${filters.north},lng.gte.${filters.west},lng.lte.${filters.east})`);
  return (await this.privilegedRequest('/rest/v1/report_feed?'+q)).json();
 }
 async observations(report:string,limit:number){return (await this.privilegedRequest('/rest/v1/report_update_feed?'+new URLSearchParams({select:'id,type,message,image_path,suggested_status,created_at',report_id:'eq.'+report,order:'created_at.desc,id.asc',limit:String(limit)}))).json();}
 async put(path:string,bytes:Uint8Array,mime:string,p:Principal){await this.actorRequest('/storage/v1/object/report-photos/'+path,p,{method:'POST',headers:{'Content-Type':mime,'x-upsert':'false'},body:bytes as BodyInit});}
 async bytes(path:string,p:Principal){
  const response=await this.actorRequest('/storage/v1/object/authenticated/report-photos/'+path,p),reader=response.body?.getReader();
  if(!reader)throw new RoadError('PHOTO_TOKEN_INVALID');const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>1048576)throw new RoadError('PHOTO_TOKEN_INVALID');chunks.push(item.value);}}finally{await reader.cancel();}
  return Buffer.concat(chunks);
 }
 photoUrl(path:string){return this.url+'/storage/v1/object/public/report-photos/'+path;}
}
