-- Phase 1A: local/isolated validation only; no Production application authorized.
create table private.mcp_principals (
 principal text primary key check(length(principal) between 1 and 100),
 actor uuid unique not null, can_write boolean not null default false, enabled boolean not null default true
);
create table private.mcp_photos (
 token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'), principal text not null references private.mcp_principals,
 actor uuid not null, operation uuid unique not null, report uuid not null, kind text not null check(kind in ('before','updates')),
 path text unique not null, format text not null check(format in ('jpeg','webp')), bytes_digest text not null,
 expires_at timestamptz not null, consumed boolean not null default false
);
create table private.mcp_operations (
 principal text not null references private.mcp_principals, tool text not null check(tool in ('create_report','add_observation')),
 operation uuid not null, payload jsonb not null, result jsonb not null,
 primary key(principal,tool,operation), unique(operation)
);
alter table private.mcp_principals enable row level security;
alter table private.mcp_photos enable row level security;
alter table private.mcp_operations enable row level security;
revoke all on private.mcp_principals,private.mcp_photos,private.mcp_operations from public,anon,authenticated,service_role;

create function private.mcp_actor(p text) returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid;
begin
 select actor into a from private.mcp_principals where principal=p and enabled and can_write;
 if a is null or exists(select 1 from private.admin_users where user_id=a) then raise exception 'FORBIDDEN';end if;
 return a;
end $$;
revoke all on function private.mcp_actor(text) from public,anon,authenticated,service_role;

-- Server-encrypted Auth session; no plaintext JWT/refresh token in SQL or config.
-- lock_id is durable and has NO expiry/takeover. An ambiguous refresh/crash needs
-- operator revocation of the old Auth session before explicit re-provisioning.
create table private.mcp_actor_sessions (
 principal text primary key references private.mcp_principals,
 actor uuid not null, sealed text not null check(length(sealed) between 40 and 65536),
 lock_id uuid, locked_at timestamptz, updated_at timestamptz not null default now()
);
alter table private.mcp_actor_sessions enable row level security;
revoke all on private.mcp_actor_sessions from public,anon,authenticated,service_role;

