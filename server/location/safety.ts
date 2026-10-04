import { createHmac, randomBytes } from 'node:crypto';
// This bound is per runtime, NOT a distributed quota. TGOS stays disabled until
// a shared limiter and authenticated transports have been verified.
const secret=process.env.LOCATION_RISK_SECRET || randomBytes(32).toString('hex');
export const locationCapabilities=()=>({searchReady:false,reverseReady:false});
export function createLocationLimiter(now=()=>Date.now(), networkMax=30, totalMax=300, trustVercelHeaders=process.env.VERCEL==='1') {
  let window=0,total=0;
  const buckets=new Map<string,number>();
  return (request:Request) => {
    const current=Math.floor(now()/60000);
    if (current!==window) {window=current;total=0;buckets.clear();}
    // Only accept Vercel's overwritten forwarding header on Vercel. Local or
    // missing headers share one bucket; do not persist raw IP.
    const key=createHmac('sha256',secret).update(`${current}:`+(trustVercelHeaders ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown' : 'unknown')).digest('hex');
    const count=buckets.get(key)||0;
    if (count>=networkMax || total>=totalMax) return Math.max(1,60-Math.floor(now()/1000)%60);
    buckets.set(key,count+1);total++;
    return 0;
  };
}
export const limitLocation=createLocationLimiter();
