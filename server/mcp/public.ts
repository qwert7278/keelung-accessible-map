import {createMcpHandler} from '@modelcontextprotocol/server';
import {buildMcpServer,publicReadTools} from './handler.js';
import {RoadTagService} from '../roadtag/service.js';
import {RoadError,type Principal} from '../roadtag/contracts.js';
import {PublicSupabaseBackend} from '../roadtag/public-supabase.js';
export type PublicSettings={enabled:boolean;origin:string};
export function publicMcpEndpoint(service:RoadTagService,settings:PublicSettings){
 const principal:Principal={id:'public-read',actor:'00000000-0000-4000-8000-000000000000',write:false};
 const handler=createMcpHandler(()=>buildMcpServer(async(name,input)=>{
  if(!(publicReadTools as readonly string[]).includes(name))throw new RoadError('FORBIDDEN');
  return service.call(name,input,principal);
 },{publicReadOnly:true}),{legacy:'stateless',maxRequestBodySize:32768});
 return async(request:Request):Promise<Response>=>{
  const headers={'Cache-Control':'no-store'};
  if(!settings.enabled)return Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503,headers});
  if(new URL(request.url).origin!==settings.origin||(request.headers.has('origin')&&request.headers.get('origin')!==settings.origin))return Response.json({error:{code:'FORBIDDEN'}},{status:403,headers});
  try{const response=await handler.fetch(request);response.headers.set('Cache-Control','no-store');return response;}
  catch{return Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503,headers});}
 };
}
export function publicEnvironment(){
 try{
  // P2A is Preview-only. Production activation needs the separate P2B release gate.
  if(process.env.MCP_PUBLIC_READ_ENABLED!=='true'||process.env.VERCEL_ENV==='production')return null;
  const originUrl=new URL(process.env.MCP_PUBLIC_READ_ORIGIN||''),url=new URL(process.env.MCP_PUBLIC_READ_SUPABASE_URL||'');
  if(originUrl.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(originUrl.hostname))return null;
  if(originUrl.username||originUrl.password||url.username||url.password||url.hostname==='ifcicahnrpkwjcxmnmug.supabase.co')return null;
  const key=process.env.MCP_PUBLIC_READ_SUPABASE_PUBLISHABLE_KEY;if(!key)return null;
  return {settings:{enabled:true,origin:originUrl.origin},service:new RoadTagService(new PublicSupabaseBackend(url.origin,key),originUrl.origin,'')};
 }catch{return null;}
}
