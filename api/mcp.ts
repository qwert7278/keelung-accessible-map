import {environment} from '../server/mcp/config.js';
import {mcpEndpoint} from '../server/mcp/handler.js';
export const maxDuration=30;
export async function POST(request:Request){const config=environment();return config?mcpEndpoint(config.service,config.settings)(request):Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503});}
export const GET=POST;
export const DELETE=POST;
