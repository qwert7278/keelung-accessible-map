import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {POST} from '../../api/prepare-photo';
import {GET} from '../../api/photo-cleanup';
import {verifyGate} from '../../supabase/functions/_shared/uploadGate';
const mocks=vi.hoisted(()=>({createClient:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:mocks.createClient}));
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('UPLOAD_GATE_SECRET','test-only-secret');vi.stubEnv('VITE_SUPABASE_URL','https://test.supabase.co');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');vi.stubEnv('VERCEL','1');vi.stubEnv('CRON_SECRET','test-cron');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','server-only-test');
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const request=(headers:Record<string,string>={})=>new Request('https://roadtag.org/api/prepare-photo',{method:'POST',headers:{authorization:'Bearer token','x-forwarded-for':'203.0.113.10',...headers},body:'{"report":"test"}'});
it('forwards a signed daily risk hash without forwarding or returning raw IP',async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json({path:'verified.webp',uploaded:false}));vi.stubGlobal('fetch',fetch);
 const response=await POST(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 const [,options]=fetch.mock.calls[0],headers=new Headers(options.headers);expect(headers.get('x-roadtag-risk-hash')).toMatch(/^[0-9a-f]{64}$/);
 expect(await verifyGate('test-only-secret',headers,options.body)).toBe(true);
 expect(JSON.stringify(options.headers)).not.toContain('203.0.113.10');expect(await response.text()).not.toContain('203.0.113.10');
});
it('ignores client risk-hash spoofing',async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json({}));vi.stubGlobal('fetch',fetch);await POST(request({'x-roadtag-risk-hash':'forged'}));expect(fetch.mock.calls[0][1].headers['x-roadtag-risk-hash']).not.toBe('forged');
});
it('fails closed when arbitrary hosts supply forwarded IP',async()=>{
 vi.stubEnv('VERCEL','');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect((await POST(request())).status).toBe(503);expect(fetch).not.toHaveBeenCalled();
});
it('handles upstream timeout without returning secret details',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('secret upstream')));const response=await POST(request());expect(response.status).toBe(503);expect(await response.text()).not.toContain('secret');
});
it('rejects unauthorized cron before opening service access',async()=>{
 expect((await GET(new Request('https://roadtag.org/api/photo-cleanup'))).status).toBe(401);expect(mocks.createClient).not.toHaveBeenCalled();
});
it('authorized cron uses service-only cleanup without visitor traffic',async()=>{
 const rpc=vi.fn().mockResolvedValue({data:[],error:null});mocks.createClient.mockReturnValue({rpc});
 const response=await GET(new Request('https://roadtag.org/api/photo-cleanup',{headers:{authorization:'Bearer test-cron'}}));expect(response.status).toBe(200);expect(rpc).toHaveBeenCalledWith('expired_photos');expect(mocks.createClient.mock.calls[0][1]).toBe('server-only-test');
});
it('cron preserves retryability after Storage failure',async()=>{
 const rpc=vi.fn().mockResolvedValue({data:['expired.webp'],error:null}),remove=vi.fn().mockResolvedValue({error:{message:'offline'}});mocks.createClient.mockReturnValue({rpc,storage:{from:()=>({remove})}});
 const response=await GET(new Request('https://roadtag.org/api/photo-cleanup',{headers:{authorization:'Bearer test-cron'}}));expect(response.status).toBe(503);expect(rpc.mock.calls.some(([name])=>name==='finish_photo_cleanup')).toBe(false);
});
