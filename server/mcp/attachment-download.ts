import {Resolver} from 'node:dns/promises';
import {isIP} from 'node:net';
import {request,type RequestOptions} from 'node:https';
import {checkServerIdentity} from 'node:tls';
import type {IncomingMessage,ClientRequest} from 'node:http';
import ipaddr from 'ipaddr.js';
import sharp from 'sharp';
import {RoadError} from '../roadtag/contracts.js';
export const RAW_CAP=20*1024*1024;
type Address={address:string;family:4|6};
export function publicAddress(value:string){
 if(!isIP(value))return false;
 try{const a=ipaddr.parse(value);if(a.range()!=='unicast')return false;
  if(a.kind()==='ipv6')return a.match(ipaddr.parseCIDR('2000::/3'));
  return !['192.0.0.0/24','192.0.2.0/24','198.51.100.0/24','203.0.113.0/24'].some(c=>a.match(ipaddr.parseCIDR(c)));
 }catch{return false;}
}
export function attachmentURL(value:string){
 if(value.length>8192||Array.from(value).some(c=>c.charCodeAt(0)<=32||c.charCodeAt(0)===127||c==='\\'))throw new RoadError('INVALID_INPUT');
 let u:URL;try{u=new URL(value);}catch{throw new RoadError('INVALID_INPUT');}
 if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||u.hash)throw new RoadError('INVALID_INPUT');
 const host=u.hostname.replace(/^\[|\]$/g,'');if(!host||host.endsWith('.localhost')||host==='localhost')throw new RoadError('INVALID_INPUT');
 if(isIP(host)&&!publicAddress(host))throw new RoadError('INVALID_INPUT');return u;
}
async function resolveAll(host:string,signal:AbortSignal):Promise<Address[]>{
 if(isIP(host))return [{address:host,family:isIP(host) as 4|6}];
 const r=new Resolver(),cancel=()=>r.cancel();signal.addEventListener('abort',cancel,{once:true});
 try{signal.throwIfAborted();const all=await Promise.allSettled([r.resolve4(host),r.resolve6(host)]);
  const out:Address[]=[];for(let i=0;i<all.length;i++){const v=all[i];if(v.status==='fulfilled')out.push(...v.value.map(address=>({address,family:(i===0?4:6) as 4|6})));else if(!['ENODATA','ENOTFOUND'].includes(String(v.reason?.code)))throw new Error('DNS failed');}
  return out;
 }finally{signal.removeEventListener('abort',cancel);r.cancel();}
}
type Deps={resolve?:(host:string,signal:AbortSignal)=>Promise<Address[]>;request?:(options:RequestOptions,callback:(r:IncomingMessage)=>void)=>ClientRequest;timeoutMs?:number};
// The numeric hostname pins the connection. TLS identity is always the original URL host.
export function pinnedOptions(u:URL,pin:Address,signal:AbortSignal):RequestOptions{
 const host=u.hostname.replace(/^\[|\]$/g,'');
 return {protocol:'https:',hostname:pin.address,family:pin.family,port:443,method:'GET',path:u.pathname+u.search,agent:false,signal,maxHeaderSize:8192,rejectUnauthorized:true,servername:isIP(host)?undefined:host,checkServerIdentity:(_name,cert)=>checkServerIdentity(host,cert),headers:{Host:u.host,Accept:'image/jpeg,image/png,image/webp','Accept-Encoding':'identity'}};
}
async function hop(u:URL,pin:Address,signal:AbortSignal,send:NonNullable<Deps['request']>):Promise<{bytes?:Buffer;redirect?:string}>{
 return new Promise((resolve,reject)=>{
  const fail=()=>reject(new RoadError('PHOTO_TOKEN_INVALID'));
  const req=send(pinnedOptions(u,pin,signal),res=>{
   const status=res.statusCode||0;
   if([301,302,303,307,308].includes(status)){const location=res.headers.location;res.destroy();if(!location||location.length>8192)return fail();resolve({redirect:location});return;}
   if(status!==200||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();fail();return;}
   const size=Number(res.headers['content-length']);if(Number.isFinite(size)&&size>RAW_CAP){res.destroy();fail();return;}
   const chunks:Buffer[]=[];let total=0;
   res.on('data',(chunk:Buffer)=>{total+=chunk.length;if(total>RAW_CAP){res.destroy();req.destroy();fail();return;}chunks.push(chunk);});
   res.on('end',()=>{if(total<1||total>RAW_CAP)fail();else resolve({bytes:Buffer.concat(chunks,total)});});
   res.on('error',fail);res.on('aborted',fail);
  });req.on('error',fail);req.end();
 });
}
export async function downloadAttachment(raw:string,deps:Deps={}):Promise<Buffer>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),deps.timeoutMs||20000);
 try{let u=attachmentURL(raw);for(let redirects=0;redirects<=3;redirects++){
  controller.signal.throwIfAborted();const host=u.hostname.replace(/^\[|\]$/g,''),addresses=await (deps.resolve||resolveAll)(host,controller.signal);
  if(!addresses.length||addresses.some(a=>!publicAddress(a.address)||isIP(a.address)!==a.family))throw new RoadError('INVALID_INPUT');
  const result=await hop(u,addresses[0],controller.signal,deps.request||request);
  if(result.bytes)return result.bytes;if(redirects===3)throw new RoadError('INVALID_INPUT');u=attachmentURL(new URL(result.redirect!,u).href);
 }throw new RoadError('INVALID_INPUT');
 }catch(e){if(e instanceof RoadError)throw e;throw new RoadError('PHOTO_TOKEN_INVALID');}finally{clearTimeout(timer);controller.abort();}
}
export async function normalizeAttachment(raw:Uint8Array){
 if(!raw.length||raw.length>RAW_CAP)throw new RoadError('PHOTO_TOKEN_INVALID');
 try{const opts={limitInputPixels:26000000,animated:false,failOn:'warning' as const},m=await sharp(raw,opts).timeout({seconds:5}).metadata();
  if(!['jpeg','png','webp'].includes(m.format||'')||!m.width||!m.height||m.width>10000||m.height>10000||m.width*m.height>26000000||(m.pages||1)>1)throw new Error('Image rejected');
  let bytes:Buffer|undefined;for(const quality of [82,68,54,40,28]){bytes=await sharp(raw,opts).timeout({seconds:5}).rotate().resize(1920,1920,{fit:'inside',withoutEnlargement:true}).webp({quality,effort:4}).toBuffer();if(bytes.length<=300*1024)break;}
  if(!bytes||bytes.length>1024*1024)throw new Error('Normalized image too large');
  const out=await sharp(bytes).metadata();if(out.exif||out.xmp||out.iptc||!out.width||!out.height||Math.max(out.width,out.height)>1920)throw new Error('Metadata retained');
  return {bytes,width:out.width,height:out.height,format:'webp' as const,source_format:m.format,metadata_removed:true};
 }catch{throw new RoadError('PHOTO_TOKEN_INVALID');}
}
