// Only run after explicit owner approval of staging quota-state writes.
// This is a real HTTPS SDK harness, not evidence until executed against Preview.
import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {z} from 'zod';
async function main(){
const url=new URL(process.env.MCP_HOSTED_PREVIEW_URL||'http://invalid');
// Pin independently from authenticated Vercel deployment metadata, not user input.
const approvedOrigin=z.string().url().parse(process.env.MCP_HOSTED_APPROVED_PREVIEW_ORIGIN);
assert(process.env.MCP_HOSTED_TEST_AUTHORIZED==='true','Owner approval is required before setting the test gate; the gate alone is not consent.');
assert(url.protocol==='https:'&&url.hostname.startsWith('keelung-accessible-')&&url.hostname.endsWith('.vercel.app')&&url.pathname==='/api/mcp-public'&&!url.username&&!url.password&&!url.search&&!url.hash,'Use the exact current Preview endpoint, never Production.');
assert(url.origin===approvedOrigin,'Only the independently approved exact Preview origin may receive protection credentials.');
const id=z.uuid().parse(process.env.MCP_HOSTED_REPORT_ID),sha=z.string().regex(/^[0-9a-f]{40}$/).parse(process.env.MCP_HOSTED_EXPECTED_SHA);
const client=new Client({name:'roadtag-hosted-acceptance',version:'1.0.0'},{supportedProtocolVersions:['2025-11-25']});
const fetchPreview:typeof fetch=async(input,init)=>{
 const request=new Request(input,init);assert(new URL(request.url).origin===url.origin,'Never forward protection credentials to another origin.');
 const headers=new Headers(request.headers);
 if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)headers.set('x-vercel-protection-bypass',process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
 return fetch(new Request(request,{headers,redirect:'error',signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)])}));
};
const result=z.object({ok:z.boolean(),data:z.record(z.string(),z.unknown()).optional(),error:z.object({code:z.string()}).optional()});
async function call(name:string,args:Record<string,unknown>){
 const output=await client.callTool({name,arguments:args});
 const body=result.parse(output.structuredContent);assert(body.ok,'Expected a successful '+name+' public read');
 const serialized=JSON.stringify(output);
 for(const field of ['created_by','admin_note','image_path','photo_token','credentialHash'])assert(!serialized.includes('"'+field+'"'),'Private output field found');
 console.log(JSON.stringify({test:name,status:'PASS'}));return body.data!;
}
try{
 await client.connect(new StreamableHTTPClientTransport(url,{protocolVersion:'2025-11-25',fetch:fetchPreview}));
 assert.deepEqual((await client.listTools()).tools.map(t=>t.name).sort(),['get_report','resolve_location','search_nearby_reports']);
 console.log(JSON.stringify({test:'initialize/list',status:'PASS',expected_sha:sha,target:url.origin,time:new Date().toISOString()}));
 const detail=await call('get_report',{report_id:id,include_observations:true});
 const report=z.object({id:z.uuid(),lat:z.number().finite(),lng:z.number().finite()}).parse(detail.report);assert.equal(report.id,id);
 await call('resolve_location',{lat:report.lat,lng:report.lng});
 await call('search_nearby_reports',{lat:report.lat,lng:report.lng,radius_m:500,include_resolved:true});
 if(process.env.MCP_HOSTED_ALLOW_GEOCODE==='true')await call('resolve_location',{query:'基隆車站',city_hint:'基隆市'});else console.log(JSON.stringify({test:'address/geocode',status:'PENDING',reason:'Requires provider-budget approval'}));
 for(const name of ['create_report','add_observation']){
  let denied=false;try{const output=await client.callTool({name,arguments:{confirmed:true}});denied=output.isError===true;}catch{denied=true;}assert(denied,'Write tool must be absent');
 }
 const invalid=await client.callTool({name:'get_report',arguments:{report_id:'invalid'}});assert.equal(invalid.isError,true);
 console.log(JSON.stringify({test:'writes/invalid-id',status:'PASS'}));
}finally{await client.close();}
}
await main().catch(()=>{
 // This also covers malformed configuration; never log raw URLs/tokens/errors.
 console.error(JSON.stringify({status:'FAIL',reason:'Hosted configuration/protocol assertion failed; inspect sanitized operator evidence.'}));process.exitCode=1;
});
