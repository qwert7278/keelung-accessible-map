import test from 'node:test'
import assert from 'node:assert/strict'
import { periods, classify, normalizeRows, paginate, parseKeywords, opportunities } from './core.mjs'
test('inclusive equal periods and leap boundary', () => {
 assert.deepEqual(periods(7, '2024-03-01'), { current: { startDate:'2024-02-24', endDate:'2024-03-01' }, previous: { startDate:'2024-02-17', endDate:'2024-02-23' } })
 for (const days of [7,28,90]) {
 const p=periods(days,'2026-10-07')
 assert.equal((Date.parse(p.current.endDate)-Date.parse(p.current.startDate))/86400000+1,days)
 assert.equal(Date.parse(p.current.startDate)-Date.parse(p.previous.endDate),86400000)
 }
 assert.throws(()=>periods(8,'2026-10-07'))
 assert.throws(()=>periods(28,'2026-02-30'))
})
test('safe error taxonomy without provider response', () => {
 for(const status of [401,403]) assert.equal(classify(status),'AUTH_REQUIRED')
 assert.equal(classify(429),'RATE_LIMITED')
 assert.equal(classify(503),'UNAVAILABLE')
 assert.equal(classify(400),'INVALID_REQUEST')
})
test('empty and missing metrics stay unknown', () => {
 assert.deepEqual(normalizeRows([],['query']),[])
 assert.equal(normalizeRows([{keys:['無障礙地圖']}],['query'])[0].impressions,null)
})
test('private queries and nonpublic URLs are omitted', () => {
 const rows=['無障礙地圖','user@example.com','0912345678','25.1234,121.4321','https://evil.test/x'].map(q=>({keys:[q],impressions:3}))
 assert.equal(normalizeRows(rows,['query']).length,1)
 assert.equal(normalizeRows([{keys:['https://roadtag.org/map?email=a']},{keys:['https://evil.test/map']},{keys:['https://roadtag.org/map']}],['page']).length,1)
})
test('pagination bounded with explicit truncation', async () => {
 const offsets=[]
 const result=await paginate(async start=>{offsets.push(start);return {rows:Array.from({length:2},()=>({clicks:0}))}},2,4)
 assert.deepEqual(offsets,[0,2])
 assert.equal(result.truncated,true)
 assert.equal(result.rows.length,4)
 const empty=await paginate(async()=>({}),2,4)
 assert.deepEqual(empty,{rows:[],truncated:false})
})
test('opportunities need sample and relevant intent', () => {
 assert.equal(opportunities([{keys:['無障礙地圖'],impressions:13,ctr:.01,position:8}]).length,0)
 assert.equal(opportunities([{keys:['道路障礙回報'],impressions:200,ctr:.01,position:8}]).length,1)
 assert.equal(opportunities([{keys:['無關'],impressions:200,ctr:.01,position:8}]).length,0)
})
test('Planner CSV quoted fields and ranges, unknown missing columns', () => {
 const result=parseKeywords('\uFEFFKeyword,Avg. monthly searches,Competition\r\n"騎樓,高低差",100 – 1K,Low\r\n無障礙地圖,,', {market:'TW',language:'zh-Hant',dataPeriod:'unknown'})
 assert.equal(result[0].volumeMin,100)
 assert.equal(result[0].volumeMax,1000)
 assert.equal(result[0].monthlySearches,null)
 assert.equal(result[1].monthlySearches,null)
 assert.equal(result[1].competition,null)
 assert.equal(result[0].source,'keyword_planner_csv')
})
test('Traditional Chinese TSV export and zero search volume', () => {
 const rows=parseKeywords('關鍵字\t平均每月搜尋量\t競爭程度\n輪椅通行\t0\t低', {market:'TW',language:'zh-Hant',dataPeriod:'2026-01..2026-09'})
 assert.equal(rows[0].monthlySearches,0)
 assert.equal(rows[0].competition,'低')
 assert.throws(()=>parseKeywords('Keyword\nx', {market:'US',language:'en'}))
 assert.throws(()=>parseKeywords('wrong\nx', {market:'TW',language:'zh-Hant'}))
 assert.throws(()=>parseKeywords('Keyword\n"x', {market:'TW',language:'zh-Hant'}))
})


test('pagination at nonmultiple cap stays truncated and rejects unsafe limits',async()=>{
 const result=await paginate(async(_start,limit)=>({rows:Array(limit).fill({})}),2,3)
 assert.equal(result.truncated,true)
 assert.equal(result.rows.length,3)
 await assert.rejects(paginate(async()=>({}),25001,50000),/INVALID_LIMIT/)
})
test('finalized date uses Pacific rather than host timezone',async()=>{
 const {finalizedEnd}=await import('./core.mjs')
 assert.equal(finalizedEnd(new Date('2026-10-10T02:00:00Z')),'2026-10-06')
})
test('combined evidence keeps missing GSC unknown and ranges intact',async()=>{
 const {combineEvidence}=await import('./core.mjs')
 const planner=parseKeywords('Keyword,Avg. monthly searches\n道路障礙回報,100-1000\n無障礙地圖,', {market:'TW',language:'zh-Hant',dataPeriod:'2026-09'})
 const rows=combineEvidence([{keys:['道路障礙回報'],impressions:13,clicks:4,position:5}],planner)
 assert.equal(rows[0].gsc.impressions,13)
 assert.equal(rows[0].volumeMin,100)
 assert.equal(rows[1].gsc,null)
 assert.equal(rows[1].monthlySearches,null)
 assert.equal(rows[0].intent,'report')
 assert.equal(rows[0].needsHumanReview,true)
})

test('invalid volume ranges and nonfinite numbers remain unknown',()=>{
 for(const volume of ['1000-100','100-bad','bad-100','1e309','9'.repeat(400)]){
 const rows=parseKeywords('Keyword,Avg. monthly searches\n無障礙地圖,'+volume,{market:'TW',language:'zh-Hant'})
 assert.equal(rows[0].monthlySearches,null)
 assert.equal(rows[0].volumeMin,null)
 assert.equal(rows[0].volumeMax,null)
 }
})
