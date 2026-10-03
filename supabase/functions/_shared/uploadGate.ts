const encode=new TextEncoder();
export async function signGate(secret:string,stamp:string,risk:string,authorization:string,body:string) {
 const key=await crypto.subtle.importKey('raw',encode.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,encode.encode(`${stamp}\n${risk}\n${authorization}\n${body}`));
 return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function verifyGate(secret:string,headers:Headers,body:string,now=Date.now()) {
 const stamp=headers.get('x-roadtag-timestamp')||'',risk=headers.get('x-roadtag-risk-hash')||'',signature=headers.get('x-roadtag-signature')||'';
 if(!secret || !/^\d{13}$/.test(stamp) || Math.abs(now-Number(stamp))>60000 || !/^[0-9a-f]{64}$/.test(risk) || !/^[0-9a-f]{64}$/.test(signature)) return false;
 const key=await crypto.subtle.importKey('raw',encode.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!,n=>parseInt(n,16)),encode.encode(`${stamp}\n${risk}\n${headers.get('authorization')}\n${body}`));
}
