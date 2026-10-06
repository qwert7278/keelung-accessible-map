import {useEffect,useState,type FormEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient,type OAuthAuthorizationDetails} from '@supabase/supabase-js';
const STAGING='https://wpravdqviylkcpsioybu.supabase.co';
function Consent(){
 const active=import.meta.env.VITE_MCP_OAUTH_ENABLED==='true'&&import.meta.env.VITE_SUPABASE_URL===STAGING;
 const [db]=useState(()=>active?createClient(STAGING,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[details,setDetails]=useState<OAuthAuthorizationDetails|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const id=new URLSearchParams(location.search).get('authorization_id');
 const redirect=(raw:string)=>{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.port||url.hostname!=='chatgpt.com'||!(url.pathname.startsWith('/connector/oauth/')||url.pathname==='/connector_platform_oauth_redirect'))throw new Error('Invalid callback');location.assign(url.href);};
 async function load(){
  if(!db||!id){setError('缺少 staging 授權請求。');return;}
  const result=await db.auth.oauth.getAuthorizationDetails(id);
  if(result.error||!result.data)throw new Error('Authorization failed');
  if('authorization_id' in result.data){setDetails(result.data);setReady(true);}else redirect(result.data.redirect_url);
 }
 useEffect(()=>()=>{void db?.auth.signOut({scope:'local'});},[db]);
 async function login(event:FormEvent){
  event.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  try{const result=await db.auth.signInWithPassword({email,password});setPassword('');if(result.error)throw new Error('Login failed');await load();}catch{setError('登入或授權請求無效，請確認 staging closed-alpha 帳號。');}finally{setBusy(false);}
 }
 async function decide(approve:boolean){
  if(!db||!id||busy)return;setBusy(true);setError('');
  try{const r=approve?await db.auth.oauth.approveAuthorization(id,{skipBrowserRedirect:true}):await db.auth.oauth.denyAuthorization(id,{skipBrowserRedirect:true});if(r.error||!r.data)throw new Error('Decision failed');redirect(r.data.redirect_url);}catch{setError('授權未完成，請重新開始連線。');setBusy(false);}
 }
 if(!active)return <p>OAuth consent 尚未啟用。</p>;
 return <section style={{maxWidth:560,margin:'3rem auto',padding:'1rem',fontFamily:'system-ui'}}><h1>Road Tag staging closed-alpha</h1><p>此連線僅使用測試環境。OAuth consent 允許連線；每次通報仍需另外確認。</p>{error&&<p role="alert">{error}</p>}{!ready?<form onSubmit={login}><label>Staging email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy||!id}>登入 staging</button></form>:<><p>Requesting client: {details?.client.name}</p><p>Redirect: {details?.redirect_uri.split('?')[0]}</p><p>Requested scopes: {details?.scope}</p><p>只有 server 允許的非管理者帳號可使用 Road Tag tools。</p><button disabled={busy} onClick={()=>void decide(true)}>Approve</button><button disabled={busy} onClick={()=>void decide(false)}>Deny</button></>}</section>;
}
createRoot(document.getElementById('oauth-root')!).render(<Consent/>);
