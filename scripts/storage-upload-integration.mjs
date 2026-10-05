// Opt-in, real Supabase Auth + signed prepare-photo + Storage HTTP lifecycle.
// Never uses .env.local or production credentials. Run only on an isolated project
// with the repository migrations and prepare-photo Edge Function deployed.
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const required=['STORAGE_TEST_PROJECT_REF','STORAGE_TEST_URL','STORAGE_TEST_PUBLISHABLE_KEY',
 'STORAGE_TEST_SERVICE_KEY','STORAGE_TEST_MANAGEMENT_TOKEN','STORAGE_TEST_UPLOAD_GATE_SECRET'];
const env=process.env;
const absent=required.filter(name=>!env[name]);
if(absent.length){
 console.error('BLOCKED: configure isolated Storage integration environment: '+absent.join(', '));
 process.exit(2);
}
const ref=env.STORAGE_TEST_PROJECT_REF,url=new URL(env.STORAGE_TEST_URL);
assert(/^[a-z]{20}$/.test(ref),'Invalid test project ref');
assert(ref!=='ifcicahnrpkwjcxmnmug'&&ref!=='nroteeeqyylgwfjkvnsy','Production/unrelated project is forbidden');
assert(url.protocol==='https:'&&url.hostname===`${ref}.supabase.co`&&!url.username&&!url.password,
 'URL must match the explicitly selected isolated Supabase project');
