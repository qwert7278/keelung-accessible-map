// Operator-only, isolated environment. Input file contains an existing non-admin
// actor's access_token/refresh_token; never put them in CLI args or source files.
import {readFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {environment} from '../server/mcp/config.js';
import {SupabaseBackend} from '../server/roadtag/supabase.js';
try{
 const config=environment(),[id,file]=process.argv.slice(2);
 if(!config||!id||!file)throw new Error();
 const within=relative(resolve('output'),resolve(file));
 if(within.startsWith('..')||isAbsolute(within))throw new Error();
 const p=config.settings.principals.find(p=>p.id===id);
 if(!p?.write)throw new Error();
 const backend=new SupabaseBackend(new URL(process.env.MCP_SUPABASE_URL!).origin,process.env.MCP_SUPABASE_SERVICE_KEY!,process.env.MCP_SUPABASE_PUBLISHABLE_KEY!,process.env.MCP_SESSION_ENCRYPTION_KEY!);
 await backend.sessions.provision(p,JSON.parse(await readFile(resolve(file),'utf8')));
 console.log('Isolated actor session provisioned. Securely remove the input file.');
}catch{console.error('Session provisioning failed closed. Check isolated configuration and operator runbook.');process.exitCode=1;}
