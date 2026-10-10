import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { parseKeywords, combineEvidence } from './core.mjs'
async function main(){
 const {values}=parseArgs({options:{input:{type:'string'},market:{type:'string'},language:{type:'string'},'data-period':{type:'string'}}})
 if(!values.input)throw new Error('INPUT_REQUIRED')
 const buffer=await readFile(values.input)
 if(buffer.length>10*1024*1024)throw new Error('FILE_TOO_LARGE')
 const text=buffer[0]===255&&buffer[1]===254?buffer.subarray(2).toString('utf16le'):buffer.toString('utf8')
 const rows=parseKeywords(text,{market:values.market,language:values.language,dataPeriod:values['data-period']})
  let gscRows=[],gscContext=null
 try {const gsc=JSON.parse(await readFile('artifacts/seo/gsc-summary.json','utf8'));if(gsc.status==='CONNECTED'){gscRows=gsc.reports?.current?.query?.rows??[];gscContext={generatedAt:gsc.generatedAt,periods:gsc.periods}}} catch { /* Missing GSC data remains unknown. */ }
 await mkdir('artifacts/seo',{recursive:true})
 await writeFile('artifacts/seo/keywords-normalized.json',JSON.stringify({status:'CSV_FALLBACK',rows,gscContext,reviewCandidates:combineEvidence(gscRows,rows),warning:'Advertising competition is not SEO difficulty. Market/language are operator declarations; verify export settings.'},null,2)+'\n',{mode:0o600})
 console.log(JSON.stringify({status:'CSV_FALLBACK',keywords:rows.length,missingVolume:rows.filter(r=>r.monthlySearches===null&&r.volumeMin===null).length}))
}
main().catch(e=>{console.error(['INPUT_REQUIRED','FILE_TOO_LARGE','MARKET_LANGUAGE_REQUIRED','MISSING_KEYWORD_COLUMN','INVALID_CSV'].includes(e.message)?e.message:'LOCAL_IMPORT_ERROR');process.exitCode=1})



