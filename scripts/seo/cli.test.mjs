import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
const run=promisify(execFile)
test('failed GSC invocation invalidates old successful snapshot without leaking error',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'roadtag-seo-test-'))
 try{
 await import('node:fs/promises').then(fs=>fs.mkdir(join(dir,'artifacts/seo'),{recursive:true}))
 await writeFile(join(dir,'artifacts/seo/gsc-summary.json'),JSON.stringify({status:'CONNECTED',reports:{private:'stale'}}))
 await assert.rejects(run(process.execPath,[fileURLToPath(new URL('./gsc-report.mjs',import.meta.url))],{cwd:dir,env:{...process.env,GSC_SITE_PROPERTY:'sc-domain:not-authorized.invalid'}}),e=>e.stderr.trim()==='WRONG_PROPERTY')
 const snapshot=JSON.parse(await readFile(join(dir,'artifacts/seo/gsc-summary.json'),'utf8'))
 assert.equal(snapshot.status,'WRONG_PROPERTY');assert.deepEqual(snapshot.reports,{})
 }finally{await rm(dir,{recursive:true,force:true})}
})
test('UTF16LE Planner CLI import with unknown GSC and range',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'roadtag-seo-test-'))
 try{
 const file=join(dir,'input.tsv')
 await writeFile(file,Buffer.concat([Buffer.from([255,254]),Buffer.from('關鍵字\t平均每月搜尋量\t競爭程度\n無障礙地圖\t100-1000\t低','utf16le')]))
 await run(process.execPath,[fileURLToPath(new URL('./import-keywords.mjs',import.meta.url)),'--input',file,'--market','TW','--language','zh-Hant'],{cwd:dir})
 const output=JSON.parse(await readFile(join(dir,'artifacts/seo/keywords-normalized.json'),'utf8'))
 assert.equal(output.rows[0].volumeMax,1000)
 assert.equal(output.rows[0].dataPeriod,'unknown')
 assert.equal(output.gscContext,null)
 assert.equal(output.reviewCandidates[0].gsc,null)
 }finally{await rm(dir,{recursive:true,force:true})}
})

