import { afterEach, describe, expect, it, vi } from 'vitest';
const mock=vi.hoisted(()=>({
  signIn:vi.fn(async()=>({error:null})),rpc:vi.fn(async()=>({data:false,error:null})),
  listener:null as null|((event:string,session:{user:{id:string;is_anonymous:boolean}})=>void),
}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({
  auth:{signInWithOtp:mock.signIn,getSession:async()=>({data:{session:{user:{id:'isolated-user'}}},error:null}),onAuthStateChange:(listener:typeof mock.listener)=>{mock.listener=listener;return {data:{subscription:{unsubscribe:vi.fn()}}};}},rpc:mock.rpc,
})}));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.clearAllMocks();});
describe('admin auth boundaries without sending email',()=>{
  it('does not create users and always redirects the magic link to production /admin',async()=>{
    vi.stubEnv('VITE_SUPABASE_URL','https://isolated.invalid');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','isolated-public-key');
    const {loginAdmin}=await import('./supabase');
    await loginAdmin(' admin@example.invalid ');
    expect(mock.signIn).toHaveBeenCalledWith({email:'admin@example.invalid',options:{shouldCreateUser:false,emailRedirectTo:'https://roadtag.org/admin'}});
  });
  it.each([[false,false,false],[true,false,true],[true,true,false]])('requires is_admin=%s and rejects anonymous=%s',async(authorized,anonymous,expected)=>{
    vi.stubGlobal('window',{setTimeout});
    vi.stubEnv('VITE_SUPABASE_URL','https://isolated.invalid');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','isolated-public-key');
    mock.rpc.mockResolvedValue({data:authorized,error:null});
    const {subscribeAuthSession}=await import('./supabase');const next=vi.fn();const error=vi.fn();
    const cleanup=subscribeAuthSession(next,error);
    mock.listener?.('SIGNED_IN',{user:{id:'isolated-user',is_anonymous:anonymous}});
    await vi.waitFor(()=>expect(next).toHaveBeenCalled());
    expect(next.mock.calls[0][0].admin).toBe(expected);expect(mock.rpc).toHaveBeenCalledWith('is_admin');cleanup();
  });
});