url.pathname='/';url.search='';url.hash='';
const base=url.origin,bucket='report-photos',users=[],paths=[],operations=[],reports=[],passed=[];
const admin=createClient(base,env.STORAGE_TEST_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const ok=name=>{passed.push(name);console.log('PASS '+name);};
async function sql(query,expectSuccess=true){
 const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{
  method:'POST',headers:{Authorization:`Bearer ${env.STORAGE_TEST_MANAGEMENT_TOKEN}`,'Content-Type':'application/json'},
  body:JSON.stringify({query}),signal:AbortSignal.timeout(30000),redirect:'error',
 });
 if(!expectSuccess){assert(!response.ok,'Unsafe SQL claim unexpectedly succeeded');return;}
 assert(response.ok,'Isolated management SQL failed (response omitted to protect secrets)');
 return response.json();
}
async function actor(){
 const db=createClient(base,env.STORAGE_TEST_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.signInAnonymously();
 assert(!error&&data.session&&data.user,'Isolated anonymous authentication failed');
 users.push(data.user.id);return {id:data.user.id,token:data.session.access_token,db};
}
async function prepare(user,input){
 const authorization=`Bearer ${user.token}`,stamp=String(Date.now());
 const risk=createHmac('sha256',env.STORAGE_TEST_UPLOAD_GATE_SECRET).update('isolated-storage:'+user.id).digest('hex');
 const body=JSON.stringify(input);
 const signature=createHmac('sha256',env.STORAGE_TEST_UPLOAD_GATE_SECRET)
  .update(`${stamp}\n${risk}\n${authorization}\n${body}`).digest('hex');
 return fetch(base+'/functions/v1/prepare-photo',{
  method:'POST',headers:{authorization,apikey:env.STORAGE_TEST_PUBLISHABLE_KEY,'Content-Type':'application/json',
   'x-roadtag-timestamp':stamp,'x-roadtag-risk-hash':risk,'x-roadtag-signature':signature},body,
  signal:AbortSignal.timeout(30000),redirect:'error',
 });
}
async function reserve(user,format='jpeg'){
 const id=randomUUID();operations.push(id);
 const response=await prepare(user,{report:id,operation:id,kind:'before',format});
 assert(response.ok,'Signed prepare-photo reservation failed');
 const prepared=await response.json();
 assert.equal(prepared.path,`${id}/before/${id}.${format==='jpeg'?'jpg':'webp'}`);
 paths.push(prepared.path);return {id,path:prepared.path};
}
async function upload(user,path,bytes,mime,upsert=false){
 // Same raw HTTP body / headers as the production XMLHttpRequest, not SQL INSERT.
 return fetch(`${base}/storage/v1/object/${bucket}/${path}`,{method:'POST',headers:{
  Authorization:`Bearer ${user.token}`,apikey:env.STORAGE_TEST_PUBLISHABLE_KEY,
  'Content-Type':mime,'x-upsert':String(upsert),'cache-control':'public, max-age=3600',
 },body:bytes,signal:AbortSignal.timeout(30000),redirect:'error'});
}
async function object(path){
 const rows=await sql(`select name,owner_id,metadata from storage.objects where bucket_id=${quote(bucket)} and name=${quote(path)}`);
 return rows[0];
}
async function claim(user,reservation,valid,commit=false){
 // Both happy paths use the actual authenticated PostgREST insert + public feed.
 // Invalid claims use isolated SQL rollback without persisting report fixtures.
 const region=JSON.parse(await readFile('src/data/district-boundaries.json','utf8')).regions[0];
 if(valid&&commit){
  reports.push(reservation.id); // Retain cleanup identity even if acknowledgement is lost.
  const created=await user.db.from('reports').insert({id:reservation.id,city_id:region.cityId,
   district:region.district,title:'Isolated Storage API QA',category:'ramp',lat:region.point[0],
   lng:region.point[1],wheelchair_access:'blocked',before_image_path:reservation.path});
  assert(!created.error,'Authenticated report create failed');
  const feed=await user.db.from('report_feed').select('id,before_image_path').eq('id',reservation.id).single();
  assert(!feed.error,'Public report feed read-back failed');assert.equal(feed.data.before_image_path,reservation.path);
  const rows=await sql(`select state from private.photo_intents where operation_id=${quote(reservation.id)}`);
  assert.equal(rows[0].state,'committed');return;
 }
 const query=`begin;set local role authenticated;select set_config('request.jwt.claims',${quote(JSON.stringify({sub:user.id,role:'authenticated',is_anonymous:true}))},true);
 insert into public.reports(id,city_id,district,title,category,lat,lng,wheelchair_access,before_image_path)
 values(${quote(reservation.id)},${quote(region.cityId)},${quote(region.district)},'Isolated Storage API QA','ramp',${region.point[0]},${region.point[1]},'blocked',${quote(reservation.path)});${commit?'commit':'rollback'};`;
 await sql(query,valid);
 if(commit) reports.push(reservation.id);
 const rows=await sql(`select state from private.photo_intents where operation_id=${quote(reservation.id)}`);
 assert.equal(rows[0].state,commit?'committed':'active','Photo claim state must match transaction outcome');
}
async function rejected(name,setup,expected){
 const user=await actor(),reservation=await reserve(user);
 const response=await setup(user,reservation);assert(!response.ok,name+' unexpectedly allowed');
 if(expected) assert.match(await response.text(),expected,'Failure must identify the bucket restriction, not an unrelated error');
 assert.equal(await object(reservation.path),undefined,'Rejected upload created a final object');ok(name);
}

async function main(){
 // Fail before creating accounts if migrations/limits do not match this test.
 const config=await sql(`select file_size_limit,allowed_mime_types from storage.buckets where id=${quote(bucket)}`);
 assert.equal(Number(config[0]?.file_size_limit),1048576);
 assert.deepEqual(config[0].allowed_mime_types,['image/webp','image/jpeg']);
 const functions=await sql("select pg_get_functiondef('private.photo_allowed(text,text,jsonb)'::regprocedure) as allowed,pg_get_functiondef('private.claim_photo(text)'::regprocedure) as claim");
 assert(!functions[0].allowed.includes("metadata->>"),'Apply lifecycle migration to isolated environment first');
 assert(functions[0].claim.includes("o.metadata->>'mimetype'"),'Final claim MIME validation is missing');
 const jpeg=await readFile('tests/fixtures/qa-photo.jpg');
 // Reuse an existing encoded, metadata-free WebP rather than changing image pipeline.
 const webp=await readFile('public/images/roadtag-icon-map.webp');
 const png=await readFile('tests/fixtures/qa-transparent.png');
 for(const [format,mime,bytes] of [['jpeg','image/jpeg',jpeg],['webp','image/webp',webp]]){
  const user=await actor(),reservation=await reserve(user,format);
  assert((await upload(user,reservation.path,bytes,mime)).ok,format+' real upload failed');
  const stored=await object(reservation.path);assert.equal(stored.owner_id,user.id);
  assert.equal(stored.metadata.mimetype,mime);assert.equal(Number(stored.metadata.size),bytes.length);
  assert(bytes.length<=1048576);await claim(user,reservation,true,true);ok(format+' HTTP upload + final metadata + authenticated report create + public feed');
  const changed=await prepare(user,{report:reservation.id,operation:reservation.id,kind:'before',format:format==='jpeg'?'webp':'jpeg'});
  assert(!changed.ok,'Reservation operation format mismatch allowed');ok(format+' reservation operation format mismatch rejected');
  const fetched=await fetch(`${base}/storage/v1/object/public/${bucket}/${reservation.path}`,{signal:AbortSignal.timeout(30000)});
  assert(fetched.ok);assert.deepEqual(Buffer.from(await fetched.arrayBuffer()),bytes);ok(format+' public photo byte read-back');
  for(const upsert of [false,true]) assert(!(await upload(user,reservation.path,bytes,mime,upsert)).ok,'Overwrite allowed');
  ok(format+' overwrite/upsert rejected');
  const removed=await user.db.storage.from(bucket).remove([reservation.path]);
  // DELETE under RLS may return [] without an error; authoritative existence matters.
  assert(removed.error||removed.data.length===0,'DELETE returned an owned object');
  assert(await object(reservation.path),'DELETE removed protected photo');ok(format+' delete rejected');
 }
 const unreservedUser=await actor(),unreservedId=randomUUID();
 assert(!(await upload(unreservedUser,`${unreservedId}/before/${unreservedId}.jpg`,jpeg,'image/jpeg')).ok);ok('no reservation rejected');
 await rejected('wrong owner rejected',async(_,r)=>upload(await actor(),r.path,jpeg,'image/jpeg'));
 await rejected('expired reservation rejected',async(u,r)=>{
  await sql(`update private.photo_intents set expires_at=clock_timestamp()-interval '1 second' where operation_id=${quote(r.id)}`);
  return upload(u,r.path,jpeg,'image/jpeg');
 });
 await rejected('wrong path rejected',async(u,r)=>upload(u,r.path.replace('/before/','/updates/'),jpeg,'image/jpeg'));
 await rejected('arbitrary extension rejected',async(u,r)=>upload(u,r.path.replace('.jpg','.exe'),jpeg,'image/jpeg'));
 await rejected('PNG rejected by bucket',async(u,r)=>upload(u,r.path,png,'image/png'),/mime|type|unsupported/i);
 await rejected('over 1 MiB rejected by bucket',async(u,r)=>upload(u,r.path,Buffer.alloc(1048577),'image/jpeg'),/size|large|limit|exceed/i);
 // Both MIME types are bucket-allowed. RLS accepts upload; report claim must reject.
 for(const [format,bytes,mime] of [['jpeg',webp,'image/webp'],['webp',jpeg,'image/jpeg']]){
  const user=await actor(),reservation=await reserve(user,format);
  assert((await upload(user,reservation.path,bytes,mime)).ok,'Mismatch fixture upload failed');
  await claim(user,reservation,false);ok(format+' extension/final MIME mismatch cannot become a report');
 }
 const ordinary=await actor(),afterId=randomUUID();operations.push(afterId);
 const after=await prepare(ordinary,{report:reports[0],operation:afterId,kind:'after',format:'jpeg'});
 assert(!after.ok,'Non-admin after reservation allowed');ok('non-admin cannot reserve after photo');
 console.log(`PASS ${passed.length} real Storage HTTP lifecycle checks on isolated project`);
}

let failed=false;
try{await main();}catch{failed=true;console.error('FAIL: real Storage integration did not complete; inspect the last PASS label. Secrets/response bodies omitted.');}
finally{
 // Admin cleanup limited to UUIDs generated by this run. Never SQL-delete objects.
 try{
  if(reports.length) await sql(`delete from public.report_updates where report_id in (${reports.map(quote).join(',')});delete from public.reports where id in (${reports.map(quote).join(',')});`);
  if(paths.length){const removed=await admin.storage.from(bucket).remove(paths);assert(!removed.error,'Fixture object cleanup failed');}
  if(operations.length) await sql(`delete from private.photo_intents where operation_id in (${operations.map(quote).join(',')});delete from private.upload_risk_limits where risk_hash in (${users.map(id=>quote(createHmac('sha256',env.STORAGE_TEST_UPLOAD_GATE_SECRET).update('isolated-storage:'+id).digest('hex'))).join(',')});`);
  for(const id of users){const removed=await admin.auth.admin.deleteUser(id);assert(!removed.error,'Fixture Auth cleanup failed');}
 }catch{failed=true;console.error('FAIL: isolated fixture cleanup incomplete; inspect test project (no Production resources touched).');}
}
if(failed) process.exitCode=1;
