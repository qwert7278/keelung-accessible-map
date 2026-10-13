// Acceptance fixture only. The temporary API entry point must be removed after QA.
import {timingSafeEqual} from 'node:crypto';
import {waitUntil} from '@vercel/functions';
import {publicEnvironment,publicMcpEndpoint} from '../../server/mcp/public.js';
import {PublicSupabaseBackend} from '../../server/roadtag/public-supabase.js';
import {RoadTagService} from '../../server/roadtag/service.js';
import {RoadError,type PublicRow} from '../../server/roadtag/contracts.js';
const origin='https://keelung-accessible-map-git-code-e64c38-masons-projects-2c78a251.vercel.app';
export function hostedFixtureAuthorized(request:Request,env:Record<string,string|undefined>=process.env){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/roadtag-p2a-02'||env.MCP_PUBLIC_READ_ENABLED!=='true'||env.MCP_PUBLIC_READ_ORIGIN!==origin)return false;
 if(request.method!=='POST'||new URL(request.url).origin!==origin||new URL(request.url).pathname!=='/api/mcp-hosted-acceptance'||request.headers.has('origin')&&request.headers.get('origin')!==origin)return false;
 const key=env.MCP_PUBLIC_CONTROL_SECRET||'',provided=request.headers.get('x-roadtag-hosted-test-key')||'';
 if(key.length<32||key.length>128||provided.length!==key.length)return false;
 const expected=Buffer.from(key),actual=Buffer.from(provided);return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
class StalledReadBackend extends PublicSupabaseBackend{
 constructor(private endpoint:string,private pubKey:string,private abortSignal?:AbortSignal){super(endpoint,pubKey,abortSignal);}
 override withSignal(signal:AbortSignal){return new StalledReadBackend(this.endpoint,this.pubKey,signal);}
 override async feed():Promise<PublicRow[]>{
  const signal=this.abortSignal;if(!signal)throw new RoadError('SERVICE_UNAVAILABLE');
  const started=Date.now();return new Promise<PublicRow[]>((_resolve,reject)=>{const abort=()=>{console.info(JSON.stringify({event:'mcp_hosted_fixture',upstream_aborted:true,duration_ms:Date.now()-started}));reject(new RoadError('SERVICE_UNAVAILABLE'));};if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
 }
}
export async function hostedFaultFixture(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(!hostedFixtureAuthorized(request))return new Response(null,{status:404,headers});
 const config=publicEnvironment();if(!config)return Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503,headers});
 const backend=new StalledReadBackend(process.env.MCP_PUBLIC_READ_SUPABASE_URL!,process.env.MCP_PUBLIC_READ_SUPABASE_PUBLISHABLE_KEY!);
 return publicMcpEndpoint(new RoadTagService(backend,origin,''),{...config.settings,waitUntil})(request);
}
