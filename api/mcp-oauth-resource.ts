import {oauthEnvironment,resourceMetadata} from '../server/mcp/oauth.js';
export function GET(){const c=oauthEnvironment();return c?Response.json(resourceMetadata(c),{headers:{'Cache-Control':'no-store'}}):Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503});}
