// Shared public tuple validation. Never contains server credentials.
export const STAGING_SUPABASE='https://wpravdqviylkcpsioybu.supabase.co';
export const PRODUCTION_SUPABASE='https://ifcicahnrpkwjcxmnmug.supabase.co';
const previewOrigin=/^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/;
export function oauthTuple(origin:string,supabaseUrl:string){
 if(origin==='https://roadtag.org'&&supabaseUrl===PRODUCTION_SUPABASE)return {environment:'production' as const,origin,supabaseUrl};
 if(previewOrigin.test(origin)&&supabaseUrl===STAGING_SUPABASE)return {environment:'preview' as const,origin,supabaseUrl};
 return null;
}
export function consentEnvironment(origin:string,supabaseUrl:string,enabled:string|undefined,publishable:string|undefined){
 const tuple=oauthTuple(origin,supabaseUrl);
 return enabled==='true'&&tuple&&publishable?.startsWith('sb_publishable_')?{...tuple,publishable}:null;
}
export function consentRedirect(raw:string){
 const url=new URL(raw);
 // Validate raw authority too: URL.port normalizes an explicit :443 away.
 if(!raw.startsWith('https://chatgpt.com/')||url.username||url.password||url.port||url.hostname!=='chatgpt.com'||!(url.pathname.startsWith('/connector/oauth/')||url.pathname==='/connector_platform_oauth_redirect'))throw new Error('Invalid callback');
 return url.href;
}
