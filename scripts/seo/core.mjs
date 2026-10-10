const publicPaths = new Set(['/', '/map', '/how-to', '/about', '/privacy', '/terms'])
export const relevant = /無障礙|輪椅|人行道|騎樓|道路障礙|路見不平|road\s?tag/i
export function periods(days, endDate) {
 if (![7,28,90].includes(days) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error('INVALID_PERIOD')
 const end=Date.parse(endDate+'T00:00:00Z')
 if (!Number.isFinite(end) || new Date(end).toISOString().slice(0,10)!==endDate) throw new Error('INVALID_PERIOD')
 const day=n=>new Date(end+n*86400000).toISOString().slice(0,10)
 return {current:{startDate:day(1-days),endDate},previous:{startDate:day(1-2*days),endDate:day(-days)}}
}
export function finalizedEnd(now=new Date()) {
 const pt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
 return new Date(Date.parse(pt+'T00:00:00Z')-3*86400000).toISOString().slice(0,10)
}
export function classify(status) {
 return [401,403].includes(status)?'AUTH_REQUIRED':status===429?'RATE_LIMITED':status>=500?'UNAVAILABLE':'INVALID_REQUEST'
}
export function safeQuery(q) {
 return typeof q==='string' && q.length<=120 && relevant.test(q) &&
 !/@|https?:|www\.|\d{6,}|(?:\d[\s-]*){10,}|\d{2,3}\.\d{3,}|[\r\n\t<>]/i.test(q)
}
export function safePage(value) {
 try {const u=new URL(value);return u.origin==='https://roadtag.org'&&!u.search&&!u.hash&&publicPaths.has(u.pathname)}
 catch {return false}
}
export function normalizeRows(rows=[], dimensions=[]) {
 if (!Array.isArray(rows)) return []
 return rows.filter(r=>r&&typeof r==='object'&&dimensions.every((d,i)=>{
 const k=r.keys?.[i]
 return d==='query'?safeQuery(k):d==='page'?safePage(k):d==='device'?['DESKTOP','MOBILE','TABLET'].includes(k):d==='date'?/^\d{4}-\d{2}-\d{2}$/.test(k??''):false
 })).map(r=>{
 const metric=k=>typeof r[k]==='number'&&Number.isFinite(r[k])&&r[k]>=0?r[k]:null
 return {keys:dimensions.map((_,i)=>r.keys[i]),clicks:metric('clicks'),impressions:metric('impressions'),ctr:metric('ctr'),position:metric('position')}
 })
}
export async function paginate(getPage,rowLimit=25000,maxRows=50000) {
 if(!Number.isInteger(rowLimit)||rowLimit<1||rowLimit>25000||!Number.isInteger(maxRows)||maxRows<rowLimit||maxRows>50000) throw new Error('INVALID_LIMIT')
 const rows=[]
 while(rows.length<maxRows){
 const requested=Math.min(rowLimit,maxRows-rows.length)
 const response=await getPage(rows.length,requested)
 const page=response.rows??[]
 if(!Array.isArray(page)||page.length>Math.min(rowLimit,maxRows-rows.length)) throw new Error('INVALID_RESPONSE')
 rows.push(...page)
 if(page.length<requested) return {rows,truncated:false}
 }
 return {rows,truncated:true}
}
export function opportunities(rows) {
 return normalizeRows(rows,['query']).filter(r=>r.impressions>=100&&r.position>=5&&r.position<=20&&r.ctr!==null&&r.ctr<.03).sort((a,b)=>b.impressions-a.impressions).slice(0,10)
}
// RFC-style quoted cells; tolerate Google's metadata preamble and UTF-8 BOM.
function cells(text,sep) {
 const rows=[];let row=[],cell='',quoted=false
 for(let i=0;i<text.length;i++){
 const c=text[i]
 if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
 else if(c===sep&&!quoted){row.push(cell);cell=''}
 else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}
 else cell+=c
 }
 if(quoted)throw new Error('INVALID_CSV')
 if(cell||row.length){row.push(cell);rows.push(row)}
 return rows
}
export function parseKeywords(text,metadata) {
 if(metadata.market!=='TW'||metadata.language!=='zh-Hant') throw new Error('MARKET_LANGUAGE_REQUIRED')
 const aliases={keyword:['keyword','關鍵字','關鍵詞'],volume:['avg. monthly searches','average monthly searches','平均每月搜尋量','平均每月搜索量'],competition:['competition','競爭程度','競爭']}
 const clean=s=>s.replace(/^\uFEFF/,'').trim().toLowerCase()
 const sep=text.includes('\t')?'\t':','
 const rows=cells(text,sep)
 const headerIndex=rows.findIndex(r=>r.some(c=>aliases.keyword.includes(clean(c))))
 if(headerIndex<0)throw new Error('MISSING_KEYWORD_COLUMN')
 const header=rows[headerIndex].map(clean)
 const column=k=>header.findIndex(c=>aliases[k].includes(c))
 const count=s=>{
 const n=s.trim().replace(/,/g,'').match(/^(\d+(?:\.\d+)?)\s*([kKmM]?)$/)
 return n?Number(n[1])*({k:1000,m:1000000}[n[2].toLowerCase()]??1):null
 }
 return rows.slice(headerIndex+1).filter(r=>r[column('keyword')]?.trim()).map(r=>{
 const raw=(r[column('volume')]??'').trim()
 const range=raw.split(/\s*[-–—]\s*/)
 const exact=range.length===1?count(raw):null
 return {keyword:r[column('keyword')].trim(),monthlySearches:exact,volumeMin:range.length===2?count(range[0]):exact,volumeMax:range.length===2?count(range[1]):exact,competition:r[column('competition')]?.trim()||null,market:'TW',language:'zh-Hant',dataPeriod:metadata.dataPeriod||'unknown',metadataSource:'operator_declared',source:'keyword_planner_csv'}
 }).filter(r=>safeQuery(r.keyword))
}


export function combineEvidence(gscRows,plannerRows){
 const queries=normalizeRows(gscRows,['query'])
 return plannerRows.slice(0,10000).filter(r=>safeQuery(r.keyword)).map(r=>{
 const match=queries.find(q=>q.keys[0]===r.keyword)
 return {keyword:r.keyword,source:r.source,market:r.market,language:r.language,dataPeriod:r.dataPeriod,monthlySearches:r.monthlySearches,volumeMin:r.volumeMin,volumeMax:r.volumeMax,competition:r.competition,gsc:match?{clicks:match.clicks,impressions:match.impressions,ctr:match.ctr,position:match.position}:null,intent:/申訴|1999/.test(r.keyword)?'government_complaint':/地圖|路線/.test(r.keyword)?'route_lookup':/回報|通報/.test(r.keyword)?'report':'information',needsHumanReview:true}
 }).slice(0,10)
}


