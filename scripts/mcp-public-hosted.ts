// Only run after explicit owner approval of the target's test window.
// This is a real HTTPS SDK harness, not evidence until executed against that target.
import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {z} from 'zod';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function publicHostedConfiguration(){
const url=new URL(process.env.MCP_HOSTED_PREVIEW_URL||'http://invalid');
const production=process.env.MCP_PRODUCTION_TEST_AUTHORIZED==='true';
// Pin independently from authenticated Vercel deployment metadata, not user input.
const approvedOrigin=z.string().url().parse(process.env[production?'MCP_HOSTED_APPROVED_PRODUCTION_ORIGIN':'MCP_HOSTED_APPROVED_PREVIEW_ORIGIN']);
assert(process.env.MCP_HOSTED_TEST_AUTHORIZED==='true','Owner approval is required before setting the test gate; the gate alone is not consent.');
assert(url.protocol==='https:'&&(production?url.origin==='https://roadtag.org':url.hostname.startsWith('keelung-accessible-')&&url.hostname.endsWith('.vercel.app'))&&url.pathname==='/api/mcp-public'&&!url.username&&!url.password&&!url.search&&!url.hash,'Use the exact independently approved endpoint.');
if(production)assert(approvedOrigin==='https://roadtag.org'&&!process.env.VERCEL_AUTOMATION_BYPASS_SECRET&&!process.env.MCP_HOSTED_CREDENTIAL_FILE,'Production acceptance must be anonymous, without Preview test credentials.');
assert(url.origin===approvedOrigin,'Only the independently approved exact Preview origin may receive protection credentials.');
const id=z.uuid().parse(process.env.MCP_HOSTED_REPORT_ID),sha=z.string().regex(/^[0-9a-f]{40}$/).parse(process.env.MCP_HOSTED_EXPECTED_SHA);
return {url,id,sha,production};
}
async function main(){
const {url,id,sha,production}=publicHostedConfiguration();
const client=new Client({name:'roadtag-hosted-acceptance',version:'1.0.0'},{supportedProtocolVersions:['2025-11-25']});
const fetchPreview:typeof fetch=async(input,init)=>{
 const request=new Request(input,init);assert(new URL(request.url).origin===url.origin,'Never forward protection credentials to another origin.');
 const headers=new Headers(request.headers);
 if(production)for(const name of ['authorization','cookie','x-vercel-protection-bypass','x-roadtag-control-key'])assert(!headers.has(name),'No private credentials in public acceptance');
 if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)headers.set('x-vercel-protection-bypass',process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
 return fetch(new Request(request,{headers,redirect:'error',signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)])}));
};
const result=z.object({ok:z.boolean(),data:z.record(z.string(),z.unknown()).optional(),error:z.object({code:z.string()}).optional()});
const evidence:Record<string,unknown>={client:'official-typescript-sdk',protocol:'2025-11-25',sha,target:url.origin,production,anonymous:production,time:new Date().toISOString(),tools:['get_report','resolve_location','search_nearby_reports']};
const publicSummary=(row:Record<string,unknown>)=>Object.fromEntries(['id','lat','lng','url','status','city_id','city_name','district'].filter(k=>k in row).map(k=>[k,row[k]]));
async function call(name:string,args:Record<string,unknown>){
 const output=await client.callTool({name,arguments:args});
 const body=result.parse(output.structuredContent);assert(body.ok,'Expected a successful '+name+' public read');
 const serialized=JSON.stringify(output);
 for(const field of ['created_by','admin_note','image_path','photo_token','credentialHash'])assert(!serialized.includes('"'+field+'"'),'Private output field found');
 const data=body.data!;
 if(!(name in evidence))evidence[name]=name==='get_report'?publicSummary(z.record(z.string(),z.unknown()).parse(data.report)):name==='search_nearby_reports'?{reports:z.array(z.record(z.string(),z.unknown())).parse(data.reports).map(publicSummary),truncated:data.truncated}:publicSummary(data);
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
 evidence.writes_unavailable=true;evidence.invalid_id_denied=true;evidence.private_fields_absent=true;
 if(process.env.MCP_HOSTED_EVIDENCE_FILE)await writeFile(process.env.MCP_HOSTED_EVIDENCE_FILE,JSON.stringify(evidence,null,2)+'\n');
}finally{await client.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main().catch(()=>{
 // This also covers malformed configuration; never log raw URLs/tokens/errors.
 console.error(JSON.stringify({status:'FAIL',reason:'Hosted configuration/protocol assertion failed; inspect sanitized operator evidence.'}));process.exitCode=1;
});
