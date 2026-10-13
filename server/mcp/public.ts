import {createMcpHandler} from '@modelcontextprotocol/server';
import {buildMcpServer,publicReadTools,readBounded} from './handler.js';
import {RoadTagService} from '../roadtag/service.js';
import {RoadError,schemas,type Principal} from '../roadtag/contracts.js';
import {PublicSupabaseBackend} from '../roadtag/public-supabase.js';
import {observePublic,publicRisk,PublicControlClient,type PublicControls,type PublicEvent} from './public-controls.js';
export type PublicSettings={enabled:boolean;origin:string;controls?:PublicControls;riskSecret?:string;trustVercel?:boolean;timeoutMs?:number;waitUntil?:(task:Promise<void>)=>void;observe?:(event:PublicEvent)=>void};
export function publicMcpEndpoint(service:RoadTagService,settings:PublicSettings){
 return async(request:Request):Promise<Response>=>{
  const started=Date.now(),headers={'Cache-Control':'no-store'};
  const emit=(operation:PublicEvent['operation'],outcome:PublicEvent['outcome'],start:number,status?:number)=>{try{(settings.observe||observePublic)({event:'mcp_public',operation,outcome,duration_ms:Math.max(0,Date.now()-start),...(status?{http_status:status}:{})});}catch{/* Observability must not change tool outcomes. */}};
  const fail=(status:number,code:string,retry?:number)=>Response.json({error:{code}},{status,headers:{...headers,...(retry?{'Retry-After':String(retry)}:{})}});
  if(!settings.enabled){emit('request','SERVICE_UNAVAILABLE',started,503);return fail(503,'SERVICE_UNAVAILABLE');}
  if(new URL(request.url).origin!==settings.origin||(request.headers.has('origin')&&request.headers.get('origin')!==settings.origin)){emit('request','ERROR',started,403);return fail(403,'FORBIDDEN');}
  if(!settings.controls||!settings.riskSecret||settings.riskSecret.length<32){emit('request','SERVICE_UNAVAILABLE',started,503);return fail(503,'SERVICE_UNAVAILABLE');}
  if(request.method!=='POST'){emit('request','ERROR',started,405);return new Response(null,{status:405,headers:{...headers,Allow:'POST'}});}
  const controls=settings.controls,risk=publicRisk(request,settings.riskSecret,settings.trustVercel),abort=new AbortController();
  const signal=AbortSignal.any([abort.signal,request.signal]);
  const principal:Principal={id:'public:'+risk,actor:'00000000-0000-4000-8000-000000000000',write:false};
  const scoped=service.backend instanceof PublicSupabaseBackend?new RoadTagService(service.backend.withSignal(signal),service.origin,''):service;
  let lease:string|undefined;
  const work=async()=>{
   try{
    signal.throwIfAborted();
    const admitted=await controls.acquire(risk,'request');
    if(admitted.allowed&&admitted.lease)lease=admitted.lease;
    signal.throwIfAborted();
    if(!admitted.allowed)return fail(admitted.code==='RATE_LIMITED'?429:503,admitted.code||'SERVICE_UNAVAILABLE',admitted.retry_after);
    if(!admitted.lease)return fail(503,'SERVICE_UNAVAILABLE');
    const handler=createMcpHandler(()=>buildMcpServer(async(name,input)=>{
     const start=Date.now();
     try{
      signal.throwIfAborted();
      if(!(publicReadTools as readonly string[]).includes(name))throw new RoadError('FORBIDDEN');
      const geo=name==='resolve_location'?schemas.resolve_location.safeParse(input):null;
      if(geo?.success&&geo.data.query&&geo.data.query.length>=2&&geo.data.lat===undefined&&geo.data.lng===undefined&&process.env.GEOAPIFY_LOCATION_ENABLED==='true'&&process.env.GEOAPIFY_API_KEY){
       const cost=await controls.acquire(risk,'geocode',lease);if(!cost.allowed)throw new RoadError(cost.code||'SERVICE_UNAVAILABLE');
      }
      signal.throwIfAborted();const value=await scoped.call(name,input,principal,signal);emit(name as PublicEvent['operation'],'OK',start);return value;
     }catch(error){emit(name as PublicEvent['operation'],signal.aborted?'TIMEOUT':error instanceof RoadError&&error.code==='RATE_LIMITED'?'RATE_LIMITED':'ERROR',start);throw error;}
    },{publicReadOnly:true}),{legacy:'stateless',maxRequestBodySize:32768});
    const response=await handler.fetch(new Request(request,{signal}));
    // Hold the lease until tool/SSE completion, not merely until headers arrive.
    // No server subscriptions are offered. Bound even an unexpected response body.
    const body=response.body?await readBounded(response,524288,signal):null;
    signal.throwIfAborted();response.headers.set('Cache-Control','no-store');
    return new Response(body,{status:response.status,headers:response.headers});
   }catch{return fail(503,'SERVICE_UNAVAILABLE');}
   finally{if(lease)try{await controls.release(risk,lease);}catch{emit('request','SERVICE_UNAVAILABLE',started);/* SQL lease expires after 30 seconds. No refund/retry. */}}
  };
  let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=new Promise<Response>(resolve=>{timer=setTimeout(()=>{abort.abort();resolve(fail(503,'SERVICE_UNAVAILABLE'));},Math.min(25000,Math.max(1,settings.timeoutMs||25000)));});
  const task=work();
  // Serverless hosts may suspend execution as soon as the deadline responds.
  // Retain the same task so finally can release an existing or late admission.
  settings.waitUntil?.(task.then(()=>undefined));
  try{const response=await Promise.race([task,deadline]);emit('request',signal.aborted?'TIMEOUT':response.status===429?'RATE_LIMITED':response.status>=500?'SERVICE_UNAVAILABLE':response.status>=400?'ERROR':'OK',started,response.status);return response;}
  finally{clearTimeout(timer);}
 };
}
export function publicEnvironment(){
 try{
  // P2A is Preview-only. Production activation needs the separate P2B release gate.
  if(process.env.MCP_PUBLIC_READ_ENABLED!=='true'||process.env.VERCEL_ENV==='production')return null;
  const originUrl=new URL(process.env.MCP_PUBLIC_READ_ORIGIN||''),url=new URL(process.env.MCP_PUBLIC_READ_SUPABASE_URL||'');
  if(originUrl.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(originUrl.hostname))return null;
  if(originUrl.username||originUrl.password||originUrl.pathname!=='/'||originUrl.search||originUrl.hash)return null;
  if(url.origin!=='https://wpravdqviylkcpsioybu.supabase.co'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
  const key=process.env.MCP_PUBLIC_READ_SUPABASE_PUBLISHABLE_KEY,gate=process.env.MCP_PUBLIC_CONTROL_SECRET;
  if(!key||!gate||gate.length<32||gate.length>128||gate===process.env.MCP_PHOTO_SECRET||gate===process.env.UPLOAD_GATE_SECRET)return null;
  return {settings:{enabled:true,origin:originUrl.origin,controls:new PublicControlClient(url.origin,key,gate),riskSecret:gate,trustVercel:process.env.VERCEL==='1'},service:new RoadTagService(new PublicSupabaseBackend(url.origin,key),originUrl.origin,'')};
 }catch{return null;}
}
