import test from 'node:test'
import assert from 'node:assert/strict'
import { jsonRequest } from './api.mjs'
test('401/403/503 discard sensitive provider body',async()=>{
 for(const status of [401,403,503]) await assert.rejects(jsonRequest('https://example.test',{},async()=>({status,ok:false,json:()=>{throw new Error('DO_NOT_READ_TOKEN')}})),new RegExp(status===503?'UNAVAILABLE':'AUTH_REQUIRED'))
})
test('429 retries once then safely stops',async()=>{
 let requests=0,waits=0
 await assert.rejects(jsonRequest('https://example.test',{},async()=>{requests++;return {status:429,ok:false}},async()=>{waits++}),/RATE_LIMITED/)
 assert.equal(requests,2);assert.equal(waits,1)
})
test('429 recovery and empty response',async()=>{
 let requests=0
 const result=await jsonRequest('https://example.test',{},async()=>++requests===1?{status:429,ok:false}:{status:200,ok:true,json:async()=>({})},async()=>{})
 assert.deepEqual(result,{})
})

