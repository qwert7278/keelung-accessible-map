// Isolated WASM PostgreSQL; no production URL, tokens, Auth accounts or photos.
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
`);
await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb,unique(bucket_id,name));
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects to service_role;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
 create function storage.extension(name text) returns text language sql immutable as $$select reverse(split_part(reverse(name),'.',1))$$;
`);
for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
 const sql=(await readFile('supabase/migrations/'+file,'utf8')).replace(/^alter publication.*;$/gm,'');
 await db.exec(sql);
}
const passed=[];
const ok=(name)=>passed.push(name);
const denied=async(name,sql,pattern)=>{await db.exec('savepoint negative_test');let error;try{if(typeof sql==='function')await sql();else await db.exec(sql);}catch(e){error=e;}await db.exec('rollback to negative_test;release negative_test');assert(error,name+' was unexpectedly allowed');if(pattern)assert.match(error.message,pattern);ok(name);};
const login=async(uid)=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claims','${JSON.stringify({sub:uid,role:'authenticated',is_anonymous:true})}',false);`);
const scalar=async(sql)=>Object.values((await db.query(sql)).rows[0])[0];
const reserve=async(report,kind,operation,risk,format)=>{
 const claims=await scalar('select auth.jwt()');
 await db.exec('reset role;set role service_role');
 const result=await scalar(`select public.${format===undefined?'reserve_photo_verified':'reserve_photo_verified_format'}('${claims.sub}',${claims.is_anonymous===true},'${report}','${kind}','${operation}','${risk||claims.sub.replaceAll('-','').padEnd(64,'0')}'${format===undefined?'':','+sqlQuote(format)})`);
 await db.exec('reset role;set role authenticated');
 return result;
};
const sqlQuote=value=>"'"+String(value).replaceAll("'","''")+"'";
const regions=JSON.parse(await readFile('src/data/district-boundaries.json','utf8')).regions;
assert.equal(await scalar('select count(*) from public.cities where enabled'),22);ok('22 enabled cities');
assert.equal(await scalar('select count(*) from private.district_regions'),368);ok('368 district polygons');
await db.exec('begin');
for(let i=0;i<regions.length;i++) {
 const region=regions[i],uid=`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,id=`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
 await login(uid);
 const reserved=await reserve(id,'before',id);
 assert.equal(reserved.uploaded,false);
 await db.exec(`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos',${sqlQuote(reserved.path)},'${uid}','{"mimetype":"image/webp","size":50000}');
 insert into public.reports(id,city_id,district,title,category,lat,lng,wheelchair_access,before_image_path)
 values('${id}',${sqlQuote(region.cityId)},${sqlQuote(region.district)},'Isolated QA only','ramp',${region.point[0]},${region.point[1]},'blocked',${sqlQuote(reserved.path)});`);
 assert.equal(await scalar(`select public.owned_report('${id}')`),id);
}
ok('real SQL insert accepted for every one of 368 districts, including offshore islands');
// New format contract exercised against real SQL/RLS, without production writes.
const jpegUid=crypto.randomUUID(),jpegId=crypto.randomUUID();await login(jpegUid);
const jpg=await reserve(jpegId,'before',jpegId,undefined,'jpeg');
assert.equal(jpg.path,`${jpegId}/before/${jpegId}.jpg`);ok('JPEG reservation maps to jpg');
assert.deepEqual(await reserve(jpegId,'before',jpegId,undefined,'jpeg'),jpg);ok('JPEG reservation retry is idempotent');
await denied('same operation cannot change JPEG to WebP',()=>reserve(jpegId,'before',jpegId,undefined,'webp'));
await denied('legacy WebP call cannot change JPEG operation',()=>reserve(jpegId,'before',jpegId));
await denied('public JPEG reservation forbidden',`select public.reserve_photo_verified_format('${jpegUid}',true,'${jpegId}','before','${jpegId}','${'d'.repeat(64)}','jpeg')`);
await denied('private JPEG reservation forbidden',`select private.reserve_photo_format('${jpegId}','before','${jpegId}','jpeg')`);
await denied('PNG reservation rejected',()=>reserve(jpegId,'before',jpegId,undefined,'png'));
const object=(path,mime,size=50000,owner=jpegUid)=>`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos',${sqlQuote(path)},'${owner}',${sqlQuote(JSON.stringify({mimetype:mime,size}))})`;
// This SQL harness cannot enforce HTTP bucket restrictions. Invalid finalized
// metadata is rejected at claim, not INSERT. Real bucket checks live in test:storage.
const invalidFinal=async(name,sql,path)=>{
 await db.exec('savepoint final_metadata_fixture');await db.exec(sql);
 await denied(name,`select private.claim_photo(${sqlQuote(path)})`,/照片上傳尚未完成/);
 await db.exec('reset role');assert.equal(await scalar(`select state from private.photo_intents where path=${sqlQuote(path)}`),'active');
 await db.exec('set role authenticated');
 await db.exec('rollback to final_metadata_fixture;release final_metadata_fixture');
};
await db.exec('reset role');
assert.equal(await scalar("select file_size_limit from storage.buckets where id='report-photos'"),1048576);
assert.deepEqual(await scalar("select allowed_mime_types from storage.buckets where id='report-photos'"),['image/webp','image/jpeg']);ok('bucket constraints remain 1 MiB / WebP + JPEG');
await login(jpegUid);
for(const metadata of ['null',"'{}'::jsonb","'{\"size\":0}'::jsonb"]){
 await invalidFinal('incomplete INSERT metadata accepted, incomplete final metadata cannot be claimed',
  `insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos',${sqlQuote(jpg.path)},'${jpegUid}',${metadata})`,jpg.path);
}
await invalidFinal('jpg with finalized WebP MIME cannot be claimed',object(jpg.path,'image/webp'),jpg.path);
await invalidFinal('jpg with finalized PNG MIME cannot be claimed',object(jpg.path,'image/png'),jpg.path);
await invalidFinal('finalized JPEG over 1 MiB cannot be claimed',object(jpg.path,'image/jpeg',1048577),jpg.path);
await invalidFinal('empty finalized JPEG cannot be claimed',object(jpg.path,'image/jpeg',0),jpg.path);
await invalidFinal('malformed finalized size cannot be claimed',object(jpg.path,'image/jpeg','NaN'),jpg.path);
await denied('JPEG wrong owner rejected',object(jpg.path,'image/jpeg',50000,crypto.randomUUID()));
await denied('unreserved JPEG rejected',object(`${crypto.randomUUID()}/before/x.jpg`,'image/jpeg'));
await denied('reserved jpg cannot change extension',object(jpg.path.replace('.jpg','.jpeg'),'image/jpeg'));
await login(crypto.randomUUID());await denied('JPEG reservation cannot be uploaded by another user',object(jpg.path,'image/jpeg'));
await login(jpegUid);
await db.exec(object(jpg.path,'image/jpeg'));ok('reserved JPEG upload accepted');
assert.equal((await reserve(jpegId,'before',jpegId,undefined,'jpeg')).uploaded,true);ok('JPEG lost upload acknowledgement skips reupload');
await denied('JPEG overwrite denied',object(jpg.path,'image/jpeg'));
assert.equal((await db.query(`update storage.objects set metadata='{}' where name='${jpg.path}' returning id`)).rows.length,0);
assert.equal((await db.query(`delete from storage.objects where name='${jpg.path}' returning id`)).rows.length,0);ok('JPEG update and delete blocked');
const jpegRegion=regions[0];await db.exec(`insert into public.reports(id,city_id,district,title,category,lat,lng,wheelchair_access,before_image_path) values('${jpegId}',${sqlQuote(jpegRegion.cityId)},${sqlQuote(jpegRegion.district)},'Isolated JPEG QA','ramp',${jpegRegion.point[0]},${jpegRegion.point[1]},'blocked',${sqlQuote(jpg.path)})`);
assert.equal(await scalar(`select public.owned_report('${jpegId}')`),jpegId);assert.equal(await scalar(`select before_image_path from public.report_feed where id='${jpegId}'`),jpg.path);ok('JPEG report claim and feed compatibility');
const jpegUpdateId=crypto.randomUUID(),jpegUpdate=await reserve(jpegId,'updates',jpegUpdateId,undefined,'jpeg');
await db.exec(object(jpegUpdate.path,'image/jpeg'));await db.exec(`insert into public.report_updates(report_id,message,image_path,operation_id) values('${jpegId}','JPEG community update','${jpegUpdate.path}','${jpegUpdateId}')`);
assert(await scalar(`select public.owned_update('${jpegId}','${jpegUpdateId}')`));ok('JPEG community update claimed');
await denied('anonymous JPEG after photo denied',()=>reserve(jpegId,'after',crypto.randomUUID(),undefined,'jpeg'));
const wpId=crypto.randomUUID(),wp=await reserve(wpId,'before',wpId,undefined,'webp');
await invalidFinal('webp with finalized JPEG MIME cannot be claimed',object(wp.path,'image/jpeg'),wp.path);
await denied('same operation cannot change WebP to JPEG',()=>reserve(wpId,'before',wpId,undefined,'jpeg'));
const abandoned=crypto.randomUUID(),ab=await reserve(abandoned,'before',abandoned,undefined,'jpeg');
await db.exec(`reset role;update private.photo_intents set expires_at=clock_timestamp()-interval '1 second' where path='${ab.path}'`);
await login(jpegUid);await denied('expired JPEG upload denied',object(ab.path,'image/jpeg'));
await denied('expired JPEG retry denied',()=>reserve(abandoned,'before',abandoned,undefined,'jpeg'));
await db.exec('reset role;set role service_role');const jpegExpired=await scalar('select public.expired_photos()');assert(jpegExpired.includes(ab.path));assert(!jpegExpired.includes(jpg.path));ok('JPEG cleanup excludes referenced report photo');
// Lifecycle model: authorization may see NULL metadata; only finalized metadata
// can pass the actual report trigger. This is SQL regression, not HTTP evidence.
await db.exec('reset role;savepoint lifecycle_fixture');
const lifecycleUid=crypto.randomUUID(),lifecycleId=crypto.randomUUID();await login(lifecycleUid);
const lifecycle=await reserve(lifecycleId,'before',lifecycleId,undefined,'jpeg');
await db.exec(`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos',${sqlQuote(lifecycle.path)},'${lifecycleUid}',null)`);
ok('reserved INSERT accepts NULL metadata at authorization time');
const lifecycleInsert=`insert into public.reports(id,city_id,district,title,category,lat,lng,wheelchair_access,before_image_path) values('${lifecycleId}',${sqlQuote(jpegRegion.cityId)},${sqlQuote(jpegRegion.district)},'Lifecycle QA','ramp',${jpegRegion.point[0]},${jpegRegion.point[1]},'blocked',${sqlQuote(lifecycle.path)})`;
await denied('report insert before metadata finalization rejected',lifecycleInsert,/照片上傳尚未完成/);
await db.exec('reset role');assert.equal(await scalar(`select state from private.photo_intents where operation_id='${lifecycleId}'`),'active');
assert.equal(await scalar(`select count(*) from public.reports where id='${lifecycleId}'`),0);ok('failed final validation rolls back report and photo claim');
await db.exec(`update storage.objects set metadata='{"mimetype":"image/jpeg","size":50000}' where name=${sqlQuote(lifecycle.path)}`);
await login(lifecycleUid);await db.exec(lifecycleInsert);
assert.equal(await scalar(`select public.owned_report('${lifecycleId}')`),lifecycleId);ok('same reservation succeeds after final metadata persists');
await db.exec('reset role;rollback to lifecycle_fixture;release lifecycle_fixture');
await login('00000000-0000-4000-8000-000000000001');
const id='10000000-0000-4000-8000-000000000001';
assert.equal(await scalar(`select public.is_admin()`),false);ok('anonymous cannot become admin');
const communityOperation=crypto.randomUUID();
await db.exec(`insert into public.report_updates(report_id,message,operation_id) values('${id}','Isolated update','${communityOperation}')`);
const communityResult=await scalar(`select public.owned_update('${id}','${communityOperation}')`);assert(communityResult);ok('community update retry resolves its committed operation');
await denied('duplicate community operation denied',`insert into public.report_updates(report_id,message,operation_id) values('${id}','Duplicate','${communityOperation}')`);
await login('00000000-0000-4000-8000-000000000002');
assert.equal(await scalar(`select public.owned_update('${id}','${communityOperation}')`),null);ok('update operation does not expose another author');
await login('00000000-0000-4000-8000-000000000001');
await denied('direct public reservation RPC denied',`select public.reserve_photo('${id}','before','${id}')`);
await denied('forged service reservation denied',`select public.reserve_photo_verified('${crypto.randomUUID()}',false,'${id}','before','${id}','${'a'*64}')`);
await denied('hidden author denied',`select created_by from public.reports`);
await denied('internal report operation column denied',`select last_operation_id from public.reports`);
await denied('internal timeline operation column denied',`select operation_id from public.report_updates`);
await denied('private intents inaccessible',`select * from private.photo_intents`);
await denied('immutable title denied',`update public.reports set title='forged' where id='${id}'`);
assert.equal((await db.query(`update public.reports set status='in_progress',admin_note='forged' where id='${id}' returning id`)).rows.length,0);ok('ordinary status mutation has no authorized rows');
await denied('report delete denied',`delete from public.reports where id='${id}'`);
await denied('service cleanup RPC denied',`select public.expired_photos()`);
await denied('non-admin after photo denied',()=>reserve(id,'after',crypto.randomUUID()));
assert.equal(await scalar(`select public.owned_report('10000000-0000-4000-8000-000000000002')`),null);ok('owned result does not expose another author');
await denied('unreserved direct upload denied',`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos','${crypto.randomUUID()}/before/test.webp','00000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":50000}')`);
const fresh=crypto.randomUUID();
const reservation=await reserve(fresh,'before',fresh);
await invalidFinal('oversized finalized WebP cannot be claimed',`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos','${reservation.path}','00000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1048577}')`,reservation.path);
await invalidFinal('PNG finalized metadata cannot be claimed',`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos','${reservation.path}','00000000-0000-4000-8000-000000000001','{"mimetype":"image/png","size":50000}')`,reservation.path);
assert.equal((await db.query(`update storage.objects set metadata='{}' where name='${id}/before/${id}.webp' returning id`)).rows.length,0);ok('photo overwrite blocked by RLS');
assert.equal((await db.query(`delete from storage.objects where name='${id}/before/${id}.webp' returning id`)).rows.length,0);ok('photo delete blocked by RLS');
const retried=await reserve(fresh,'before',fresh);assert.equal(retried.path,reservation.path);ok('retry reuses reservation path');
await db.exec('reset role');
assert.equal(await scalar("select private.valid_district('TW-KEE','七堵區',25.1283,121.7419)"),false);ok('wrong district coordinates rejected');
assert.equal(await scalar("select private.valid_district('TW-KEE','仁愛區',0,0)"),false);ok('foreign coordinates rejected');
// Quotas and cleanup are tested with isolated private metadata, never live files.
await db.exec(`update private.photo_intents set expires_at=clock_timestamp()-interval '1 hour' where path='${reservation.path}';`);
await login('00000000-0000-4000-8000-000000000001');
await denied('expired reservation cannot be reused',()=>reserve(fresh,'before',fresh));
await db.exec('reset role;set role service_role');
const expired=await scalar('select public.expired_photos()');assert(expired.includes(reservation.path));assert(!expired.includes(`${id}/before/${id}.webp`));ok('cleanup selects only expired unreferenced reservations');
await db.exec('reset role');
await db.exec(`insert into private.upload_risk_limits values('${'c'.repeat(64)}',clock_timestamp()-interval '3 days',1);set role service_role;select public.expired_photos();reset role;`);
assert.equal(await scalar(`select count(*) from private.upload_risk_limits where risk_hash='${'c'.repeat(64)}'`),0);ok('scheduled cleanup purges old risk hashes without visitor traffic');
await login('00000000-0000-4000-8000-000000000001');
await denied('cleanup lock prevents a late report claim',`select private.claim_photo('${reservation.path}')`);
await db.exec('reset role;set role service_role');await db.exec(`select public.finish_photo_cleanup(array['${reservation.path}'])`);
await db.exec('reset role');
const adminUid='00000000-0000-4000-8000-000000007777';
await db.exec(`insert into private.admin_users(user_id) values('${adminUid}');set role authenticated;
 select set_config('request.jwt.claims','{"sub":"${adminUid}","role":"authenticated","is_anonymous":false}',false);`);
