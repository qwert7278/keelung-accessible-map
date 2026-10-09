import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {buildMcpServer} from '../server/mcp/handler.js';
import {RoadTagService} from '../server/roadtag/service.js';
import type {Backend} from '../server/roadtag/contracts.js';
const original=globalThis.fetch;
process.env.GEOAPIFY_LOCATION_ENABLED='true';process.env.GEOAPIFY_API_KEY='mock-only';
const backend:Backend={rpc:async()=>{throw Error('Unexpected write');},feed:async()=>[],observations:async()=>[],put:async()=>{throw Error('Unexpected write');},bytes:async()=>{throw Error('Unexpected photo');},photoUrl:()=>''};
const service=new RoadTagService(backend,'https://test.example','mock-only');
globalThis.fetch=async()=>Response.json({results:[{name:'門牌候選',formatted:'基隆市仁愛區精一路19-1號',country_code:'tw',lat:25.1263728,lon:121.7413938,result_type:'building',rank:{confidence:0.5,match_type:'street'}}]});
const handler=createMcpHandler(()=>buildMcpServer((name,input)=>service.call(name,input,{id:'mock-geo',actor:'4344137e-51fe-4580-8966-5527691fbbad',write:false}),{securitySchemes:[{type:'oauth2',scopes:['openid']}],attachmentProbe:true}),{legacy:'stateless'});
const client=new Client({name:'geo-regression',version:'1'});
try{
 await client.connect(new StreamableHTTPClientTransport(new URL('https://test.example/api/mcp-chatgpt'),{fetch:async(input,init)=>handler.fetch(new Request(input,init))}));
 assert.equal((await client.listTools()).tools.length,5);
 const r=await client.callTool({name:'resolve_location',arguments:{query:'基隆市仁愛區精一路19之1號',city_hint:'基隆市'}});
 const body=r.structuredContent as {ok:boolean;data:{needs_confirmation:boolean;candidates:{lat:number;lng:number;city_id:string;district:string;confidence:number;precision:string}[]}};
 assert.equal(body.ok,true);assert.equal(body.data.needs_confirmation,true);assert.equal(body.data.candidates[0].city_id,'TW-KEE');assert.equal(body.data.candidates[0].district,'仁愛區');assert.equal(body.data.candidates[0].precision,'street');
 const point=body.data.candidates[0];const nearby=await client.callTool({name:'search_nearby_reports',arguments:{lat:point.lat,lng:point.lng,radius_m:500}});assert.equal((nearby.structuredContent as {ok:boolean}).ok,true);
 const denied=await client.callTool({name:'create_report',arguments:{confirmed:false}});assert.equal((denied.structuredContent as {ok:boolean}).ok,false);
 console.log('PASS query MCP transport, unchanged five tools, candidate coordinates/precision, nearby handoff and write denial');
}finally{await client.close();globalThis.fetch=original;delete process.env.GEOAPIFY_API_KEY;delete process.env.GEOAPIFY_LOCATION_ENABLED;}
