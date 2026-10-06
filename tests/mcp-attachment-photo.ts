import assert from 'node:assert/strict';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {RoadTagService} from '../server/roadtag/service.js';
import {attachmentPhoto} from '../server/mcp/attachment-photo.js';
import type {Backend,Principal} from '../server/roadtag/contracts.js';
const p:Principal={id:'writer',actor:randomUUID(),write:true},op=randomUUID();
const input={operation_id:op,city_id:'TW-KEE',district:'仁愛區',lat:25.13,lng:121.74,title:'QA',category:'other',wheelchair_access:'passable',confirmed:true,photo_file:{download_url:'https://example.com/private',file_id:'private-id'}};
let stored:Uint8Array|undefined,puts=0,finalizes=0,writes=0;
const backend:Backend={
 async rpc(name,args){assert.equal(args.p,p.id);if(name==='mcp_reserve')return {path:'qa.webp',uploaded:!!stored};if(name==='mcp_finalize'){finalizes++;assert.equal(args.format_name,'webp');return {expires_at:new Date().toISOString()};}writes++;throw Error('unexpected domain write');},
 async feed(){return [];},async observations(){return [];},
 async put(_path,bytes,mime,actor){assert.equal(actor,p);assert.equal(mime,'image/webp');puts++;stored=bytes;},
 async bytes(_path,actor){assert.equal(actor,p);return stored!;},photoUrl(){return '';}
};
const service=new RoadTagService(backend,'https://example.com','a'.repeat(32)),bytes=await sharp({create:{width:80,height:40,channels:3,background:'red'}}).webp().toBuffer();
const token=await attachmentPhoto(service,'create_report',input,p,bytes);assert.match(token.photo_token,/^[A-Za-z0-9_-]{43}$/);assert.equal(puts,1);assert.equal(finalizes,1);assert.equal(writes,0);
assert.equal((await attachmentPhoto(service,'create_report',input,p,bytes)).photo_token,token.photo_token);assert.equal(puts,1);
await assert.rejects(attachmentPhoto(service,'create_report',input,p,await sharp(bytes).negate().webp().toBuffer()),/IDEMPOTENCY_CONFLICT/);assert.equal(puts,1);
await assert.rejects(attachmentPhoto(service,'create_report',{...input,confirmed:false},p,bytes),/INVALID_INPUT/);
await assert.rejects(attachmentPhoto(service,'create_report',input,{...p,write:false},bytes),/FORBIDDEN/);
console.log('PASS attachment photo gate: existing reserve/actor upload/finalize, stable private token, immutable content conflicts, confirmation and no report writes');
