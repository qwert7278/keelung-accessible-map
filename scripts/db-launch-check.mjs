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
const denied=async(name,sql)=>{await db.exec('savepoint negative_test');let error;try{await db.exec(sql);}catch(e){error=e;}await db.exec('rollback to negative_test;release negative_test');assert(error,name+' was unexpectedly allowed');ok(name);};
const login=async(uid)=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claims','${JSON.stringify({sub:uid,role:'authenticated',is_anonymous:true})}',false);`);
const scalar=async(sql)=>Object.values((await db.query(sql)).rows[0])[0];
const sqlQuote=value=>"'"+String(value).replaceAll("'","''")+"'";
const regions=JSON.parse(await readFile('src/data/district-boundaries.json','utf8')).regions;
assert.equal(await scalar('select count(*) from public.cities where enabled'),22);ok('22 enabled cities');
assert.equal(await scalar('select count(*) from private.district_regions'),368);ok('368 district polygons');
await db.exec('begin');
for(let i=0;i<regions.length;i++) {
 const region=regions[i],uid=`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,id=`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
 await login(uid);
 const reserved=await scalar(`select public.reserve_photo('${id}','before','${id}')`);
 assert.equal(reserved.uploaded,false);
 await db.exec(`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos',${sqlQuote(reserved.path)},'${uid}','{"mimetype":"image/webp","size":50000}');
 insert into public.reports(id,city_id,district,title,category,lat,lng,wheelchair_access,before_image_path)
 values('${id}',${sqlQuote(region.cityId)},${sqlQuote(region.district)},'Isolated QA only','ramp',${region.point[0]},${region.point[1]},'blocked',${sqlQuote(reserved.path)});`);
 assert.equal(await scalar(`select public.owned_report('${id}')`),id);
}
ok('real SQL insert accepted for every one of 368 districts, including offshore islands');
await login('00000000-0000-4000-8000-000000000001');
const id='10000000-0000-4000-8000-000000000001';
assert.equal(await scalar(`select public.is_admin()`),false);ok('anonymous cannot become admin');
await denied('hidden author denied',`select created_by from public.reports`);
await denied('private intents inaccessible',`select * from private.photo_intents`);
await denied('immutable title denied',`update public.reports set title='forged' where id='${id}'`);
assert.equal((await db.query(`update public.reports set status='in_progress',admin_note='forged' where id='${id}' returning id`)).rows.length,0);ok('ordinary status mutation has no authorized rows');
await denied('report delete denied',`delete from public.reports where id='${id}'`);
await denied('service cleanup RPC denied',`select public.expired_photos()`);
await denied('non-admin after photo denied',`select public.reserve_photo('${id}','after','${crypto.randomUUID()}')`);
assert.equal(await scalar(`select public.owned_report('10000000-0000-4000-8000-000000000002')`),null);ok('owned result does not expose another author');
await denied('unreserved direct upload denied',`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos','${crypto.randomUUID()}/before/test.webp','00000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":50000}')`);
const fresh=crypto.randomUUID();
const reservation=await scalar(`select public.reserve_photo('${fresh}','before','${fresh}')`);
await denied('oversized direct upload denied',`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos','${reservation.path}','00000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1048577}')`);
await denied('PNG metadata denied',`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos','${reservation.path}','00000000-0000-4000-8000-000000000001','{"mimetype":"image/png","size":50000}')`);
assert.equal((await db.query(`update storage.objects set metadata='{}' where name='${id}/before/${id}.webp' returning id`)).rows.length,0);ok('photo overwrite blocked by RLS');
assert.equal((await db.query(`delete from storage.objects where name='${id}/before/${id}.webp' returning id`)).rows.length,0);ok('photo delete blocked by RLS');
const retried=await scalar(`select public.reserve_photo('${fresh}','before','${fresh}')`);assert.equal(retried.path,reservation.path);ok('retry reuses reservation path');
await db.exec('reset role');
assert.equal(await scalar("select private.valid_district('TW-KEE','七堵區',25.1283,121.7419)"),false);ok('wrong district coordinates rejected');
assert.equal(await scalar("select private.valid_district('TW-KEE','仁愛區',0,0)"),false);ok('foreign coordinates rejected');
// Quotas and cleanup are tested with isolated private metadata, never live files.
await db.exec(`update private.photo_intents set expires_at=clock_timestamp()-interval '1 hour' where path='${reservation.path}';`);
await login('00000000-0000-4000-8000-000000000001');
await denied('expired reservation cannot be reused',`select public.reserve_photo('${fresh}','before','${fresh}')`);
await db.exec('reset role;set role service_role');
const expired=await scalar('select public.expired_photos()');assert(expired.includes(reservation.path));assert(!expired.includes(`${id}/before/${id}.webp`));ok('cleanup selects only expired unreferenced reservations');
await login('00000000-0000-4000-8000-000000000001');
await denied('cleanup lock prevents a late report claim',`select private.claim_photo('${reservation.path}')`);
await db.exec('reset role;set role service_role');await db.exec(`select public.finish_photo_cleanup(array['${reservation.path}'])`);
await db.exec('reset role');
const adminUid='00000000-0000-4000-8000-000000007777';
await db.exec(`insert into private.admin_users(user_id) values('${adminUid}');set role authenticated;
 select set_config('request.jwt.claims','{"sub":"${adminUid}","role":"authenticated","is_anonymous":false}',false);`);
const afterId=crypto.randomUUID();
const after=await scalar(`select public.reserve_photo('${id}','after','${afterId}')`);
await db.exec(`insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos','${after.path}','${adminUid}','{"mimetype":"image/webp","size":50000}');
 update public.reports set status='resolved',admin_note='Isolated admin QA',after_image_path='${after.path}' where id='${id}';`);
assert.equal(await scalar(`select status from public.report_feed where id='${id}'`),'resolved');ok('authorized admin improvement and audit still succeed');
await db.exec('reset role');
const quotaUid='00000000-0000-4000-8000-000000009999';
await db.exec(`insert into private.photo_intents(operation_id,report_id,owner_id,kind,path,state)
 select gen_random_uuid(),gen_random_uuid(),'${quotaUid}','before','quota/'||n,'committed' from generate_series(1,10) n;`);
await login(quotaUid);const overQuota=crypto.randomUUID();
await denied('hourly upload quota enforced',`select public.reserve_photo('${overQuota}','before','${overQuota}')`);
await db.exec('reset role');
const globalUid='00000000-0000-4000-8000-000000008888';
await db.exec(`insert into private.photo_intents(operation_id,report_id,owner_id,kind,path,state)
 select gen_random_uuid(),gen_random_uuid(),'${quotaUid}','before','global/'||n,'committed' from generate_series(1,2000) n;`);
await login(globalUid);const globalId=crypto.randomUUID();
await denied('sitewide daily quota enforced across users',`select public.reserve_photo('${globalId}','before','${globalId}')`);
await db.exec('reset role');
await db.exec('rollback');
assert.equal(await scalar('select count(*) from public.reports'),0);ok('all synthetic fixtures rolled back');
await db.close();console.log(`PASS ${passed.length} database checks`,passed);
