import {createServer,type IncomingMessage} from 'node:http';
import {readFile} from 'node:fs/promises';
import {type ViteDevServer} from 'vite';
import {mcpEndpoint,photoEndpoint,type Settings} from '../server/mcp/handler.js';
import {RoadTagService} from '../server/roadtag/service.js';
import {safeError} from '../server/roadtag/contracts.js';
import {LocalBackend} from './mcp-local-backend.js';
export async function startLocal(root:string,settings:Settings,secret:string,port=0,vite?:ViteDevServer){
 const server=createServer(async(req,res)=>{
  const rawHost=req.headers.host;
  if(rawHost!==new URL(settings.origin).host){res.writeHead(403);res.end();return;}
  if(vite&&req.url&&/^(\/src\/|\/tests\/mcp-uploader.ts|\/@|\/node_modules\/)/.test(req.url)){vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});return;}
  try{
   const url=new URL(req.url||'/',settings.origin),request=toRequest(req,url),path=url.pathname;let response:Response;
   if(path==='/api/mcp')response=await mcpEndpoint(service,settings)(request);
   else if(path==='/api/mcp-photo'||path==='/api/mcp-photo/finalize'||path==='/api/mcp-photo/upload')response=await photoEndpoint(service,settings)(request);
   else if(path.startsWith('/local-storage/')){
    const object=path.slice('/local-storage/'.length);
    if(req.method==='GET'){response=new Response(await readFile(backend.path(object)),{headers:{'Content-Type':object.endsWith('.jpg')?'image/jpeg':'image/webp'}});}
    else response=new Response(null,{status:405});
   }else if(path==='/map'){
    const rows=await backend.feed({id:url.searchParams.get('report')||''},0,1);
    if(!rows.length)response=new Response('Not found',{status:404});else{
     // A local public verification viewer, not a second Production frontend.
     const data=JSON.stringify(service.publicReport(rows[0])).replaceAll('<','\\u003c');
     response=new Response(`<html lang="zh-Hant"><meta charset="utf-8"><title>Road Tag 本地案件驗證</title><h1></h1><p></p><img alt="現場照片"><script>const r=${data};document.querySelector('h1').textContent=r.title;document.querySelector('p').textContent=r.description;document.querySelector('img').src=r.before_image_url;</script></html>`,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    }
   }else if(path==='/handoff'&&vite){response=new Response(await vite.transformIndexHtml('/handoff',await readFile('tests/mcp-uploader.html','utf8')),{headers:{'Content-Type':'text/html; charset=utf-8'}});}
   else response=new Response('Not found',{status:404});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:safeError(e)}));}
 });
 await new Promise<void>(resolve=>server.listen(port,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Local server address unavailable');
 settings.origin=`http://127.0.0.1:${address.port}`;
 const backend=await LocalBackend.open(root,settings.origin);for(const p of settings.principals)await backend.register(p);
 const service=new RoadTagService(backend,settings.origin,secret);
 return {backend,service,origin:settings.origin,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await backend.db.close();}};
}
function toRequest(req:IncomingMessage,url:URL){
 const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
 const hasBody=req.method!=='GET'&&req.method!=='HEAD';
 let closed=false;
 return new Request(url,{method:req.method,headers,...(hasBody?{body:new ReadableStream({start(controller){req.on('data',chunk=>{if(!closed)controller.enqueue(chunk);});req.on('end',()=>{if(!closed){closed=true;controller.close();}});req.on('error',e=>{if(!closed){closed=true;controller.error(e);}});},cancel(){closed=true;req.resume();}}),duplex:'half'}:{})} as RequestInit);
}