create function public.mcp_session_provision(p text,a uuid,sealed text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if a is null or private.mcp_actor(p)<>a then raise exception 'FORBIDDEN';end if;
 -- Insert only: never overwrite an active/blocked session from another instance.
 insert into private.mcp_actor_sessions(principal,actor,sealed) values(p,a,sealed);
 return jsonb_build_object('ok',true);
end $$;

-- Read never changes durable state; blocked rotations cannot be bypassed by read.
create function public.mcp_session_read(p text,a uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s private.mcp_actor_sessions;
begin
 if a is null or private.mcp_actor(p)<>a then raise exception 'FORBIDDEN';end if;
 select * into s from private.mcp_actor_sessions where principal=p;
 if not found or s.actor<>a then raise exception 'FORBIDDEN';end if;
 if s.lock_id is not null then return jsonb_build_object('busy',true);end if;
 return jsonb_build_object('sealed',s.sealed);
end $$;
revoke all on function public.mcp_session_read(text,uuid) from public,anon,authenticated;
grant execute on function public.mcp_session_read(text,uuid) to service_role;

create function public.mcp_session_acquire(p text,a uuid,lock_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s private.mcp_actor_sessions;
begin
 if a is null or private.mcp_actor(p)<>a or lock_id is null then raise exception 'FORBIDDEN';end if;
 select * into s from private.mcp_actor_sessions where principal=p for update;
 if not found or s.actor<>a then raise exception 'FORBIDDEN';end if;
 if s.lock_id is not null then return jsonb_build_object('busy',true);end if;
 update private.mcp_actor_sessions set lock_id=mcp_session_acquire.lock_id,locked_at=now() where principal=p;
 return jsonb_build_object('sealed',s.sealed);
end $$;

create function public.mcp_session_commit(p text,a uuid,lock_id uuid,sealed text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if a is null or private.mcp_actor(p)<>a then raise exception 'FORBIDDEN';end if;
 update private.mcp_actor_sessions s set sealed=mcp_session_commit.sealed,lock_id=null,locked_at=null,updated_at=now()
 where s.principal=p and s.actor=a and s.lock_id=mcp_session_commit.lock_id;
 if not found then raise exception 'FORBIDDEN';end if;
 return jsonb_build_object('ok',true);
end $$;

-- Safe pre-dispatch release: idempotent, no session write, only the caller's UUID.
create function public.mcp_session_release(p text,a uuid,lock_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if a is null or lock_id is null or private.mcp_actor(p)<>a then raise exception 'FORBIDDEN';end if;
 update private.mcp_actor_sessions s set lock_id=null,locked_at=null
 where s.principal=p and s.actor=a and s.lock_id=mcp_session_release.lock_id;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.mcp_session_release(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mcp_session_release(text,uuid,uuid) to service_role;

revoke all on function public.mcp_session_provision(text,uuid,text),public.mcp_session_acquire(text,uuid,uuid),public.mcp_session_commit(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.mcp_session_provision(text,uuid,text),public.mcp_session_acquire(text,uuid,uuid),public.mcp_session_commit(text,uuid,uuid,text) to service_role;

create function public.mcp_reserve(p text, op uuid, target uuid, kind_name text, format_name text, risk text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid; r jsonb;
begin
 a:=private.mcp_actor(p);
 if kind_name not in ('before','updates') then raise exception 'INVALID_INPUT';end if;
 r:=private.reserve_photo_verified_format(a,true,target,kind_name,op,risk,format_name);
 return r;
end $$;

create function public.mcp_finalize(p text, op uuid, target uuid, kind_name text, format_name text, hash text, digest text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid; i private.photo_intents; old private.mcp_photos; mime text;
begin
 a:=private.mcp_actor(p);
 if hash !~ '^[0-9a-f]{64}$' or digest !~ '^[0-9a-f]{64}$' or format_name not in ('jpeg','webp') then raise exception 'INVALID_INPUT';end if;
 select * into i from private.photo_intents where operation_id=op for update;
 if not found or i.owner_id<>a or i.report_id<>target or i.kind<>kind_name or i.state<>'active' then raise exception 'PHOTO_TOKEN_INVALID';end if;
 if i.expires_at<=clock_timestamp() then raise exception 'PHOTO_TOKEN_EXPIRED';end if;
 mime:=case format_name when 'jpeg' then 'image/jpeg' else 'image/webp' end;
 if i.path<>(target::text||'/'||kind_name||'/'||op::text||(case format_name when 'jpeg' then '.jpg' else '.webp' end)) then raise exception 'PHOTO_TOKEN_INVALID';end if;
 if not exists(select 1 from storage.objects where bucket_id='report-photos' and name=i.path and owner_id=a::text
  and metadata->>'mimetype'=mime and case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::numeric between 1 and 1048576 else false end)
 then raise exception 'PHOTO_TOKEN_INVALID';end if;
 select * into old from private.mcp_photos where operation=op;
 if found then
  if old.token_hash<>hash or old.bytes_digest<>digest or old.principal<>p then raise exception 'IDEMPOTENCY_CONFLICT';end if;
 else
  insert into private.mcp_photos values(hash,p,a,op,target,kind_name,i.path,format_name,digest,i.expires_at,false);
 end if;
 return jsonb_build_object('expires_at',i.expires_at);
end $$;

create function public.mcp_write(p text, tool_name text, op uuid, data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a uuid; existing private.mcp_operations; photo private.mcp_photos; target uuid; new_id uuid; stamp timestamptz; result jsonb;
 old_claims text:=current_setting('request.jwt.claims',true); allowed text[];
begin
 a:=private.mcp_actor(p);
 if tool_name not in ('create_report','add_observation') or op is null or jsonb_typeof(data)<>'object' then raise exception 'INVALID_INPUT';end if;
 if data->'confirmed' is distinct from 'true'::jsonb then raise exception 'CONFIRMATION_REQUIRED';end if;
 allowed:=case tool_name when 'create_report' then array['photo_hash','city_id','district','lat','lng','title','address','description','category','wheelchair_access','confirmed']
 else array['report_id','message','suggested_status','photo_hash','confirmed'] end;
 if exists(select 1 from jsonb_object_keys(data) k where not(k=any(allowed))) then raise exception 'INVALID_INPUT';end if;
 -- Global op lock also handles cross-principal/global UUID collisions. No read-then-write race.
 perform pg_advisory_xact_lock(hashtextextended(op::text,73191));
 select * into existing from private.mcp_operations where operation=op;
 if found then
  if existing.principal<>p then raise exception 'FORBIDDEN';end if;
  if existing.tool<>tool_name or existing.payload<>data then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return existing.result||jsonb_build_object('replayed',true);
 end if;
 target:=case tool_name when 'create_report' then op else (data->>'report_id')::uuid end;
 if tool_name='add_observation' and not exists(select 1 from public.report_feed where id=target) then raise exception 'NOT_FOUND';end if;
 if tool_name='create_report' and (data->>'photo_hash') is null then raise exception 'PHOTO_REQUIRED';end if;
 if (data->>'photo_hash') is not null then
  select * into photo from private.mcp_photos where token_hash=data->>'photo_hash' for update;
  if not found or photo.principal<>p or photo.actor<>a or photo.operation<>op or photo.report<>target
   or photo.kind<>(case tool_name when 'create_report' then 'before' else 'updates' end) or photo.consumed then raise exception 'PHOTO_TOKEN_INVALID';end if;
  if photo.expires_at<=clock_timestamp() then raise exception 'PHOTO_TOKEN_EXPIRED';end if;
 end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','is_anonymous',true)::text,true);
 if tool_name='create_report' then
  if not private.valid_district(data->>'city_id',data->>'district',(data->>'lat')::double precision,(data->>'lng')::double precision) then raise exception 'LOCATION_MISMATCH';end if;
  insert into public.reports(id,city_id,district,title,address,description,category,lat,lng,wheelchair_access,before_image_path)
  values(op,data->>'city_id',data->>'district',data->>'title',coalesce(data->>'address',''),coalesce(data->>'description',''),data->>'category',
   (data->>'lat')::double precision,(data->>'lng')::double precision,data->>'wheelchair_access',photo.path) returning created_at into stamp;
  result:=jsonb_build_object('created',true,'replayed',false,'report_id',op,'status','open','created_at',stamp);
 else
  insert into public.report_updates(report_id,message,suggested_status,image_path,operation_id)
  values(target,data->>'message',data->>'suggested_status',photo.path,op) returning id,created_at into new_id,stamp;
  result:=jsonb_build_object('added',true,'replayed',false,'report_id',target,'observation_id',new_id,'created_at',stamp);
 end if;
 if photo.token_hash is not null then update private.mcp_photos set consumed=true where token_hash=photo.token_hash;end if;
 insert into private.mcp_operations values(p,tool_name,op,data,result);
 perform set_config('request.jwt.claims',coalesce(old_claims,''),true);
 return result;
end $$;
revoke all on function public.mcp_reserve(text,uuid,uuid,text,text,text),public.mcp_finalize(text,uuid,uuid,text,text,text,text),public.mcp_write(text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mcp_reserve(text,uuid,uuid,text,text,text),public.mcp_finalize(text,uuid,uuid,text,text,text,text),public.mcp_write(text,text,uuid,jsonb) to service_role;
