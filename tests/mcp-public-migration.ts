import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
const db=new PGlite();
try{
 await db.exec('create role anon; create role authenticated; create schema private; create schema unrelated; create function unrelated.existing() returns integer language sql as $$select 1$$; grant execute on function unrelated.existing() to anon;');
 const before=JSON.stringify((await db.query('select defaclrole,defaclnamespace,defaclobjtype,defaclacl::text from pg_default_acl order by 1,2,3')).rows);
 await db.exec(await readFile('supabase/migrations/20261013050238_mcp_public_controls.sql','utf8'));
 const after=JSON.stringify((await db.query('select defaclrole,defaclnamespace,defaclobjtype,defaclacl::text from pg_default_acl order by 1,2,3')).rows);
 assert.equal(after,before,'Quota migration must not change database default ACLs');
 await db.exec('create function unrelated.future() returns integer language sql as $$select 1$$;create function private.future_probe() returns integer language sql as $$select 1$$;create function mcp_public_quota.future_probe() returns integer language sql as $$select 1$$;');
 assert.equal((await db.query<{ok:boolean}>("select has_function_privilege('anon','unrelated.future()','EXECUTE') as ok")).rows[0].ok,true);
 for(const schema of ['private','mcp_public_quota']){
  assert.equal((await db.query<{ok:boolean}>('select has_schema_privilege($1,$2,$3) as ok',['anon',schema,'USAGE'])).rows[0].ok,false);
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');await tx.exec('select '+schema+'.future_probe()');}));
 }
 const result=await db.transaction(async tx=>{await tx.exec('set local role anon');return (await tx.query<{r:{allowed:boolean;code:string}}>("select public.mcp_public_acquire(repeat('a',64),'request') as r")).rows[0].r;});assert.equal(result.code,'SERVICE_UNAVAILABLE');
 assert.equal((await db.query<{ok:boolean}>("select has_function_privilege('anon','mcp_public_quota.mcp_public_acquire(text,text,text,uuid)','EXECUTE') as ok")).rows[0].ok,false);
 console.log('PASS migration preserves unrelated existing/future ACLs; future private/helper functions remain inaccessible; anonymous wrapper remains gated/default-off. Local PostgreSQL only.');
}finally{await db.close();}