const afterId=crypto.randomUUID();
const after=await reserve(id,'after',afterId,undefined,'jpeg');
await db.exec(`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos','${after.path}','${adminUid}','{"mimetype":"image/jpeg","size":50000}');
 update public.reports set status='resolved',admin_note='Isolated admin QA',after_image_path='${after.path}' where id='${id}';`);
assert.equal(await scalar(`select status from public.report_feed where id='${id}'`),'resolved');ok('authorized admin improvement and audit still succeed');
const expected=await scalar(`select updated_at::text from public.report_feed where id='${id}'`),adminOperation=crypto.randomUUID();
const moderate=`select public.moderate_report('${id}','${expected}','${adminOperation}','in_progress','difficult','Retry QA',null)`;
const timeline=await scalar(moderate);assert(timeline);assert.equal(await scalar(moderate),timeline);ok('admin retry with stale timestamp returns the same timeline');
await denied('new admin operation with stale timestamp conflicts',`select public.moderate_report('${id}','${expected}','${crypto.randomUUID()}','resolved','passable','Stale',null)`);
await db.exec('reset role');assert.equal(await scalar(`select count(*) from public.report_updates where operation_id='${adminOperation}'`),1);ok('admin retry creates one timeline record');
const sharedRisk='b'.repeat(64);
for(let n=0;n<30;n++) {const uid=crypto.randomUUID(),op=crypto.randomUUID();await login(uid);await reserve(op,'before',op,sharedRisk);}
await login(crypto.randomUUID());const blockedNetworkOp=crypto.randomUUID();
await denied('rotating anonymous accounts share a 30-per-hour network ceiling',()=>reserve(blockedNetworkOp,'before',blockedNetworkOp,sharedRisk),/此網路/);
await db.exec('reset role');
const quotaUid='00000000-0000-4000-8000-000000009999';
await db.exec(`insert into private.photo_intents(operation_id,report_id,owner_id,kind,path,state)
 select gen_random_uuid(),gen_random_uuid(),'${quotaUid}','before','quota/'||n,'committed' from generate_series(1,10) n;`);
await login(quotaUid);const overQuota=crypto.randomUUID();
await denied('hourly upload quota enforced',()=>reserve(overQuota,'before',overQuota),/照片上傳過於頻繁/);
await db.exec('reset role');
const globalUid='00000000-0000-4000-8000-000000008888';
await db.exec(`insert into private.photo_intents(operation_id,report_id,owner_id,kind,path,state)
 select gen_random_uuid(),gen_random_uuid(),'${quotaUid}','before','global/'||n,'committed' from generate_series(1,2000) n;`);
await login(globalUid);const globalId=crypto.randomUUID();
await denied('sitewide daily quota enforced across users',()=>reserve(globalId,'before',globalId),/今日照片上傳額度/);
await db.exec('reset role');
await db.exec('rollback');
assert.equal(await scalar('select count(*) from public.reports'),0);ok('all synthetic fixtures rolled back');
await db.close();console.log(`PASS ${passed.length} database checks`,passed);
