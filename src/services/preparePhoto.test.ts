import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {preparePhotoHandler} from '../../supabase/functions/prepare-photo/handler';
describe('trusted photo preparation endpoint',()=>{
 it('rejects unauthenticated requests before creating clients or cleanup work',async()=>{
  const authenticate=vi.fn(),maintenance=vi.fn();const handler=preparePhotoHandler({authenticate,maintenance});
  expect((await handler(new Request('https://example.test',{method:'POST',body:'{}'}))).status).toBe(401);
  expect(authenticate).not.toHaveBeenCalled();expect(maintenance).not.toHaveBeenCalled();
 });
 it('requires server-verified user and never treats a bearer string as proof',async()=>{
  const handler=preparePhotoHandler({authenticate:async()=>null,maintenance:vi.fn()});
  expect((await handler(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer forged'},body:'{}'}))).status).toBe(401);
 });
 it('returns only the reservation and cleans only server-selected expired paths',async()=>{
  const rpc=vi.fn().mockResolvedValue({data:{path:'reserved.webp',uploaded:true},error:null});
  const adminRpc=vi.fn().mockResolvedValueOnce({data:['expired.webp'],error:null}).mockResolvedValue({error:null});
  const remove=vi.fn().mockResolvedValue({error:null});
  const handler=preparePhotoHandler({authenticate:async()=>({rpc}) as unknown as SupabaseClient,maintenance:()=>({rpc:adminRpc,storage:{from:()=>({remove})}}) as unknown as SupabaseClient});
  const id='10000000-0000-4000-8000-000000000001';
  const response=await handler(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer verified'},body:JSON.stringify({report:id,kind:'before',operation:id,paths:['referenced.webp']})}));
  expect(response.status).toBe(200);expect(await response.json()).toEqual({path:'reserved.webp',uploaded:true});
  expect(remove).toHaveBeenCalledWith(['expired.webp']);expect(adminRpc).toHaveBeenLastCalledWith('finish_photo_cleanup',{paths:['expired.webp']});
 });
});
