const endpoint='https://roadtag.org/api/mcp-public';
export function initPublicMcp(root:Document=document,released=import.meta.env.VITE_MCP_PUBLIC_RELEASED==='true'):()=>void{
 const button=root.getElementById('copy-mcp-url') as HTMLButtonElement|null;
 const example=root.getElementById('copy-mcp-prompt') as HTMLButtonElement|null;
 const text=root.getElementById('public-mcp-prompt'),status=root.getElementById('public-mcp-status');
 if(!example||!text||!status)return ()=>{};
 if(button)button.disabled=!released;
 example.disabled=!released;
 status.textContent=released?(button?'公開唯讀查詢；複製網址前會先確認服務可連接。':''):'公開唯讀 MCP 準備中，尚未開放。';
 let disposed=false,busy=false;
 const show=(message:string)=>{if(!disposed)status.textContent=message;};
 const copy=async(value:string,kind:'url'|'example'='example')=>{try{await navigator.clipboard.writeText(value);show(kind==='url'?'已複製 MCP 網址。請貼到 AI 助理的接入設定。':'已複製查詢範例。請貼到已連接 Road Tag 的 AI 對話中。');}catch{show('無法自動複製，請選取上方文字後手動複製。');}};
 const copyUrl=async()=>{
  if(!button||!released||busy||disposed)return;
  busy=true;button.disabled=true;show('正在確認公開讀取服務…');
  try{
   const response=await fetch('/api/mcp-public',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}}),signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('Unavailable');
   const body=await response.text();if(body.length>32768)throw Error('Oversized');
   const payload=body.trim().startsWith('{')?JSON.parse(body):body.split('\n').filter(line=>line.startsWith('data:')).map(line=>JSON.parse(line.slice(5))).find(value=>value.result?.tools);
   const names=payload?.result?.tools?.map((tool:{name:string})=>tool.name).sort();
   if(JSON.stringify(names)!==JSON.stringify(['get_report','resolve_location','search_nearby_reports']))throw Error('Unexpected tools');
   await copy(endpoint,'url');
  }catch{show('公開讀取服務暫時無法連接，請稍後再試；也可以使用網站地圖查詢。');}
  finally{busy=false;if(!disposed&&button)button.disabled=false;}
 };
 const copyExample=async()=>{if(released&&!disposed)await copy(text.textContent?.trim()||'');};
 button?.addEventListener('click',copyUrl);example.addEventListener('click',copyExample);
 return ()=>{disposed=true;button?.removeEventListener('click',copyUrl);example.removeEventListener('click',copyExample);};
}
