-- Phase 1B attachment retry bindings; staging only. Alpha session locks unchanged.
create table private.mcp_attachment_ops (
 operation uuid primary key, principal text not null references private.mcp_principals,
 tool text not null check(tool in ('create_report','add_observation')),
 business jsonb not null, file_hash text not null check(file_hash ~ '^[0-9a-f]{64}$'),
 digest text check(digest ~ '^[0-9a-f]{64}$'), lease_id uuid, lease_until timestamptz
);
alter table private.mcp_attachment_ops enable row level security;
revoke all on private.mcp_attachment_ops from public,anon,authenticated,service_role;

create function public.mcp_attachment_begin(p text,op uuid,tool_name text,data jsonb,file_hash text,lease uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.mcp_attachment_ops; done private.mcp_operations; photo private.mcp_photos; allowed text[];
begin
 perform private.mcp_actor(p);
 if op is null or lease is null or tool_name not in ('create_report','add_observation') or jsonb_typeof(data)<>'object' or file_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INPUT';end if;
 if data->'confirmed' is distinct from 'true'::jsonb then raise exception 'CONFIRMATION_REQUIRED';end if;
 allowed:=case tool_name when 'create_report' then array['city_id','district','lat','lng','title','address','description','category','wheelchair_access','confirmed'] else array['report_id','message','suggested_status','confirmed'] end;
 if exists(select 1 from jsonb_object_keys(data) k where not(k=any(allowed))) then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(op::text,73191));
 select * into b from private.mcp_attachment_ops where operation=op for update;
 select * into done from private.mcp_operations where operation=op;
 if b.operation is null then
  if done.operation is not null or exists(select 1 from private.mcp_photos where operation=op) then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  insert into private.mcp_attachment_ops(operation,principal,tool,business,file_hash) values(op,p,tool_name,data,file_hash) returning * into b;
 end if;
 if b.principal<>p then raise exception 'FORBIDDEN';end if;
 if b.tool<>tool_name or b.business<>data or b.file_hash<>mcp_attachment_begin.file_hash then raise exception 'IDEMPOTENCY_CONFLICT';end if;
 if done.operation is not null then
  if done.principal<>p then raise exception 'FORBIDDEN';end if;
  select * into photo from private.mcp_photos where operation=op;
  if done.tool<>tool_name or done.payload-'photo_hash'<>data or photo.principal<>p or photo.token_hash is distinct from done.payload->>'photo_hash' or b.digest is null or photo.bytes_digest is distinct from b.digest or not photo.consumed then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('replay',done.result||jsonb_build_object('replayed',true));
 end if;
 if b.lease_id is not null and b.lease_until>clock_timestamp() then return jsonb_build_object('busy',true);end if;
 -- This is a byte-ingestion lease, NOT an Auth refresh lock. Vercel maxDuration=60;
 -- 180s expiry fences a killed invocation before takeover. Upload remains immutable.
 update private.mcp_attachment_ops set lease_id=lease,lease_until=clock_timestamp()+interval '180 seconds' where operation=op;
 select * into photo from private.mcp_photos where operation=op;
 if photo.operation is not null and (photo.principal<>p or photo.bytes_digest is distinct from b.digest) then raise exception 'IDEMPOTENCY_CONFLICT';end if;
 return jsonb_build_object('busy',false,'digest',b.digest,'photo_path',photo.path);
end $$;

create function public.mcp_attachment_digest(p text,op uuid,lease uuid,digest text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.mcp_attachment_ops;
begin
 perform private.mcp_actor(p);
 if digest !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INPUT';end if;
 select * into b from private.mcp_attachment_ops where operation=op for update;
 if not found or b.principal<>p or b.lease_id is distinct from lease or b.lease_until<=clock_timestamp() then raise exception 'FORBIDDEN';end if;
 if b.digest is not null and b.digest<>mcp_attachment_digest.digest then raise exception 'IDEMPOTENCY_CONFLICT';end if;
 update private.mcp_attachment_ops set digest=mcp_attachment_digest.digest where operation=op;
 return jsonb_build_object('ok',true);
end $$;

create function public.mcp_attachment_release(p text,op uuid,lease uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.mcp_actor(p);
 update private.mcp_attachment_ops set lease_id=null,lease_until=null where operation=op and principal=p and lease_id=lease;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.mcp_attachment_begin(text,uuid,text,jsonb,text,uuid),public.mcp_attachment_digest(text,uuid,uuid,text),public.mcp_attachment_release(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mcp_attachment_begin(text,uuid,text,jsonb,text,uuid),public.mcp_attachment_digest(text,uuid,uuid,text),public.mcp_attachment_release(text,uuid,uuid) to service_role;
