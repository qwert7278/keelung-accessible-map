-- Forward-only: extend retry identity without exposing author/internal columns.
alter table public.report_updates add column operation_id uuid unique;
alter table public.reports add column last_operation_id uuid;
grant insert(operation_id) on public.report_updates to authenticated;
grant update(last_operation_id) on public.reports to authenticated;
create function private.owned_update(report uuid,operation uuid) returns uuid
language sql stable security definer set search_path='' as $$
 select id from public.report_updates where report_id=report and operation_id=operation and created_by=auth.uid();
$$;
revoke all on function private.owned_update(uuid,uuid) from public,anon;
grant execute on function private.owned_update(uuid,uuid) to authenticated;
create function public.owned_update(report uuid,operation uuid) returns uuid
language sql stable security invoker set search_path='' as $$select private.owned_update(report,operation);$$;
revoke all on function public.owned_update(uuid,uuid) from public,anon;
grant execute on function public.owned_update(uuid,uuid) to authenticated;

create or replace function private.audit_report_update() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Admin required';end if;
 insert into private.admin_audit(report_id,actor_id,note,old_status,new_status,old_access,new_access)
 values(NEW.id,auth.uid(),NEW.admin_note,OLD.status,NEW.status,OLD.wheelchair_access,NEW.wheelchair_access);
 insert into public.report_updates(report_id,type,message,image_path,suggested_status,created_by,operation_id)
 values(NEW.id,'admin','管理者已更新案件狀態與通行資訊。',case when NEW.after_image_path is distinct from OLD.after_image_path then NEW.after_image_path else null end,NEW.status,auth.uid(),NEW.last_operation_id);
 return NEW;
end $$;
create function public.moderate_report(report uuid,expected_updated_at timestamptz,operation uuid,new_status text,new_access text,note text,photo_path text default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;affected integer;
begin
 if not private.is_admin() then raise exception 'Admin required';end if;
 if operation is null then raise exception 'Operation required';end if;
 result:=private.owned_update(report,operation);
 if result is not null then return result;end if;
 update public.reports set status=new_status,wheelchair_access=new_access,admin_note=note,
 after_image_path=coalesce(photo_path,after_image_path),last_operation_id=operation
 where id=report and updated_at=expected_updated_at;
 get diagnostics affected=row_count;
 if affected=0 then raise exception '案件已被其他管理者更新，請重新開啟後再試。';end if;
 return private.owned_update(report,operation);
end $$;
revoke all on function public.moderate_report(uuid,timestamptz,uuid,text,text,text,text) from public,anon;
grant execute on function public.moderate_report(uuid,timestamptz,uuid,text,text,text,text) to authenticated;
create index admin_audit_report_id on private.admin_audit(report_id);

-- Only a server-verified gate can allocate new reservations. No caller-supplied IP.
revoke execute on function public.reserve_photo(uuid,text,uuid),private.reserve_photo(uuid,text,uuid) from authenticated;
create table private.upload_risk_limits(risk_hash text primary key,window_start timestamptz not null,uses integer not null);
alter table private.upload_risk_limits enable row level security;
revoke all on private.upload_risk_limits from public,anon,authenticated;
create function private.reserve_photo_verified(actor uuid,anonymous boolean,report uuid,kind_name text,operation uuid,risk_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous_claims text;result jsonb;affected integer;
begin
 if actor is null or risk_hash is null or risk_hash !~ '^[0-9a-f]{64}$' then raise exception 'Verified request required';end if;
 previous_claims:=current_setting('request.jwt.claims',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'is_anonymous',anonymous)::text,true);
 -- ponytail: 30/hour/network bucket may affect shared NAT; add Turnstile if real abuse warrants it.
 perform pg_advisory_xact_lock(742001);
 if not exists(select 1 from private.photo_intents where operation_id=operation) then
  delete from private.upload_risk_limits where window_start<clock_timestamp()-interval '2 days';
  insert into private.upload_risk_limits as limits values(risk_hash,clock_timestamp(),1)
  on conflict on constraint upload_risk_limits_pkey do update set
  uses=case when limits.window_start<clock_timestamp()-interval '1 hour' then 1 else limits.uses+1 end,
  window_start=case when limits.window_start<clock_timestamp()-interval '1 hour' then clock_timestamp() else limits.window_start end
  where limits.uses<30 or limits.window_start<clock_timestamp()-interval '1 hour';
  get diagnostics affected=row_count;
  if affected=0 then raise exception '此網路的照片請求過於頻繁，請稍後再試。';end if;
 end if;
 result:=private.reserve_photo(report,kind_name,operation);
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 return result;
end $$;
revoke all on function private.reserve_photo_verified(uuid,boolean,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function private.reserve_photo_verified(uuid,boolean,uuid,text,uuid,text) to service_role;
create function public.reserve_photo_verified(actor uuid,anonymous boolean,report uuid,kind_name text,operation uuid,risk_hash text) returns jsonb
language sql security invoker set search_path='' as $$select private.reserve_photo_verified(actor,anonymous,report,kind_name,operation,risk_hash);$$;
revoke all on function public.reserve_photo_verified(uuid,boolean,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_photo_verified(uuid,boolean,uuid,text,uuid,text) to service_role;

-- Reuse the existing service-only worker entry point, including retention on quiet days.
create or replace function private.expired_photos() returns text[]
language plpgsql security definer set search_path='' as $$
declare paths text[];
begin
 delete from private.upload_risk_limits where window_start<clock_timestamp()-interval '2 days';
 select array_agg(path) into paths from (select i.path from private.photo_intents i where i.state in ('active','deleting') and i.expires_at<clock_timestamp()
 and not exists(select 1 from public.reports r where r.before_image_path=i.path or r.after_image_path=i.path)
 and not exists(select 1 from public.report_updates u where u.image_path=i.path)
 order by i.expires_at limit 20 for update skip locked) q;
 update private.photo_intents set state='deleting' where path=any(paths);
 return coalesce(paths,array[]::text[]);
end $$;
