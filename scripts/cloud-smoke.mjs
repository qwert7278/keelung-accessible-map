// Run only against the dedicated test project: node --env-file=.env.local scripts/cloud-smoke.mjs
// Uses publishable key + genuine anonymous Auth; never a service-role credential.
import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert(url && key);
const make = () => createClient(url, key, {auth:{persistSession:false, autoRefreshToken:false}});
const guest = make(), db = make();
const passed = [];
function ok(name, result) { assert.equal(result.error, null, `${name}: ${result.error?.message}`); passed.push(name); return result.data; }
function denied(name, result) { assert(result.error, `${name}: unexpectedly allowed`); passed.push(name); }
const {user} = ok('real anonymous sign-in', await db.auth.signInAnonymously());
assert(user.is_anonymous);
const id = crypto.randomUUID(), before = `${id}/before/qa.jpg`, update = `${id}/updates/qa.jpg`;
await writeFile('output/cloud-fixture.json', JSON.stringify({id, uid:user.id, paths:[before,update]},null,2));
const bytes = await readFile(new URL('../tests/fixtures/qa-photo.jpg', import.meta.url));
denied('unauthenticated upload rejected', await guest.storage.from('report-photos').upload(before,bytes,{contentType:'image/jpeg'}));
ok('authenticated photo upload', await db.storage.from('report-photos').upload(before,bytes,{contentType:'image/jpeg'}));
denied('photo overwrite rejected', await db.storage.from('report-photos').upload(before,bytes,{contentType:'image/jpeg',upsert:true}));
const draft = {id,city_id:'TW-KEE',district:'仁愛區',title:'QA 測試資料（非真實障礙）',category:'ramp',lat:25.13,lng:121.74,wheelchair_access:'blocked',before_image_path:before};
denied('unauthenticated report rejected', await guest.from('reports').insert(draft));
ok('anonymous report creation', await db.from('reports').insert(draft));
denied('server report cooldown', await db.from('reports').insert({...draft,id:crypto.randomUUID()}));
for(const client of [guest,db]) {
 const feed=ok('public safe feed',await client.from('report_feed').select('*').eq('id',id));
 assert.equal(feed.length,1); assert(!('created_by' in feed[0])); assert(!('admin_note' in feed[0]));
 denied('hidden author rejected',await client.from('reports').select('created_by').eq('id',id));
 denied('hidden admin note rejected',await client.from('reports').select('admin_note').eq('id',id));
 denied('report delete rejected',await client.from('reports').delete().eq('id',id));
}
const changed=ok('ordinary status update has no authorized rows',await db.from('reports').update({status:'in_progress',admin_note:'forged'}).eq('id',id).select('id'));
assert.equal(changed.length,0);
denied('admin column forgery rejected',await db.from('reports').update({official_source:true}).eq('id',id));
denied('non-admin after photo rejected',await db.storage.from('report-photos').upload(`${id}/after/forged.jpg`,bytes,{contentType:'image/jpeg'}));
ok('community photo upload',await db.storage.from('report-photos').upload(update,bytes,{contentType:'image/jpeg'}));
ok('community update creation',await db.from('report_updates').insert({report_id:id,message:'QA 測試補充',image_path:update,suggested_status:'resolved'}));
denied('server community cooldown',await db.from('report_updates').insert({report_id:id,message:'spam'}));
denied('forged admin history rejected',await db.from('report_updates').insert({report_id:id,message:'forged',type:'admin'}));
ok('metadata self elevation attempt',await db.auth.updateUser({data:{role:'admin',admin:true}}));
assert.equal(ok('metadata does not grant admin',await db.rpc('is_admin')),false);
const row=ok('status remains open',await guest.from('report_feed').select('status').eq('id',id).single()); assert.equal(row.status,'open');
const updates=ok('safe community feed',await guest.from('report_update_feed').select('*').eq('report_id',id)); assert.equal(updates.length,1); assert(!('created_by' in updates[0]));
const image=await fetch(`${url}/storage/v1/object/public/report-photos/${before}`); assert.equal(image.status,200); passed.push('public evidence loads');
await writeFile('output/cloud-smoke-result.json',JSON.stringify({date:new Date().toISOString(),passed,fixture:id},null,2));
console.log(`PASS ${passed.length} checks`,passed);
