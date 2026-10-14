import assert from 'node:assert/strict';
import {publicHostedConfiguration} from '../scripts/mcp-public-hosted.js';
const saved={...process.env};
try{
 for(const name of ['VERCEL_AUTOMATION_BYPASS_SECRET','MCP_HOSTED_CREDENTIAL_FILE'])delete process.env[name];
 Object.assign(process.env,{MCP_HOSTED_TEST_AUTHORIZED:'true',MCP_PRODUCTION_TEST_AUTHORIZED:'true',MCP_HOSTED_APPROVED_PRODUCTION_ORIGIN:'https://roadtag.org',MCP_HOSTED_PREVIEW_URL:'https://roadtag.org/api/mcp-public',MCP_HOSTED_REPORT_ID:'00000000-0000-4000-8000-000000000001',MCP_HOSTED_EXPECTED_SHA:'a'.repeat(40)});
 assert.equal(publicHostedConfiguration().production,true,'Explicit owner-approved production harness must support only canonical anonymous URL');
 const valid={...process.env};
 for(const [name,values] of Object.entries({MCP_PRODUCTION_TEST_AUTHORIZED:['false',''],MCP_HOSTED_APPROVED_PRODUCTION_ORIGIN:['https://evil.example'],MCP_HOSTED_PREVIEW_URL:['https://www.roadtag.org/api/mcp-public','http://roadtag.org/api/mcp-public','https://roadtag.org/api/mcp-public?token=fixture','https://roadtag.org/api/mcp-public#x'],VERCEL_AUTOMATION_BYPASS_SECRET:['private-fixture'],MCP_HOSTED_CREDENTIAL_FILE:['private-fixture.json']}))for(const value of values){process.env={...valid,[name]:value};assert.throws(()=>publicHostedConfiguration(),'Reject '+name);}
 console.log('PASS production harness authorization, exact TLS/canonical URL, no Cookie/bypass credentials. No external request made.');
}finally{process.env=saved;}
