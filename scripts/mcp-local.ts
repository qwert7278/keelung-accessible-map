import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {createServer as createViteServer} from 'vite';
import {hash} from '../server/roadtag/service.js';
import {startLocal} from './mcp-local-server.js';
const root='output/mcp-local';await mkdir(root,{recursive:true});const file=root+'/local-credentials.json';
let identity:{credential:string;actor:string;secret:string};
try{identity=JSON.parse(await readFile(file,'utf8'));}catch{identity={credential:randomBytes(32).toString('base64url'),actor:randomUUID(),secret:randomBytes(32).toString('base64url')};await writeFile(file,JSON.stringify(identity),{mode:0o600});}
const vite=await createViteServer({server:{middlewareMode:true,fs:{allow:[resolve('src'),resolve('tests'),resolve('node_modules')],deny:['**/.env*','**/.git/**','**/output/**']}},appType:'custom'});
const app=await startLocal(root,{enabled:true,origin:'http://127.0.0.1:8787',principals:[{id:'local-alpha',actor:identity.actor,write:true,credentialHash:hash(identity.credential)}]},identity.secret,8787,vite);
console.log(`Local MCP: ${app.origin}/api/mcp\nPhoto handoff: ${app.origin}/handoff\nLocal credential file: ${file} (ignored; do not commit or share).`);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().then(()=>vite.close()).then(()=>process.exit(0));});
