// Local byte-level Storage implementation, NOT the hosted Supabase Storage service.
import {PGlite,type Transaction} from '@electric-sql/pglite';
import {readFile,readdir,mkdir,writeFile,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {RoadError,type Backend,type Principal,type PublicRow} from '../server/roadtag/contracts.js';
const fields='id,city_id,district,title,address,description,category,lat,lng,status,wheelchair_access,created_at,updated_at,before_image_path,after_image_path';
export class LocalBackend implements Backend {
 constructor(public db:PGlite,private root:string,public origin:string){}
 static async open(root:string,origin:string){
  await mkdir(root,{recursive:true});const db=new PGlite(resolve(root,'database'));
  if(!(await db.query<{exists:boolean}>("select to_regclass('public.reports') is not null as exists")).rows[0].exists){
   await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create schema storage;grant usage on schema public,auth,storage to anon,authenticated,service_role;
    create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects to service_role;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
    create function storage.extension(name text) returns text language sql immutable as $$select reverse(split_part(reverse(name),'.',1))$$;`);
   for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec((await readFile('supabase/migrations/'+file,'utf8')).replace(/^alter publication.*;$/gm,''));
  }
  if(!(await db.query<{exists:boolean}>("select to_regclass('private.mcp_operations') is not null as exists")).rows[0].exists)throw new Error('Local database predates MCP; use a new output directory.');
  return new LocalBackend(db,resolve(root,'storage'),origin);
 }
 async register(p:Principal){await this.db.query('insert into private.mcp_principals(principal,actor,can_write) values($1,$2,$3) on conflict(principal) do update set actor=excluded.actor,can_write=excluded.can_write',[p.id,p.actor,p.write]);}
 private async transaction<T>(role:string,run:(tx:Transaction)=>Promise<T>,p?:Principal){return this.db.transaction(async tx=>{await tx.exec('set local role '+role);if(p)await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:p.actor,role:'authenticated',is_anonymous:true})]);return run(tx);});}
 async rpc(name:string,args:Record<string,unknown>):Promise<PublicRow>{
  const names:Record<string,string[]>={mcp_session_read:['p','a'],mcp_session_release:['p','a','lock_id'],mcp_session_provision:['p','a','sealed'],mcp_session_acquire:['p','a','lock_id'],mcp_session_commit:['p','a','lock_id','sealed'],mcp_reserve:['p','op','target','kind_name','format_name','risk'],mcp_finalize:['p','op','target','kind_name','format_name','hash','digest'],mcp_write:['p','tool_name','op','data']};
  if(!names[name])throw new RoadError('INVALID_INPUT');const keys=names[name];
  return this.transaction('service_role',async tx=>(await tx.query<{result:PublicRow}>(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) as result`,keys.map(k=>args[k]))).rows[0].result);
 }
 async feed(f:Record<string,string>,offset=0,limit=500){
  const clauses:string[]=[],args:unknown[]=[];const add=(sql:string,value:unknown)=>{args.push(value);clauses.push(sql+'$'+args.length);};
  if(f.id)add('id=',f.id);if(f.category)add('category=',f.category);if(f.exclude_status)add('status<>',f.exclude_status);
  if(f.south){add('lat>=',Number(f.south));add('lat<=',Number(f.north));add('lng>=',Number(f.west));add('lng<=',Number(f.east));}
  args.push(limit,offset);return this.transaction('anon',async tx=>(await tx.query<PublicRow>(`select ${fields} from public.report_feed ${clauses.length?'where '+clauses.join(' and '):''} order by id limit $${args.length-1} offset $${args.length}`,args)).rows);
 }
 async observations(report:string,limit:number){return this.transaction('anon',async tx=>(await tx.query<PublicRow>('select id,type,message,image_path,suggested_status,created_at from public.report_update_feed where report_id=$1 order by created_at desc,id asc limit $2',[report,limit])).rows);}
 path(path:string){if(!/^[0-9a-f-]{36}\/(before|updates)\/[0-9a-f-]{36}\.(jpg|webp)$/.test(path))throw new RoadError('INVALID_INPUT');const absolute=resolve(this.root,path);if(!absolute.startsWith(this.root+'\\')&&!absolute.startsWith(this.root+'/'))throw new RoadError('INVALID_INPUT');return absolute;}
 async put(path:string,bytes:Uint8Array,mime:string,p:Principal){
  if(!['image/jpeg','image/webp'].includes(mime)||bytes.length<1||bytes.length>1048576)throw new RoadError('INVALID_INPUT');
  const file=this.path(path);await mkdir(dirname(file),{recursive:true});let written=false;
  try{await this.transaction('authenticated',async tx=>{
   await tx.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('report-photos',$1,$2,$3)",[path,p.actor,{mimetype:mime,size:bytes.length}]);
   await writeFile(file,bytes,{flag:'wx'});written=true;
  },p);}catch(error){if(written)await unlink(file);throw error;}
 }
 async bytes(path:string,p:Principal){const owner=await this.transaction('authenticated',async tx=>(await tx.query('select id from storage.objects where bucket_id=$1 and name=$2',['report-photos',path])).rows,p);if(!owner.length)throw new RoadError('PHOTO_TOKEN_INVALID');return readFile(this.path(path));}
 photoUrl(path:string){return this.origin+'/local-storage/'+path;}
}
