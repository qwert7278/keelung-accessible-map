-- Explicit grants override Supabase defaults; RLS remains the write gate.
revoke all on public.cities,public.reports,public.report_updates from public,anon,authenticated;
revoke update(status,wheelchair_access,after_image_path,admin_note) on public.reports from authenticated;
grant select on public.cities to anon,authenticated;
grant select(id,schema_version,city_id,district,title,address,description,category,lat,lng,status,wheelchair_access,created_at,updated_at,before_image_path,after_image_path,official_source) on public.reports to anon,authenticated;
grant insert(id,city_id,district,title,address,description,category,lat,lng,wheelchair_access,before_image_path) on public.reports to authenticated;
grant update(status,wheelchair_access,after_image_path,admin_note) on public.reports to authenticated;
grant select(id,report_id,type,message,image_path,suggested_status,created_at) on public.report_updates to anon,authenticated;
grant insert(report_id,message,image_path,suggested_status) on public.report_updates to authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon,authenticated;

create view public.report_feed with (security_invoker=true) as
 select id,schema_version,city_id,district,title,address,description,category,lat,lng,status,wheelchair_access,created_at,updated_at,before_image_path,after_image_path,official_source from public.reports;
create view public.report_update_feed with (security_invoker=true) as
 select id,report_id,type,message,image_path,suggested_status,created_at from public.report_updates;
revoke all on public.report_feed,public.report_update_feed from public,anon,authenticated;
grant select on public.report_feed,public.report_update_feed to anon,authenticated;
-- Never transmit whole-row WAL payloads containing internal columns.
alter publication supabase_realtime drop table public.reports;

create table private.rate_limits(user_id uuid not null,action text not null,last_at timestamptz not null,primary key(user_id,action));
create table private.admin_audit(
 id uuid primary key default gen_random_uuid(),report_id uuid not null references public.reports(id),
 actor_id uuid not null,note text not null,old_status text not null,new_status text not null,
 old_access text not null,new_access text not null,created_at timestamptz not null default now()
);
alter table private.rate_limits enable row level security;
alter table private.admin_audit enable row level security;
revoke all on private.rate_limits,private.admin_audit from public,anon,authenticated;

-- Narrow private definer helper: touches only the caller's own cooldown.
create function private.consume_rate_limit(action_name text) returns void
language plpgsql security definer set search_path='' as $$
declare cooldown interval; stamp timestamptz:=clock_timestamp(); affected integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if action_name='report' then cooldown:=interval '30 seconds';
 elsif action_name='update' then cooldown:=interval '10 seconds';
 else raise exception 'Unknown rate-limit action'; end if;
 insert into private.rate_limits(user_id,action,last_at) values(auth.uid(),action_name,stamp)
 on conflict(user_id,action) do update set last_at=excluded.last_at
 where private.rate_limits.last_at<=stamp-cooldown;
 get diagnostics affected=row_count;
 if affected=0 then raise exception '操作太頻繁，請稍候再試'; end if;
end $$;
revoke all on function private.consume_rate_limit(text) from public,anon;
grant execute on function private.consume_rate_limit(text) to authenticated;

create or replace function private.validate_report() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if TG_OP='INSERT' then
  perform private.consume_rate_limit('report');
  if not exists(select 1 from public.cities c where c.id=NEW.city_id and c.enabled and NEW.lat between c.south and c.north and NEW.lng between c.west and c.east and NEW.district=any(c.districts)) then raise exception '位置或行政區不在服務範圍'; end if;
  if NEW.before_image_path not like NEW.id::text||'/before/%' then raise exception 'Invalid original photo path'; end if;
  if not exists(select 1 from storage.objects where bucket_id='report-photos' and name=NEW.before_image_path and owner_id=auth.uid()::text) then raise exception 'Original photo must belong to current user'; end if;
  NEW.created_by:=auth.uid(); NEW.created_at:=now(); NEW.updated_at:=now();
 else
  if not private.is_admin() then raise exception 'Admin required'; end if;
  if length(btrim(NEW.admin_note))=0 then raise exception '管理註記必填'; end if;
  if NEW.after_image_path is distinct from OLD.after_image_path and NEW.after_image_path is not null then
   if NEW.after_image_path not like NEW.id::text||'/after/%' then raise exception 'Invalid after photo path'; end if;
   if not exists(select 1 from storage.objects where bucket_id='report-photos' and name=NEW.after_image_path and owner_id=auth.uid()::text) then raise exception 'After photo must belong to current admin'; end if;
  end if;
  NEW.updated_at:=clock_timestamp();
 end if;
 return NEW;
end $$;

create or replace function private.validate_update() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 NEW.created_at:=now(); NEW.created_by:=auth.uid();
 if NEW.type='community' then
  perform private.consume_rate_limit('update');
  if NEW.image_path is not null then
   if NEW.image_path not like NEW.report_id::text||'/updates/%' then raise exception 'Invalid update photo path'; end if;
   if not exists(select 1 from storage.objects where bucket_id='report-photos' and name=NEW.image_path and owner_id=auth.uid()::text) then raise exception 'Photo must belong to current user'; end if;
  end if;
 end if;
 return NEW;
end $$;

-- Only the trigger can call this function; it cannot authorize report changes.
-- The originating UPDATE has already passed grants and the admin RLS policy.
create or replace function private.audit_report_update() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Admin required'; end if;
 insert into private.admin_audit(report_id,actor_id,note,old_status,new_status,old_access,new_access)
 values(NEW.id,auth.uid(),NEW.admin_note,OLD.status,NEW.status,OLD.wheelchair_access,NEW.wheelchair_access);
 insert into public.report_updates(report_id,type,message,image_path,suggested_status,created_by)
 values(NEW.id,'admin','管理者已更新案件狀態與通行資訊。',case when NEW.after_image_path is distinct from OLD.after_image_path then NEW.after_image_path else null end,NEW.status,auth.uid());
 return NEW;
end $$;
revoke all on function private.audit_report_update(),private.validate_report(),private.validate_update() from public,anon,authenticated;

drop policy photos_owner_read on storage.objects;
drop policy photos_insert on storage.objects;
create policy photos_owner_read on storage.objects for select to authenticated using(bucket_id='report-photos' and owner_id=(select auth.uid())::text);
-- Opaque photo paths do not reveal an author's auth UID.
create policy photos_insert on storage.objects for insert to authenticated with check(
 bucket_id='report-photos' and owner_id=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=2
 and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 and storage.extension(name) in ('jpg','jpeg','png','webp')
 and ((storage.foldername(name))[2]='before'
  or ((storage.foldername(name))[2]='updates' and exists(select 1 from public.reports r where r.id::text=(storage.foldername(name))[1]))
  or ((storage.foldername(name))[2]='after' and (select private.is_admin()) and exists(select 1 from public.reports r where r.id::text=(storage.foldername(name))[1])))
);

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
 and exists(select 1 from private.admin_users a where a.user_id=auth.uid());
$$;
