import { classify } from './core.mjs'
export async function jsonRequest(url,options={},request=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms))){
 for(let attempt=0;attempt<2;attempt++){
 const response=await request(url,{...options,signal:AbortSignal.timeout(30000)})
 if(response.status===429&&attempt===0){await wait(1000);continue}
 if(!response.ok)throw new Error(classify(response.status))
 return response.json()
 }
}
