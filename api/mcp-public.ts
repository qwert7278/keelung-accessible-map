import {publicEnvironment,publicMcpEndpoint} from '../server/mcp/public.js';
export const maxDuration=60;
export async function POST(request:Request){
 const config=publicEnvironment();
 return config?publicMcpEndpoint(config.service,config.settings)(request):Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503,headers:{'Cache-Control':'no-store'}});
}
export const GET=POST;
export const DELETE=POST;
