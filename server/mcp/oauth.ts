import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey,type JWTPayload} from 'jose';
import {z} from 'zod';
import {hasAttachment,inspectAttachment} from './attachment-probe.js';
import {downloadAttachment,normalizeAttachment} from './attachment-download.js';
import {attachmentPhoto} from './attachment-photo.js';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {buildMcpServer,readBounded} from './handler.js';
import {RoadTagService} from '../roadtag/service.js';
import {SupabaseBackend} from '../roadtag/supabase.js';
import {RoadError,type Principal} from '../roadtag/contracts.js';
const STAGING='https://wpravdqviylkcpsioybu.supabase.co';
const mapping=z.array(z.strictObject({id:z.string().min(1).max(100),actor:z.uuid(),write:z.boolean()})).min(1);
export type OAuthConfig={origin:string;resource:string;issuer:string;serviceKey:string;publishable:string;sessionKey:string;photoSecret:string;principals:Principal[];clients:string[]};
export function oauthEnvironment():OAuthConfig|null{
 try{
  if(process.env.VERCEL_ENV!=='preview'||process.env.MCP_ENABLED!=='true'||process.env.MCP_OAUTH_ENABLED!=='true'||process.env.MCP_SUPABASE_URL!==STAGING)return null;
  const origin=new URL(process.env.MCP_PUBLIC_ORIGIN||'');
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.port||!origin.hostname.endsWith('.vercel.app')||origin.pathname!=='/'||origin.search||origin.hash)return null;
  const serviceKey=process.env.MCP_SUPABASE_SERVICE_KEY||'',publishable=process.env.MCP_SUPABASE_PUBLISHABLE_KEY||'',sessionKey=process.env.MCP_SESSION_ENCRYPTION_KEY||'',photoSecret=process.env.MCP_PHOTO_SECRET||'';
  if(!serviceKey||!publishable.startsWith('sb_publishable_')||serviceKey===publishable||!/^[0-9a-f]{64}$/.test(sessionKey)||photoSecret.length<32)return null;
  const principals=mapping.parse(JSON.parse(process.env.MCP_OAUTH_PRINCIPALS_JSON||'[]')),clients=z.array(z.uuid()).parse(JSON.parse(process.env.MCP_OAUTH_CLIENTS_JSON||'[]'));
  if(new Set(principals.map(p=>p.actor)).size!==principals.length||new Set(principals.map(p=>p.id)).size!==principals.length)return null;
  return {origin:origin.origin,resource:origin.origin+'/api/mcp-chatgpt',issuer:STAGING+'/auth/v1',serviceKey,publishable,sessionKey,photoSecret,principals,clients};
 }catch{return null;}
}
export function challenge(c:OAuthConfig,error='invalid_token'){
 return 'Bearer resource_metadata="'+c.origin+'/api/mcp-oauth-resource", scope="openid", error="'+error+'", error_description="Road Tag staging OAuth authentication required"';
}
export function resourceMetadata(c:OAuthConfig){return {resource:c.resource,authorization_servers:[c.issuer],scopes_supported:['openid'],bearer_methods_supported:['header']};}
export async function verifyOAuth(token:string,c:OAuthConfig,key:JWTVerifyGetKey):Promise<{principal:Principal;claims:JWTPayload}>{
 try{
  const {payload}=await jwtVerify(token,key,{issuer:c.issuer,audience:'authenticated',algorithms:['ES256','RS256'],requiredClaims:['exp','iat','sub','client_id','resource']});
  if(payload.is_anonymous!==false||payload.role!=='authenticated'||payload.resource!==c.resource||typeof payload.client_id!=='string'||!c.clients.includes(payload.client_id))throw new Error('Invalid policy');
  const principal=c.principals.find(p=>p.actor===payload.sub);if(!principal)throw new RoadError('FORBIDDEN');
  return {principal,claims:payload};
 }catch(e){if(e instanceof RoadError)throw e;throw new RoadError('AUTH_REQUIRED');}
}
const keys=new Map<string,JWTVerifyGetKey>();
function signingKeys(c:OAuthConfig){let k=keys.get(c.issuer);if(!k){k=createRemoteJWKSet(new URL(c.issuer+'/.well-known/jwks.json'),{timeoutDuration:5000,cooldownDuration:30000});keys.set(c.issuer,k);}return k;}
export function oauthEndpoint(c:OAuthConfig){
 return async(request:Request):Promise<Response>=>{
  const url=new URL(request.url);
  if(url.origin!==c.origin||url.pathname!=='/api/mcp-chatgpt'||(request.headers.has('origin')&&request.headers.get('origin')!==c.origin))return Response.json({error:{code:'FORBIDDEN'}},{status:403});
  if(!['POST','GET','DELETE'].includes(request.method))return new Response(null,{status:405});
  // Discovery exposes only descriptors. Never let anonymous requests execute any tool.
  let rpc:unknown;
  if(request.method==='POST'){
   try{rpc=JSON.parse(Buffer.from(await readBounded(request,32768)).toString('utf8'));}catch{return Response.json({error:{code:'INVALID_INPUT'}},{status:400});}
  }
  const method=typeof rpc==='object'&&rpc!==null&&!Array.isArray(rpc)?(rpc as {method?:unknown}).method:null;
  const discovery=request.method==='GET'||['server/discover','initialize','tools/list','notifications/initialized','ping'].includes(String(method));
  let principal:Principal|undefined;let clientId:string|undefined;const bearer=request.headers.get('authorization')||'',token=bearer.startsWith('Bearer ')?bearer.slice(7):'';
  if(token){
   try{const verified=await verifyOAuth(token,c,signingKeys(c));principal=verified.principal;clientId=String(verified.claims.client_id);}catch{return Response.json({error:{code:'AUTH_REQUIRED'}},{status:401,headers:{'WWW-Authenticate':challenge(c),'Cache-Control':'no-store'}});}
  }else if(!discovery)return Response.json({error:{code:'AUTH_REQUIRED'}},{status:401,headers:{'WWW-Authenticate':challenge(c),'Cache-Control':'no-store'}});
  const backend=principal?new SupabaseBackend(STAGING,c.serviceKey,c.publishable,c.sessionKey,{actor:principal.actor,token}):undefined;
  const service=backend?new RoadTagService(backend,c.origin,c.photoSecret):undefined;
  const handler=createMcpHandler(()=>buildMcpServer(async(name,input)=>{
   if(!principal||!service||!backend)throw new RoadError('AUTH_REQUIRED');
   const live=await backend.rpc('mcp_oauth_actor',{p:principal.id,a:principal.actor,c:clientId,r:c.resource});
   if(live.actor!==principal.actor||live.can_write!==principal.write)throw new RoadError('FORBIDDEN');
   if(hasAttachment(name,input)){
    if(!principal.write)throw new RoadError('FORBIDDEN');const facts=inspectAttachment(name,input);
    await backend.rpc('mcp_attachment_download_budget',{p:principal.id});
    const file=(input as {photo_file:{download_url:string}}).photo_file;
    const image=await normalizeAttachment(await downloadAttachment(file.download_url));
    const finalized=await attachmentPhoto(service,name,input,principal,image.bytes);
    return {...facts,mode:'attachment_photo_token',token_generated:!!finalized.photo_token,expires_at:finalized.expires_at,downloaded:true,database_written:true,report_written:false,photo_written:true,normalized:{format:image.format,source_format:image.source_format,bytes:image.bytes.length,width:image.width,height:image.height,metadata_removed:image.metadata_removed}};
   }
   return service.call(name,input,principal);
  },{securitySchemes:[{type:'oauth2',scopes:['openid']}],challenge:challenge(c),attachmentProbe:true}),{legacy:'stateless',maxRequestBodySize:32768});
  try{
   const replay=request.method==='POST'?new Request(request.url,{method:request.method,headers:request.headers,body:JSON.stringify(rpc)}):request;
   const response=await handler.fetch(replay);response.headers.set('Cache-Control','no-store');return response;
  }catch{return Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503});}
 };
}
