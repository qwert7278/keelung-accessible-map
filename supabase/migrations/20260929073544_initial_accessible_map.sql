-- Independent Supabase backend. No Firebase credentials or service-role keys in the browser.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table private.admin_users (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
alter table private.admin_users enable row level security;
revoke all on private.admin_users from public, anon, authenticated;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from private.admin_users a where a.user_id = auth.uid());
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
create function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.is_admin(); $$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table public.cities (
  id text primary key, name text not null, enabled boolean not null default false,
  south double precision not null, north double precision not null,
  west double precision not null, east double precision not null,
  districts text[] not null
);
insert into public.cities values ('TW-KEE', '基隆市', true, 25.05, 25.20, 121.62, 121.82,
  array['仁愛區','中正區','信義區','中山區','安樂區','暖暖區','七堵區']);
alter table public.cities enable row level security;
grant select on public.cities to anon, authenticated;
create policy cities_read on public.cities for select to anon, authenticated using (enabled);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  schema_version smallint not null default 1 check (schema_version = 1),
  city_id text not null references public.cities(id),
  district text not null,
  title text not null check (length(btrim(title)) between 1 and 80),
  address text not null default '' check (length(address) <= 200),
  description text not null default '' check (length(description) <= 1000),
  category text not null check (category in ('uneven_surface','level_difference','ramp','arcade','occupied','narrow','construction','other')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  wheelchair_access text not null check (wheelchair_access in ('passable','difficult','blocked')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  before_image_path text not null check (length(before_image_path) < 300),
  after_image_path text check (length(after_image_path) < 300),
  admin_note text not null default '' check (length(admin_note) <= 1000),
  official_source boolean not null default false check (official_source = false),
  check (status <> 'resolved' or after_image_path is not null)
);
create index reports_city_created on public.reports(city_id, created_at desc);
create index reports_creator_created on public.reports(created_by, created_at desc);
alter table public.reports enable row level security;
grant select on public.reports to anon, authenticated;
grant insert on public.reports to authenticated;
grant update(status, wheelchair_access, after_image_path, admin_note) on public.reports to authenticated;
revoke delete on public.reports from anon, authenticated;
create policy reports_read on public.reports for select to anon, authenticated using (true);
create policy reports_create on public.reports for insert to authenticated with check (
  created_by = (select auth.uid()) and status = 'open' and after_image_path is null and admin_note = '' and official_source = false
);
create policy reports_admin_update on public.reports for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create table public.report_updates (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id),
  type text not null default 'community' check (type in ('community','admin')),
  message text not null check (length(btrim(message)) between 1 and 1000),
  image_path text check (length(image_path) < 300),
  suggested_status text check (suggested_status in ('open','in_progress','resolved')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index updates_report_created on public.report_updates(report_id, created_at desc);
create index updates_creator_created on public.report_updates(created_by, created_at desc);
alter table public.report_updates enable row level security;
grant select on public.report_updates to anon, authenticated;
grant insert on public.report_updates to authenticated;
revoke update, delete on public.report_updates from anon, authenticated;
create policy updates_read on public.report_updates for select to anon, authenticated using (true);
create policy updates_insert on public.report_updates for insert to authenticated with check (
  created_by = (select auth.uid()) and (type = 'community' or (type = 'admin' and (select private.is_admin())))
);

create function private.validate_report() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if TG_OP = 'INSERT' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
    if exists(select 1 from public.reports where created_by = auth.uid() and created_at > now() - interval '30 seconds') then
      raise exception '請等待 30 秒再新增下一筆回報';
    end if;
    if not exists(select 1 from public.cities c where c.id = NEW.city_id and c.enabled
      and NEW.lat between c.south and c.north and NEW.lng between c.west and c.east and NEW.district = any(c.districts)) then
      raise exception '位置或行政區不在服務範圍';
    end if;
    if NEW.before_image_path not like auth.uid()::text || '/' || NEW.id::text || '/before/%' then raise exception 'Invalid original photo path'; end if;
    if not exists(select 1 from storage.objects where bucket_id = 'report-photos' and name = NEW.before_image_path) then raise exception 'Original photo must be uploaded first'; end if;
    NEW.created_at := now(); NEW.updated_at := now();
  else
    if not private.is_admin() then raise exception 'Admin required'; end if;
    if length(btrim(NEW.admin_note)) = 0 then raise exception '管理註記必填'; end if;
    if NEW.after_image_path is distinct from OLD.after_image_path and NEW.after_image_path is not null then
      if NEW.after_image_path not like auth.uid()::text || '/' || NEW.id::text || '/after/%' then raise exception 'Invalid after photo path'; end if;
      if not exists(select 1 from storage.objects where bucket_id = 'report-photos' and name = NEW.after_image_path) then raise exception 'After photo must be uploaded first'; end if;
    end if;
    NEW.updated_at := clock_timestamp();
  end if;
  return NEW;
end;
$$;
revoke all on function private.validate_report() from public;
create trigger validate_report before insert or update on public.reports for each row execute function private.validate_report();

create function private.validate_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  NEW.created_at := now();
  if NEW.type = 'community' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 1));
    if exists(select 1 from public.report_updates where created_by = auth.uid() and type = 'community' and created_at > now() - interval '10 seconds') then raise exception '請等待 10 秒再補充'; end if;
    if NEW.image_path is not null then
      if NEW.image_path not like auth.uid()::text || '/' || NEW.report_id::text || '/updates/%' then raise exception 'Invalid update photo path'; end if;
      if not exists(select 1 from storage.objects where bucket_id = 'report-photos' and name = NEW.image_path) then raise exception 'Photo must be uploaded first'; end if;
    end if;
  end if;
  return NEW;
end;
$$;
revoke all on function private.validate_update() from public;
create trigger validate_update before insert on public.report_updates for each row execute function private.validate_update();

-- An admin UPDATE and its audit entry succeed or roll back together.
create function private.audit_report_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.report_updates(report_id,type,message,image_path,suggested_status,created_by)
  values (NEW.id, 'admin', NEW.admin_note,
    case when NEW.after_image_path is distinct from OLD.after_image_path then NEW.after_image_path else null end,
    NEW.status, auth.uid());
  return NEW;
end;
$$;
revoke all on function private.audit_report_update() from public;
create trigger audit_report_update after update on public.reports for each row execute function private.audit_report_update();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('report-photos','report-photos',true,10485760,array['image/jpeg','image/png','image/webp']);
create policy photos_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'report-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name),1) = 3
  and storage.extension(name) in ('jpg','jpeg','png','webp')
  and (
    (storage.foldername(name))[3] = 'before'
    or ((storage.foldername(name))[3] = 'updates' and exists(select 1 from public.reports r where r.id::text = (storage.foldername(name))[2]))
    or ((storage.foldername(name))[3] = 'after' and (select private.is_admin()) and exists(select 1 from public.reports r where r.id::text = (storage.foldername(name))[2]))
  )
);
-- Deliberately no Storage UPDATE or DELETE policy; existing evidence is immutable.
alter publication supabase_realtime add table public.reports;
