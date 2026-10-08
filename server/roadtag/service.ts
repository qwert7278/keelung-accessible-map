import {createHash,createHmac} from 'node:crypto';
import sharp from 'sharp';
import {schemas,handoffSchema,RoadError,type Backend,type Principal,type PublicRow,type ToolName} from './contracts.js';
import {candidates,distance,reportUrl,validateLocation} from './geography.js';
import {geoapifyProvider} from '../location/geoapify.js';
export const hash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
export class RoadTagService {
 constructor(public backend:Backend,public origin:string,private photoSecret:string){}
 async call(name:ToolName,raw:unknown,principal:Principal):Promise<PublicRow>{
  if((name==='create_report'||name==='add_observation')&&!principal.write)throw new RoadError('FORBIDDEN');
  if((name==='create_report'||name==='add_observation')&&(raw as PublicRow)?.confirmed!==true)throw new RoadError('CONFIRMATION_REQUIRED');
  if(name==='create_report'&&!(raw as PublicRow)?.photo_token)throw new RoadError('PHOTO_REQUIRED');
  const parsed=schemas[name].safeParse(raw);if(!parsed.success)throw new RoadError('INVALID_INPUT');
  if(name==='resolve_location'){
   const input=schemas.resolve_location.parse(raw);
   if(input.query){
    if(input.lat!==undefined||input.lng!==undefined)throw new RoadError('INVALID_INPUT');
    if(process.env.GEOAPIFY_LOCATION_ENABLED!=='true'||!process.env.GEOAPIFY_API_KEY)throw new RoadError('LOCATION_SEARCH_UNAVAILABLE');
    try {
     const matches=await geoapifyProvider.search(input.query);
     return {status:matches.length===1?'candidate':'ambiguous',needs_confirmation:true,candidates:matches};
    } catch {throw new RoadError('LOCATION_SEARCH_UNAVAILABLE');}
   }
   if(input.lat===undefined||input.lng===undefined)throw new RoadError('INVALID_INPUT');
   const found=candidates(input.lat,input.lng);if(!found.length)throw new RoadError('LOCATION_MISMATCH');
   return {status:found.length===1?'resolved':'ambiguous',lat:input.lat,lng:input.lng,...(found.length===1?found[0]:{city_id:null,city_name:null,district:null}),needs_confirmation:true,candidates:found,...(found.length>1?{code:'LOCATION_AMBIGUOUS'}:{})};
  }
  if(name==='search_nearby_reports'){
   const i=schemas.search_nearby_reports.parse(raw),dy=i.radius_m/111000,dx=dy/Math.max(0.000001,Math.cos(i.lat*Math.PI/180));
   const filters:Record<string,string>={south:String(Math.max(-90,i.lat-dy)),north:String(Math.min(90,i.lat+dy)),west:String(Math.max(-180,i.lng-dx)),east:String(Math.min(180,i.lng+dx))};
   if(i.category)filters.category=i.category;if(!i.include_resolved)filters.exclude_status='resolved';
   const rows:PublicRow[]=[];let complete=false;
   for(let offset=0;offset<5000;offset+=500){const page=await this.backend.feed(filters,offset,500);rows.push(...page);if(page.length<500){complete=true;break;}}
   if(!complete)return {reports:[],truncated:true,requires_refinement:true};
   const reports=rows.map(r=>({...this.publicReport(r),distance_m:distance(i.lat,i.lng,Number(r.lat),Number(r.lng))} as PublicRow&{distance_m:number})).filter(r=>r.distance_m<=i.radius_m)
    .sort((a,b)=>a.distance_m-b.distance_m||String(b.updated_at).localeCompare(String(a.updated_at))||String(a.id).localeCompare(String(b.id))).slice(0,i.limit);
   return {reports,truncated:false,requires_refinement:false};
  }
  if(name==='get_report'){
   const i=schemas.get_report.parse(raw),report=(await this.backend.feed({id:i.report_id},0,1))[0];if(!report)throw new RoadError('NOT_FOUND');
   const rows=i.include_observations?await this.backend.observations(i.report_id,51):[];
   return {report:this.publicReport(report),observations:rows.slice(0,50).map(r=>({id:r.id,type:r.type,message:r.message,suggested_status:r.suggested_status,created_at:r.created_at,image_url:r.image_path?this.backend.photoUrl(String(r.image_path)):null})),has_more:rows.length>50};
  }
  const i=parsed.data as PublicRow,operation=String(i.operation_id),data={...i};delete data.operation_id;
  // Store only token identity, never the bearer photo token in payload/ledger.
  data.photo_hash=i.photo_token?hash(String(i.photo_token)):null;delete data.photo_token;
  // The RPC checks successful replay before token expiry/cooldown and owns the transaction.
  const result=await this.backend.rpc('mcp_write',{p:principal.id,tool_name:name,op:operation,data});
  return this.writeResult(result);
 }
 async writeResult(result:PublicRow):Promise<PublicRow>{
  const report=(await this.backend.feed({id:String(result.report_id)},0,1))[0];
  return {...result,url:reportUrl(this.origin,String(result.report_id),report?String(report.city_id):undefined,report?String(report.district):undefined)};
 }
 publicReport(r:PublicRow):PublicRow{
  const fields=['id','city_id','district','title','address','description','category','lat','lng','status','wheelchair_access','created_at','updated_at'];
  return {...Object.fromEntries(fields.map(k=>[k,r[k] instanceof Date?r[k].toISOString():r[k]])),before_image_url:r.before_image_path?this.backend.photoUrl(String(r.before_image_path)):null,after_image_url:r.after_image_path?this.backend.photoUrl(String(r.after_image_path)):null,url:reportUrl(this.origin,String(r.id),String(r.city_id),String(r.district))};
 }
 async reserve(raw:unknown,principal:Principal){
  if(!principal.write)throw new RoadError('FORBIDDEN');const parsed=handoffSchema.safeParse(raw);if(!parsed.success)throw new RoadError('INVALID_INPUT');const i=parsed.data;
  if(i.kind==='before'&&i.report_id!==i.operation_id)throw new RoadError('INVALID_INPUT');
  return this.backend.rpc('mcp_reserve',{p:principal.id,op:i.operation_id,target:i.report_id,kind_name:i.kind,format_name:i.format,risk:hash('mcp:'+principal.id)});
 }
 async finalize(raw:unknown,principal:Principal){
  if(!principal.write)throw new RoadError('FORBIDDEN');const parsed=handoffSchema.safeParse(raw);if(!parsed.success)throw new RoadError('INVALID_INPUT');const i=parsed.data;
  const reservation=await this.reserve(i,principal),path=String(reservation.path),bytes=await this.backend.bytes(path,principal);
  await validateProcessed(bytes,i.format);
  const token=createHmac('sha256',this.photoSecret).update(JSON.stringify([principal.id,principal.actor,i.operation_id,i.report_id,i.kind,path,i.format])).digest('base64url');
  const result=await this.backend.rpc('mcp_finalize',{p:principal.id,op:i.operation_id,target:i.report_id,kind_name:i.kind,format_name:i.format,hash:hash(token),digest:hash(bytes)});
  return {photo_token:token,expires_at:result.expires_at};
 }
}
export async function validateProcessed(bytes:Uint8Array,format:string){
 if(bytes.length<1||bytes.length>1048576)throw new RoadError('PHOTO_TOKEN_INVALID');
 try{
  const image=sharp(bytes,{limitInputPixels:26000000,animated:false}).timeout({seconds:5}),m=await image.metadata();
  if(m.format!==format||!m.width||!m.height||Math.max(m.width,m.height)>1920||(m.pages||1)>1||m.exif||m.xmp||m.iptc)throw new Error('Invalid processed photo');
  await image.raw().toBuffer(); // Decode actual bytes, not just trust MIME or Storage metadata.
 }catch{throw new RoadError('PHOTO_TOKEN_INVALID');}
}
export {validateLocation};
