const endpoint='https://roadtag.org/api/mcp-public';
export function initPublicMcp(root:Document=document,released=import.meta.env.VITE_MCP_PUBLIC_RELEASED==='true',textSearchReleased=import.meta.env.VITE_MCP_PUBLIC_TEXT_SEARCH_RELEASED==='true'):()=>void{
 const button=root.getElementById('copy-mcp-url') as HTMLButtonElement|null;
 const example=root.getElementById('copy-mcp-prompt') as HTMLButtonElement|null;
 const text=root.getElementById('public-mcp-prompt'),status=root.getElementById('public-mcp-status');
 if(!example||!text||!status)return ()=>{};
 if(button)button.disabled=false;
 example.disabled=!released;
 const capabilities=root.getElementById('public-mcp-capabilities'),notice=root.getElementById('public-mcp-location-note');
 const textSearch=released&&textSearchReleased;
 if(textSearch){
  if(capabilities)capabilities.textContent='可用台灣地址、門牌、巷弄、商家或地標查詢公開回報；';
  text.textContent='請用 Road Tag 查詢基隆車站附近 500 公尺的公開道路障礙；若有多個候選位置請先讓我選擇，再附上案件網址與地理資料來源。';
 }
 if(notice)notice.hidden=!textSearch;
 status.textContent=button?'固定連接網址可直接複製；請在 AI 助理中確認連線狀態。':released?'':'公開唯讀 MCP 準備中，尚未開放。';
 let disposed=false;
 const show=(message:string)=>{if(!disposed)status.textContent=message;};
 const copy=async(value:string,kind:'url'|'example'='example')=>{
  try{await navigator.clipboard.writeText(value);show(kind==='url'?'已複製 MCP 網址，不代表服務目前可連接。請貼到 AI 助理的接入設定。':'已複製查詢範例。請貼到已連接 Road Tag 的 AI 對話中。');}
  catch{show('無法自動複製，請選取上方文字後手動複製。');}
 };
 const copyUrl=async()=>{if(!disposed)await copy(endpoint,'url');};
 const copyExample=async()=>{if(released&&!disposed)await copy(text.textContent?.trim()||'');};
 button?.addEventListener('click',copyUrl);example.addEventListener('click',copyExample);
 return ()=>{disposed=true;button?.removeEventListener('click',copyUrl);example.removeEventListener('click',copyExample);};
}
