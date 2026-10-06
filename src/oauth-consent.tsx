import {useEffect,useState,type FormEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient,type OAuthAuthorizationDetails} from '@supabase/supabase-js';
import {consentEnvironment,consentRedirect} from './utils/mcp-oauth-environment';
function Consent(){
 const config=consentEnvironment(location.origin,import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_MCP_OAUTH_ENABLED,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
 const staging=config?.environment==='preview';
 const [db]=useState(()=>config?createClient(config.supabaseUrl,config.publishable,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[details,setDetails]=useState<OAuthAuthorizationDetails|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const id=new URLSearchParams(location.search).get('authorization_id');
 const redirect=(raw:string)=>location.assign(consentRedirect(raw));
 async function load(){
  if(!db||!id){setError('缺少授權請求。');return;}
  const result=await db.auth.oauth.getAuthorizationDetails(id);
  if(result.error||!result.data)throw new Error('Authorization failed');
  if('authorization_id' in result.data){setDetails(result.data);setReady(true);}else redirect(result.data.redirect_url);
 }
 useEffect(()=>()=>{void db?.auth.signOut({scope:'local'});},[db]);
 async function login(event:FormEvent){
  event.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  try{const result=await db.auth.signInWithPassword({email,password});setPassword('');if(result.error)throw new Error('Login failed');await load();}catch{setError('登入或授權請求無效，請確認已批准的 Closed Alpha 帳號。');}finally{setBusy(false);}
 }
 async function decide(approve:boolean){
  if(!db||!id||busy)return;setBusy(true);setError('');
  try{const r=approve?await db.auth.oauth.approveAuthorization(id,{skipBrowserRedirect:true}):await db.auth.oauth.denyAuthorization(id,{skipBrowserRedirect:true});if(r.error||!r.data)throw new Error('Decision failed');redirect(r.data.redirect_url);}catch{setError('授權未完成，請重新開始連線。');setBusy(false);}
 }
 if(!config)return <p>OAuth consent 尚未啟用。</p>;
 return <section style={{maxWidth:560,margin:'3rem auto',padding:'1rem',fontFamily:'system-ui'}}><h1>{staging?'Road Tag staging closed-alpha':'Road Tag Closed Alpha'}</h1><p>{staging?'此連線僅使用測試環境。':''}OAuth consent 授權 ChatGPT 連線；每次通報仍需另外確認。</p>{error&&<p role="alert">{error}</p>}{!ready?<form onSubmit={login}><label>{staging?'Staging email':'Closed Alpha email'}<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy||!id}>{staging?'登入 staging':'登入 Closed Alpha'}</button></form>:<><p>Requesting client: {details?.client.name}</p><p>Redirect: {details?.redirect_uri.split('?')[0]}</p><p>Requested scopes: {details?.scope}</p><p>只有 server 允許的非管理者帳號可使用 Road Tag tools。</p><button disabled={busy} onClick={()=>void decide(true)}>Approve</button><button disabled={busy} onClick={()=>void decide(false)}>Deny</button></>}</section>;
}
createRoot(document.getElementById('oauth-root')!).render(<Consent/>);
