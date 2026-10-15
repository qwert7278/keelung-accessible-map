const endpoint='https://roadtag.org/api/mcp-public';
export function initPublicMcp(root:Document=document,released=import.meta.env.VITE_MCP_PUBLIC_RELEASED==='true',textSearchReleased=import.meta.env.VITE_MCP_PUBLIC_TEXT_SEARCH_RELEASED==='true'):()=>void{
 const button=root.getElementById('copy-mcp-url') as HTMLButtonElement|null;
 const example=root.getElementById('copy-mcp-prompt') as HTMLButtonElement|null;
 const text=root.getElementById('public-mcp-prompt'),status=root.getElementById('public-mcp-status');
 if(!button||!example||!text||!status)return ()=>{};
 const capabilities=root.getElementById('public-mcp-capabilities'),notice=root.getElementById('public-mcp-location-note');
 const textSearch=released&&textSearchReleased;
 if(textSearch){
  if(capabilities)capabilities.textContent='可用台灣地址、門牌、巷弄、商家或地標取得候選位置，再查詢附近公開回報與指定案件。候選位置需要確認；地標僅供查詢周邊，不是障礙的精確位置。';
  text.textContent='請透過 Road Tag 查詢基隆車站附近 500 公尺的公開道路障礙；若有多個候選位置請先讓我選擇，再附上案件網址及地理資料來源。請依回報內容回答，不要把沒有回報的地點當成安全道路。';
 }
 if(notice)notice.hidden=!textSearch;
 button.disabled=example.disabled=!released;
 status.textContent=released?'公開唯讀查詢；複製前會先確認服務可連接。':'公開唯讀 MCP 準備中，尚未開放。';
 let disposed=false,busy=false;
 const show=(message:string)=>{if(!disposed)status.textContent=message;};
 const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);show('已複製。請在自己的 AI 助理設定中使用。');}catch{show('無法自動複製，請選取上方文字後手動複製。');}};
 const copyUrl=async()=>{
  if(!released||busy||disposed)return;
  busy=true;button.disabled=true;show('正在確認公開讀取服務…');
  try{
   const response=await fetch('/api/mcp-public',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}}),signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('Unavailable');
   const body=await response.text();if(body.length>32768)throw Error('Oversized');
   const payload=body.trim().startsWith('{')?JSON.parse(body):body.split('\n').filter(line=>line.startsWith('data:')).map(line=>JSON.parse(line.slice(5))).find(value=>value.result?.tools);
   const names=payload?.result?.tools?.map((tool:{name:string})=>tool.name).sort();
   if(JSON.stringify(names)!==JSON.stringify(['get_report','resolve_location','search_nearby_reports']))throw Error('Unexpected tools');
   await copy(endpoint);
  }catch{show('公開讀取服務暫時無法連接，請稍後再試；也可以使用網站地圖查詢。');}
  finally{busy=false;if(!disposed)button.disabled=false;}
 };
 const copyExample=async()=>{if(released&&!disposed)await copy(text.textContent?.trim()||'');};
 button.addEventListener('click',copyUrl);example.addEventListener('click',copyExample);
 return ()=>{disposed=true;button.removeEventListener('click',copyUrl);example.removeEventListener('click',copyExample);};
}
