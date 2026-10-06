// Child-process regression probe. Input is an ignored, local-only test file.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {startLocal} from './mcp-local-server.js';
import {hash} from '../server/roadtag/service.js';
const input=JSON.parse(await readFile(process.argv[2],'utf8'));
const app=await startLocal(input.root,input.settings,input.secret),client=new Client({name:'restart-probe',version:'1'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
try{
 await client.connect(new StreamableHTTPClientTransport(new URL(app.origin+'/api/mcp'),{requestInit:{headers:{authorization:'Bearer '+input.credential}}}));
 const report=(await client.callTool({name:'create_report',arguments:input.fields})).structuredContent as {ok:boolean;data:Record<string,unknown>};assert.equal(report.ok,true);
 assert.equal(report.data.report_id,input.fields.operation_id);
 assert.equal(report.data.replayed,true);
 const observation=(await client.callTool({name:'add_observation',arguments:input.observation})).structuredContent as {ok:boolean;data:Record<string,unknown>};assert.equal(observation.ok,true);
 assert.equal(observation.data.observation_id,input.observationId);
 assert.equal(hash(await app.backend.bytes(input.path,input.settings.principals[0])),input.photoDigest);
 console.log('Separate OS process replays original IDs and reads identical immutable photo bytes.');
}finally{await client.close();await app.close();}
