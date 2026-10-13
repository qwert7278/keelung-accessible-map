import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readBounded} from '../server/mcp/handler.js';
import {publicMcpEndpoint} from '../server/mcp/public.js';
import {PublicSupabaseBackend} from '../server/roadtag/public-supabase.js';
import {RoadTagService} from '../server/roadtag/service.js';

// Finite tools may wait on a stream/upstream; cancellation must finish local work.
const abort=new AbortController();let cancelled=false;
const stalled=new ReadableStream<Uint8Array<ArrayBuffer>>({cancel(){cancelled=true;return new Promise(()=>{});}});
const pending=readBounded({body:stalled},524288,abort.signal);abort.abort();
await assert.rejects(Promise.race([pending,new Promise((_,reject)=>setTimeout(()=>reject(Error('CANCEL_HUNG')),100))]),error=>error instanceof Error&&error.message!=='CANCEL_HUNG');assert(cancelled);
await assert.rejects(readBounded({body:new ReadableStream({start(c){c.enqueue(new Uint8Array(524289));c.close();}})},524288),{message:'INVALID_INPUT'});

const origin='https://test.example',headers={'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
const request=(name:string,args:unknown,signal?:AbortSignal)=>new Request(origin+'/api/mcp-public',{method:'POST',headers,signal,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
const service=new RoadTagService(new PublicSupabaseBackend('https://wpravdqviylkcpsioybu.supabase.co','sb_publishable_fixture'),origin,'');
let reads=0,releases=0,costs=0;
const late=publicMcpEndpoint(service,{enabled:true,origin,riskSecret:'fixture'.repeat(8),timeoutMs:10,observe:()=>{},controls:{acquire:async(_risk,kind)=>{if(kind==='geocode')costs++;await new Promise(r=>setTimeout(r,30));return {allowed:true,lease:randomUUID()};},release:async()=>{releases++;}}});
const realFetch=globalThis.fetch;
globalThis.fetch=async()=>{reads++;throw Error('Unexpected call after admission cancellation');};
try{assert.equal((await late(request('get_report',{report_id:randomUUID()}))).status,503);await new Promise(r=>setTimeout(r,40));assert.equal(reads,0);assert.equal(costs,0);assert.equal(releases,1);}finally{globalThis.fetch=realFetch;}

const saved={...process.env};let providerCalls=0,providerAborted=0;
globalThis.fetch=async(input,init)=>{
 const u=new URL(String(input));assert.equal(u.hostname,'api.geoapify.com');providerCalls++;
 return new Promise<Response>((_resolve,reject)=>{const signal=init?.signal;assert(signal);const stop=()=>{providerAborted++;reject(new Error('ABORTED_FIXTURE'));};if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});});
};
try{
 process.env.GEOAPIFY_LOCATION_ENABLED='true';process.env.GEOAPIFY_API_KEY='isolated-fixture';
 const endpoint=publicMcpEndpoint(service,{enabled:true,origin,riskSecret:'fixture'.repeat(8),timeoutMs:20,observe:()=>{},controls:{acquire:async()=>({allowed:true,lease:randomUUID()}),release:async()=>{releases++;}}});
 assert.equal((await endpoint(request('resolve_location',{query:'基隆車站'}))).status,503);
 await new Promise(r=>setTimeout(r,30));assert.equal(providerCalls,1);assert.equal(providerAborted,1);assert.equal(releases,2);
 // A cancelled request cannot acquire another provider call after receiving quota.
 const clientAbort=new AbortController();clientAbort.abort();await endpoint(request('resolve_location',{query:'基隆車站'},clientAbort.signal));assert.equal(providerCalls,1);
}finally{globalThis.fetch=realFetch;process.env=saved;}

let pages=0,readAborted=0;
globalThis.fetch=async(_input,init)=>{pages++;return new Promise<Response>((_resolve,reject)=>{const signal=init?.signal;assert(signal);signal.addEventListener('abort',()=>{readAborted++;reject(Error('cancelled'));},{once:true});});};
try{
 const endpoint=publicMcpEndpoint(service,{enabled:true,origin,riskSecret:'fixture'.repeat(8),timeoutMs:20,observe:()=>{},controls:{acquire:async()=>({allowed:true,lease:randomUUID()}),release:async()=>{releases++;}}});
 assert.equal((await endpoint(request('search_nearby_reports',{lat:25.128,lng:121.741}))).status,503);await new Promise(r=>setTimeout(r,30));assert.equal(pages,1);assert.equal(readAborted,1);
}finally{globalThis.fetch=realFetch;}
console.log('PASS P2A-FIX: bounded stream cancellation, cap, late admission release, upstream abort and no follow-up calls. Local isolated evidence.');
