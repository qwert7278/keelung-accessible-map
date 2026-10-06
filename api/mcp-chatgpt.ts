import {oauthEndpoint,oauthEnvironment} from '../server/mcp/oauth.js';
export const maxDuration=30;
export async function POST(request:Request){const c=oauthEnvironment();return c?oauthEndpoint(c)(request):Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503});}
export const GET=POST;
export const DELETE=POST;
