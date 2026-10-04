import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {preparePhotoHandler} from '../../supabase/functions/prepare-photo/handler';
import {signGate} from '../../supabase/functions/_shared/uploadGate';
import {cleanupPhotos} from '../../supabase/functions/_shared/cleanup';
const secret='test-only-gate-secret',id='10000000-0000-4000-8000-000000000001',risk='a'.repeat(64);
async function request(body=JSON.stringify({report:id,kind:'before',operation:id}),authorization='Bearer verified') {
 const stamp=String(Date.now());return new Request('https://example.test',{method:'POST',headers:{authorization,'x-roadtag-timestamp':stamp,'x-roadtag-risk-hash':risk,'x-roadtag-signature':await signGate(secret,stamp,risk,authorization,body)},body});
}
describe('trusted photo preparation',()=>{
 it('bounds scheduled batches and leaves backlog indicated for the next run',async()=>{
  const paths=Array.from({length:20},(_,i)=>`expired-${i}.webp`),rpc=vi.fn().mockImplementation(async(name)=>({data:name==='expired_photos'?paths:null,error:null})),remove=vi.fn().mockResolvedValue({error:null});
  const result=await cleanupPhotos({rpc,storage:{from:()=>({remove})}} as unknown as SupabaseClient,2);
  expect(result).toEqual({removed:40,batches:2,more:true});expect(remove).toHaveBeenCalledTimes(2);
 });
 it('rejects missing bearer or unsigned/forged gate before consuming quota',async()=>{
  const authenticate=vi.fn(),maintenance=vi.fn(),handler=preparePhotoHandler({gateSecret:secret,authenticate,maintenance});
  expect((await handler(new Request('https://example.test',{method:'POST',body:'{}'}))).status).toBe(401);
  expect((await handler(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer forged','x-roadtag-risk-hash':risk},body:'{}'}))).status).toBe(403);expect(authenticate).not.toHaveBeenCalled();expect(maintenance).not.toHaveBeenCalled();
 });
 it('valid gate still requires server-verified Auth user',async()=>{
  const maintenance=vi.fn(),handler=preparePhotoHandler({gateSecret:secret,authenticate:async()=>null,maintenance});expect((await handler(await request())).status).toBe(401);expect(maintenance).not.toHaveBeenCalled();
 });
 it('ignores client actor/IP/path and passes only verified user and signed risk',async()=>{
  const rpc=vi.fn().mockResolvedValueOnce({data:{path:'reserved.webp',uploaded:true},error:null}).mockResolvedValue({data:[],error:null});const handler=preparePhotoHandler({gateSecret:secret,authenticate:async()=>({id,anonymous:true}),maintenance:()=>({rpc}) as unknown as SupabaseClient});
  const response=await handler(await request(JSON.stringify({report:id,kind:'before',operation:id,actor:'forged',ip:'forged',paths:['referenced.webp']})));expect(response.status).toBe(200);expect(rpc).toHaveBeenCalledWith('reserve_photo_verified_format',{actor:id,anonymous:true,report:id,kind_name:'before',operation:id,risk_hash:risk,format_name:'webp'});
 });
 it.each(['webp','jpeg'])('accepts only allow-listed format %s',async format=>{
  const rpc=vi.fn().mockResolvedValueOnce({data:{path:'reserved',uploaded:false},error:null}).mockResolvedValue({data:[],error:null});
  const handler=preparePhotoHandler({gateSecret:secret,authenticate:async()=>({id,anonymous:true}),maintenance:()=>({rpc}) as unknown as SupabaseClient});
  expect((await handler(await request(JSON.stringify({report:id,kind:'before',operation:id,format})))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('reserve_photo_verified_format',expect.objectContaining({format_name:format}));
 });
 it.each(['png','jpg','image/jpeg','../jpg',null])('rejects invalid format %s before reserving',async format=>{
  const maintenance=vi.fn(),handler=preparePhotoHandler({gateSecret:secret,authenticate:async()=>({id,anonymous:true}),maintenance});
  expect((await handler(await request(JSON.stringify({report:id,kind:'before',operation:id,format})))).status).toBe(400);
  expect(maintenance).not.toHaveBeenCalled();
 });
 it('rejects replay with altered body or expired timestamp',async()=>{
  const handler=preparePhotoHandler({gateSecret:secret,authenticate:vi.fn(),maintenance:vi.fn()}),valid=await request();expect((await handler(new Request(valid.url,{method:'POST',headers:valid.headers,body:'{}'}))).status).toBe(403);
  const stale=await request();stale.headers.set('x-roadtag-timestamp',String(Date.now()-120000));expect((await handler(stale)).status).toBe(403);
 });
 it('scheduled cleanup uses only server-selected paths; failed delete retains metadata',async()=>{
  const rpc=vi.fn().mockResolvedValue({data:['expired.webp'],error:null}),remove=vi.fn().mockResolvedValue({error:{message:'offline'}}),client={rpc,storage:{from:()=>({remove})}} as unknown as SupabaseClient;
  await expect(cleanupPhotos(client)).rejects.toThrow('retained');expect(rpc).not.toHaveBeenCalledWith('finish_photo_cleanup',expect.anything());remove.mockResolvedValue({error:null});rpc.mockReset().mockResolvedValueOnce({data:['expired.webp'],error:null}).mockResolvedValueOnce({error:null}).mockResolvedValue({data:[],error:null});
  expect((await cleanupPhotos(client,2)).removed).toBe(1);expect(remove).toHaveBeenCalledWith(['expired.webp']);expect(rpc).toHaveBeenCalledWith('finish_photo_cleanup',{paths:['expired.webp']});
 });
});
