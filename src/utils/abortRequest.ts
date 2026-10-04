// Compatible with Safari versions without AbortSignal.any / timeout.
export function abortRequest(external?:AbortSignal, timeout=8000) {
  const controller=new AbortController();
  const abort=()=>controller.abort();
  if (external?.aborted) abort();
  else external?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeout);
  return {signal:controller.signal,cleanup:()=>{clearTimeout(timer);external?.removeEventListener('abort',abort);}};
}
