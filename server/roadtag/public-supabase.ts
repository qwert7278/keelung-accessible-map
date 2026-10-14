import {RoadError,type Backend,type PublicRow} from './contracts.js';

// Anonymous Data API access: no service key, actor session, OAuth or write RPC.
export class PublicSupabaseBackend implements Backend {
 constructor(private url:string,private publishable:string){
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.origin!==url||!publishable.startsWith('sb_publishable_'))throw new RoadError('SERVICE_UNAVAILABLE');
 }
 private async read(view:string,q:URLSearchParams):Promise<PublicRow[]>{
  try{
   const response=await fetch(this.url+'/rest/v1/'+view+'?'+q,{headers:{apikey:this.publishable},signal:AbortSignal.timeout(15000),redirect:'error',cache:'no-store'});
   if(!response.ok)throw new RoadError('SERVICE_UNAVAILABLE');
   const rows:unknown=await response.json();if(!Array.isArray(rows))throw new RoadError('SERVICE_UNAVAILABLE');return rows;
  }catch{throw new RoadError('SERVICE_UNAVAILABLE');}
 }
 async feed(filters:Record<string,string>,offset=0,limit=500){
  if(!Number.isInteger(offset)||offset<0||offset>=5000||!Number.isInteger(limit)||limit<1||limit>500)throw new RoadError('INVALID_INPUT');
  const q=new URLSearchParams({select:'id,city_id,district,title,address,description,category,lat,lng,status,wheelchair_access,created_at,updated_at,before_image_path,after_image_path',order:'id.asc',offset:String(offset),limit:String(limit)});
  for(const [k,v] of Object.entries(filters))if(k==='id'||k==='category')q.set(k,'eq.'+v);else if(k==='exclude_status')q.set('status','neq.'+v);
  if(filters.south)q.set('and',`(lat.gte.${filters.south},lat.lte.${filters.north},lng.gte.${filters.west},lng.lte.${filters.east})`);
  return this.read('report_feed',q);
 }
 async observations(report:string,limit:number){
  if(!Number.isInteger(limit)||limit<1||limit>51)throw new RoadError('INVALID_INPUT');
  return this.read('report_update_feed',new URLSearchParams({select:'id,type,message,image_path,suggested_status,created_at',report_id:'eq.'+report,order:'created_at.desc,id.asc',limit:String(limit)}));
 }
 photoUrl(path:string){
  if(!/^[0-9a-f-]{36}\/(before|after|updates)\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/.test(path))return '';
  return this.url+'/storage/v1/object/public/report-photos/'+path;
 }
 async rpc():Promise<PublicRow>{throw new RoadError('FORBIDDEN');}
 async put():Promise<void>{throw new RoadError('FORBIDDEN');}
 async bytes():Promise<Uint8Array>{throw new RoadError('FORBIDDEN');}
}
