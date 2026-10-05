import {environment} from '../server/mcp/config.js';
import {photoEndpoint} from '../server/mcp/handler.js';
export const maxDuration=30;
// Reserve JSON, upload <=1 MiB processed bytes, then finalize. Never raw/base64 photo input.
export async function POST(request:Request){const config=environment();if(!config)return Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503});
 const url=new URL(request.url);if(url.searchParams.get('finalize')==='1')url.pathname+='/finalize';else if(url.searchParams.get('upload')==='1')url.pathname+='/upload';
 return photoEndpoint(config.service,config.settings)(new Request(url,request));
}
