import assert from 'node:assert/strict';
import {z} from 'zod';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {buildMcpServer} from '../server/mcp/handler.js';
import {oauthEndpoint,type OAuthConfig} from '../server/mcp/oauth.js';
import {RoadTagService} from '../server/roadtag/service.js';
import {schemas,type Backend,type ToolName} from '../server/roadtag/contracts.js';
// In-memory public fixture only: no hosted writes or external credentials.
const report={id:'4344137e-51fe-4580-8966-5527691fbbad',lat:25.1264515752976,lng:121.741466690645,city_id:'TW-KEE',district:'仁愛區',title:'Read fixture',status:'open'};
let reads=0,calls=0;
const backend:Backend={rpc:async()=>{throw new Error('Unexpected RPC');},feed:async()=>{reads++;return [report];},observations:async()=>{reads++;return [];},put:async()=>{throw new Error('Unexpected write');},bytes:async()=>{throw new Error('Unexpected photo');},photoUrl:()=>''};
const service=new RoadTagService(backend,'https://test.example','local-test-only');
const cases:[ToolName,Record<string,unknown>][]=[['resolve_location',{lat:report.lat,lng:report.lng}],['search_nearby_reports',{lat:report.lat,lng:report.lng,radius_m:500,limit:10,include_resolved:true}],['get_report',{report_id:report.id,include_observations:true}]];
for(const legacy of [true,false]){
 const seen:unknown[]=[];
 const handler=createMcpHandler(()=>buildMcpServer(async(name,input)=>{calls++;seen.push(input);return service.call(name,input,{id:'test',actor:report.id,write:false});},{securitySchemes:[{type:'oauth2',scopes:['openid']}],attachmentProbe:true}),{legacy:'stateless'});
 const client=new Client({name:'read-regression',version:'1'},legacy?{supportedProtocolVersions:['2025-11-25']}:{versionNegotiation:{mode:{pin:'2026-07-28'}}});
 try{
 await client.connect(new StreamableHTTPClientTransport(new URL('https://test.example/api/mcp-chatgpt'),{...(legacy?{protocolVersion:'2025-11-25'}:{}),fetch:async(input,init)=>handler.fetch(new Request(input,init))}));
 const list=await client.listTools();assert.deepEqual(list.tools.map(t=>t.name).sort(),Object.keys(schemas).sort());
 for(const [name,args] of cases){
 const descriptor=list.tools.find(t=>t.name===name)!;assert.equal(descriptor.inputSchema.additionalProperties,false);assert.deepEqual(descriptor.inputSchema,z.toJSONSchema(schemas[name],{io:'input'}));
 const result=await client.callTool({name,arguments:args});assert.equal((result.structuredContent as Record<string,unknown>|undefined)?.ok,true);assert.deepEqual(seen.at(-1),args,'SDK must preserve exact domain argument shape');
 if(name==='get_report'){const data=(result.structuredContent as Record<string,unknown>|undefined)?.data as {report:{id:string;url:string}};assert.equal(data.report.id,report.id);assert.match(data.report.url,/\/map\?.*report=/);}
 console.log('PASS '+(legacy?'2025-11-25':'2026-07-28')+' '+name+' transport/schema/service');
 }
 for(const [name,args] of cases){const before=reads,result=await client.callTool({name,arguments:{...args,unknown_admin:true}});assert.equal((result.structuredContent as Record<string,unknown>|undefined)?.ok,false);assert.equal(((result.structuredContent as Record<string,unknown>|undefined)?.error as {code:string}).code,'INVALID_INPUT');assert.equal(reads,before);}
 const result=await client.callTool({name:'search_nearby_reports',arguments:{lat:report.lat,lng:report.lng,radius_m:5000}});assert.equal(((result.structuredContent as Record<string,unknown>|undefined)?.error as {code:string}).code,'INVALID_INPUT');
 console.log('PASS strict unknown fields and invalid radius rejected before reads');
 }finally{await client.close();}
}
const c:OAuthConfig={origin:'https://test.example',resource:'https://test.example/api/mcp-chatgpt',supabaseUrl:'https://wpravdqviylkcpsioybu.supabase.co',issuer:'https://wpravdqviylkcpsioybu.supabase.co/auth/v1',serviceKey:'sb_secret_local_test',publishable:'sb_publishable_local_test',sessionKey:'a'.repeat(64),photoSecret:'b'.repeat(32),principals:[],clients:[]};
const before=calls;
for(const [name,args] of cases){const response=await oauthEndpoint(c)(new Request(c.resource,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));assert.equal(response.status,401);assert(response.headers.get('WWW-Authenticate')?.includes('resource_metadata'));}
assert.equal(calls,before);console.log('PASS all three anonymous OAuth calls rejected before domain I/O');


