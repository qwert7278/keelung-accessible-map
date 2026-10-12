-- P2A-02: additive, default-off. No report, OAuth or Storage policy changes.
create table private.mcp_public_control (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 gate_hash text check(gate_hash ~ '^[0-9a-f]{64}$'),
 request_ip_minute integer not null default 60 check(request_ip_minute between 1 and 600),
 request_ip_day integer not null default 600 check(request_ip_day between 1 and 5000),
 request_global_minute integer not null default 600 check(request_global_minute between 1 and 5000),
 request_global_day integer not null default 5000 check(request_global_day between 1 and 50000),
 geocode_ip_minute integer not null default 5 check(geocode_ip_minute between 1 and 20),
 geocode_ip_day integer not null default 20 check(geocode_ip_day between 1 and 200),
 geocode_global_minute integer not null default 40 check(geocode_global_minute between 1 and 100),
 geocode_global_day integer not null default 200 check(geocode_global_day between 1 and 1000),
 concurrent_ip integer not null default 4 check(concurrent_ip between 1 and 8),
 concurrent_global integer not null default 16 check(concurrent_global between 1 and 32),
 check(not enabled or gate_hash is not null)
);
insert into private.mcp_public_control(singleton) values(true);
create table private.mcp_public_counters (
 kind text not null check(kind in ('request','geocode')),
 scope text not null,
 period integer not null check(period in (60,86400)),
 window_start bigint not null,
 used integer not null check(used>=0),
 primary key(kind,scope,period,window_start)
);
create index mcp_public_counter_expiry on private.mcp_public_counters(window_start);
create table private.mcp_public_leases (
 id uuid primary key default gen_random_uuid(),risk text not null check(risk ~ '^[0-9a-f]{64}$'),expires_at timestamptz not null
);
create index mcp_public_lease_expiry on private.mcp_public_leases(expires_at);
alter table private.mcp_public_control enable row level security;
alter table private.mcp_public_counters enable row level security;
alter table private.mcp_public_leases enable row level security;
revoke all on private.mcp_public_control,private.mcp_public_counters,private.mcp_public_leases from public,anon,authenticated;

-- Narrow gate capability: can only reserve/release quota. Cannot read reports,
-- change policy/credentials, upload, or impersonate a principal. Caller sees no hash.
create function private.mcp_public_acquire(p_gate text,p_risk text,p_kind text,p_lease uuid default null)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='2s' set lock_timeout='1s' as $$
declare c private.mcp_public_control; stored text; stamp bigint; starts bigint[]; scopes text[];
 caps integer[]; periods integer[]:=array[60,60,86400,86400]; n integer; used_count integer; lease_id uuid;
begin
 if p_gate is null or length(p_gate)<32 or length(p_gate)>128 then return jsonb_build_object('allowed',false,'code','SERVICE_UNAVAILABLE');end if;
 if p_risk is null or p_risk !~ '^[0-9a-f]{64}$' or p_kind is null or p_kind not in ('request','geocode') then raise exception 'INVALID_INPUT';end if;
 select gate_hash into stored from private.mcp_public_control where singleton;
 if stored is null or stored<>encode(sha256(convert_to(p_gate,'UTF8')),'hex') then return jsonb_build_object('allowed',false,'code','SERVICE_UNAVAILABLE');end if;
 -- One locked policy row serializes all workers' count/check/increment and leases.
 select * into c from private.mcp_public_control where singleton for update;
 if not found or c.enabled is not true or c.gate_hash is distinct from encode(sha256(convert_to(p_gate,'UTF8')),'hex') then return jsonb_build_object('allowed',false,'code','SERVICE_UNAVAILABLE');end if;
 stamp:=floor(extract(epoch from clock_timestamp()))::bigint;
 delete from private.mcp_public_leases where expires_at<=clock_timestamp();
 delete from private.mcp_public_counters where window_start<stamp-172800;
 if p_kind='geocode' and not exists(select 1 from private.mcp_public_leases where id=p_lease and risk=p_risk and expires_at>clock_timestamp()) then return jsonb_build_object('allowed',false,'code','SERVICE_UNAVAILABLE');end if;
 if p_kind='request' and ((select count(*) from private.mcp_public_leases where risk=p_risk)>=c.concurrent_ip or (select count(*) from private.mcp_public_leases)>=c.concurrent_global) then return jsonb_build_object('allowed',false,'code','RATE_LIMITED','retry_after',30);end if;
 starts:=array[(stamp/60)*60,(stamp/60)*60,(stamp/86400)*86400,(stamp/86400)*86400];
 scopes:=array[p_risk,'global',p_risk,'global'];
 caps:=case when p_kind='request' then array[c.request_ip_minute,c.request_global_minute,c.request_ip_day,c.request_global_day] else array[c.geocode_ip_minute,c.geocode_global_minute,c.geocode_ip_day,c.geocode_global_day] end;
 for n in 1..4 loop
  select used into used_count from private.mcp_public_counters where kind=p_kind and scope=scopes[n] and period=periods[n] and window_start=starts[n];
  if coalesce(used_count,0)>=caps[n] then return jsonb_build_object('allowed',false,'code','RATE_LIMITED','retry_after',starts[n]+periods[n]-stamp);end if;
 end loop;
 for n in 1..4 loop
  insert into private.mcp_public_counters(kind,scope,period,window_start,used) values(p_kind,scopes[n],periods[n],starts[n],1)
  on conflict(kind,scope,period,window_start) do update set used=private.mcp_public_counters.used+1;
 end loop;
 if p_kind='request' then insert into private.mcp_public_leases(risk,expires_at) values(p_risk,clock_timestamp()+interval '30 seconds') returning id into lease_id;end if;
 return jsonb_build_object('allowed',true,'lease',lease_id);
end $$;
create function private.mcp_public_release(p_gate text,p_risk text,p_lease uuid)
returns void language plpgsql security definer set search_path='' set statement_timeout='2s' set lock_timeout='1s' as $$
begin
 if p_gate is null or length(p_gate)<32 or length(p_gate)>128 then return;end if;
 if exists(select 1 from private.mcp_public_control where singleton and gate_hash=encode(sha256(convert_to(p_gate,'UTF8')),'hex')) then
  delete from private.mcp_public_leases where id=p_lease and risk=p_risk;
 end if;
end $$;
revoke all on function private.mcp_public_acquire(text,text,text,uuid),private.mcp_public_release(text,text,uuid) from public,anon,authenticated;
-- Public wrappers are SECURITY INVOKER; definer code stays in the private schema.
grant usage on schema private to anon;
grant execute on function private.mcp_public_acquire(text,text,text,uuid),private.mcp_public_release(text,text,uuid) to anon;
-- Keep the capability in a credential header, never an RPC/body query argument.
create function public.mcp_public_acquire(p_risk text,p_kind text,p_lease uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select private.mcp_public_acquire(nullif(current_setting('request.headers',true),'')::jsonb->>'x-roadtag-control-key',p_risk,p_kind,p_lease)$$;
create function public.mcp_public_release(p_risk text,p_lease uuid)
returns void language sql security invoker set search_path='' as $$select private.mcp_public_release(nullif(current_setting('request.headers',true),'')::jsonb->>'x-roadtag-control-key',p_risk,p_lease)$$;
revoke all on function public.mcp_public_acquire(text,text,uuid),public.mcp_public_release(text,uuid) from public,anon,authenticated;
grant execute on function public.mcp_public_acquire(text,text,uuid),public.mcp_public_release(text,uuid) to anon;
