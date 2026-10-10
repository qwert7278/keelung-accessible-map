import { fileURLToPath } from 'node:url'
import { jsonRequest } from './api.mjs'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, relative, isAbsolute, dirname } from 'node:path'
import { createPrivateKey, sign } from 'node:crypto'
import { parseArgs } from 'node:util'
import { periods, finalizedEnd, normalizeRows, paginate, opportunities } from './core.mjs'
const scope='https://www.googleapis.com/auth/webmasters.readonly'
const base='https://www.googleapis.com/webmasters/v3'
async function token(){
 const file=process.env.GSC_CREDENTIALS_FILE||process.env.GOOGLE_APPLICATION_CREDENTIALS
 if(!file)throw new Error('AUTH_REQUIRED')
 const path=resolve(file),local=relative(resolve(dirname(fileURLToPath(import.meta.url)),'../..'),path)
 if(!local.startsWith('..')&&!isAbsolute(local))throw new Error('CREDENTIALS_MUST_BE_OUTSIDE_REPO')
 const c=JSON.parse(await readFile(path,'utf8'))
 if(c.type!=='service_account'||!c.client_email||!c.private_key)throw new Error('AUTH_REQUIRED')
 const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const unsigned=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:c.client_email,scope,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})
 const assertion=unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),createPrivateKey(c.private_key)).toString('base64url')
 const result=await jsonRequest('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})})
 if(typeof result.access_token!=='string')throw new Error('AUTH_REQUIRED')
 return result.access_token
}
async function main(){
 const {values}=parseArgs({options:{days:{type:'string',default:'28'},'end-date':{type:'string'},inspect:{type:'boolean',default:false}}})
 const windows=periods(Number(values.days),values['end-date']??finalizedEnd())
 const property=process.env.GSC_SITE_PROPERTY||'sc-domain:roadtag.org'
 if(property!=='sc-domain:roadtag.org')throw new Error('WRONG_PROPERTY')
 const headers={Authorization:'Bearer '+await token(),'Content-Type':'application/json'}
 const site=base+'/sites/'+encodeURIComponent(property)
 const access=await jsonRequest(site,{headers})
 if(access.siteUrl!==property)throw new Error('WRONG_PROPERTY')
 const summary={status:'CONNECTED',property,scope,searchType:'web',dataState:'final',generatedAt:new Date().toISOString(),periods:windows,limitations:['GSC returns top rows, not all searches. Private/non-relevant queries and non-public pages omitted.','Totals are dimensionless property aggregates, not sums of query rows.','Dates use Pacific Time; last three days excluded. Minimum opportunity sample: 100 impressions.'],reports:{}}
 for(const [label,window] of Object.entries(windows)){
 const report={}
 for(const dimensions of [[],['query'],['page'],['query','page'],['device'],['date']]){
 const data=await paginate((startRow,rowLimit)=>jsonRequest(site+'/searchAnalytics/query',{method:'POST',headers,body:JSON.stringify({...window,type:'web',dataState:'final',dimensions,startRow,rowLimit})}))
 const key=dimensions.join('_')||'totals'
 report[key]={rows:normalizeRows(data.rows,dimensions),truncated:data.truncated}
 }
 summary.reports[label]=report
 }
 try{
 const raw=await jsonRequest(site+'/sitemaps',{headers})
 summary.sitemaps=(raw.sitemap??[]).filter(s=>s.path==='https://roadtag.org/sitemap.xml').map(s=>({path:s.path,lastSubmitted:s.lastSubmitted??null,lastDownloaded:s.lastDownloaded??null,isPending:s.isPending??null,errors:s.errors??null,warnings:s.warnings??null,contents:(s.contents??[]).map(c=>({type:c.type,submitted:c.submitted??null,indexed:c.indexed??null}))}))
 }catch(e){summary.sitemapStatus=['AUTH_REQUIRED','RATE_LIMITED','UNAVAILABLE'].includes(e.message)?e.message:'UNAVAILABLE'}
  if(values.inspect){
 summary.inspections=[]
 for(const path of ['/', '/map', '/how-to', '/about', '/privacy', '/terms']){
 try{
 const data=await jsonRequest('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',{method:'POST',headers,body:JSON.stringify({inspectionUrl:'https://roadtag.org'+path,siteUrl:property,languageCode:'zh-TW'})})
 const r=data.inspectionResult?.indexStatusResult??{}
 summary.inspections.push({path,verdict:r.verdict??null,coverageState:r.coverageState??null,indexingState:r.indexingState??null,lastCrawlTime:r.lastCrawlTime??null,googleCanonical:r.googleCanonical==='https://roadtag.org'+path?'MATCH':r.googleCanonical?'DIFFERENT':null})
 }catch(e){summary.inspections.push({path,status:['AUTH_REQUIRED','RATE_LIMITED','UNAVAILABLE'].includes(e.message)?e.message:'UNAVAILABLE'})}
 }
 }
 summary.opportunities=opportunities(summary.reports.current.query.rows)
 const total=summary.reports.current.totals.rows[0]
 summary.sampleStatus=!total||total.impressions===null||total.impressions<100?'DATA_INSUFFICIENT':'SUFFICIENT'
 await mkdir('artifacts/seo',{recursive:true})
 await writeFile('artifacts/seo/gsc-summary.json',JSON.stringify(summary,null,2)+'\n',{mode:0o600})
 const recommendations=['# GSC 唯讀摘要', '', '期間：'+windows.current.startDate+' 至 '+windows.current.endDate+'（Pacific Time）','狀態：'+summary.sampleStatus,'', '總曝光：'+(total?.impressions??'unknown')+'；總點擊：'+(total?.clicks??'unknown'),'候選機會數：'+summary.opportunities.length,'', '低 CTR 門檻為分析啟發式（<3%、排名 5–20、曝光 ≥100），非排名保證。','資料不足時只建立量測基準，不據此改寫標題或大量建立頁面。']
 await writeFile('artifacts/seo/gsc-recommendations.md',recommendations.join('\n')+'\n',{mode:0o600})
 console.log(JSON.stringify({status:summary.status,sampleStatus:summary.sampleStatus,current:windows.current,clicks:total?.clicks??null,impressions:total?.impressions??null,opportunities:summary.opportunities.length,sitemapStatus:summary.sitemapStatus??'READ'}))
}
main().catch(async e=>{const safe=['AUTH_REQUIRED','RATE_LIMITED','UNAVAILABLE','INVALID_REQUEST','WRONG_PROPERTY','INVALID_PERIOD','CREDENTIALS_MUST_BE_OUTSIDE_REPO'];const status=safe.includes(e.message)?e.message:'LOCAL_OR_NETWORK_ERROR';console.error(status);
try{await mkdir('artifacts/seo',{recursive:true});await writeFile('artifacts/seo/gsc-summary.json',JSON.stringify({status,generatedAt:new Date().toISOString(),reports:{}})+'\n',{mode:0o600});await writeFile('artifacts/seo/gsc-recommendations.md','# GSC report unavailable\n'+status+'\n',{mode:0o600})}catch{/* Console remains safe even if local output is unavailable. */}
process.exitCode=1})




