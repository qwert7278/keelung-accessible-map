-- App-owned upload reservations. No public SELECT or client DELETE rights.
create table private.district_regions(city_id text not null references public.cities(id),district text not null,bounds double precision[] not null,polygons jsonb not null,primary key(city_id,district));
alter table private.district_regions enable row level security;
revoke all on private.district_regions from public,anon,authenticated;
create table private.photo_intents(
 operation_id uuid primary key,report_id uuid not null,owner_id uuid not null,kind text not null check(kind in ('before','updates','after')),
 path text unique not null,created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default clock_timestamp()+interval '24 hours',
 state text not null default 'active' check(state in ('active','committed','deleting'))
);
create index photo_intents_owner_created on private.photo_intents(owner_id,created_at desc);
create index photo_intents_created on private.photo_intents(created_at);
alter table private.photo_intents enable row level security;
revoke all on private.photo_intents from public,anon,authenticated;

create function private.region_contains(region jsonb,x double precision,y double precision) returns boolean
language plpgsql immutable set search_path='' as $$
declare polygon jsonb; ring jsonb; a jsonb; b jsonb; i integer; j integer; inside boolean; in_polygon boolean;
 ax double precision; ay double precision; bx double precision; by_ double precision; dx double precision; dy double precision; t double precision;
begin
 for polygon in select value from jsonb_array_elements(region) loop
  in_polygon:=false;
  for ring in select value from jsonb_array_elements(polygon) loop
   inside:=false;j:=jsonb_array_length(ring)-1;
   for i in 0..jsonb_array_length(ring)-1 loop
    a:=ring->j;b:=ring->i;ax:=(a->>0)::double precision;ay:=(a->>1)::double precision;bx:=(b->>0)::double precision;by_:=(b->>1)::double precision;
    dx:=bx-ax;dy:=by_-ay;
    t:=greatest(0,least(1,((x-ax)*dx+(y-ay)*dy)/case when dx*dx+dy*dy=0 then 1 else dx*dx+dy*dy end));
    if (x-ax-t*dx)^2+(y-ay-t*dy)^2<=0.0002^2 then return true;end if;
    if (ay>y)<>(by_>y) then if x<(bx-ax)*(y-ay)/(by_-ay)+ax then inside:=not inside;end if;end if;
    j:=i;
   end loop;
   if inside then in_polygon:=not in_polygon;end if;
  end loop;
  if in_polygon then return true;end if;
 end loop;
 return false;
end $$;
revoke all on function private.region_contains(jsonb,double precision,double precision) from public,anon,authenticated;
create function private.valid_district(city text,district_name text,lat double precision,lng double precision) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.district_regions r where r.city_id=city and r.district=district_name
 and lng between r.bounds[1]-0.0002 and r.bounds[3]+0.0002 and lat between r.bounds[2]-0.0002 and r.bounds[4]+0.0002
 and private.region_contains(r.polygons,lng,lat));
$$;
revoke all on function private.valid_district(text,text,double precision,double precision) from public,anon;
grant execute on function private.valid_district(text,text,double precision,double precision) to authenticated;

create function private.reserve_photo(report uuid,kind_name text,operation uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing private.photo_intents; new_path text; stamp timestamptz:=clock_timestamp();
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if kind_name not in ('before','updates','after') or report is null or operation is null then raise exception 'Invalid upload request';end if;
 if kind_name='before' and report<>operation then raise exception 'Original upload must use its report ID';end if;
 if kind_name<>'before' and not exists(select 1 from public.reports where id=report) then raise exception 'Report not found';end if;
 if kind_name='after' and not private.is_admin() then raise exception 'Admin required';end if;
 -- Serialize quota decisions across accounts, not only within one browser.
 perform pg_advisory_xact_lock(742001);
 select * into existing from private.photo_intents where operation_id=operation for update;
 if found then
  if existing.owner_id<>auth.uid() or existing.report_id<>report or existing.kind<>kind_name then raise exception 'Upload belongs to another operation';end if;
  if existing.state='deleting' or (existing.state='active' and existing.expires_at<=stamp) then raise exception 'Upload reservation expired; start a new report';end if;
  return jsonb_build_object('path',existing.path,'uploaded',exists(select 1 from storage.objects where bucket_id='report-photos' and name=existing.path and owner_id=auth.uid()::text));
 end if;
 if (select count(*) from private.photo_intents where owner_id=auth.uid() and created_at>stamp-interval '1 hour')>=10 then raise exception '照片上傳過於頻繁，請稍後再試';end if;
 if (select count(*) from private.photo_intents where created_at>=date_trunc('day',stamp))>=2000 then raise exception '今日照片上傳額度已達上限，請稍後再試';end if;
 if (select count(*) from private.photo_intents where owner_id=auth.uid() and state='active' and expires_at>stamp)>=4 then raise exception '尚有未完成的照片上傳，請完成後再試';end if;
 new_path:=report::text||'/'||kind_name||'/'||operation::text||'.webp';
 insert into private.photo_intents(operation_id,report_id,owner_id,kind,path) values(operation,report,auth.uid(),kind_name,new_path);
 return jsonb_build_object('path',new_path,'uploaded',false);
end $$;
revoke all on function private.reserve_photo(uuid,text,uuid) from public,anon;
grant execute on function private.reserve_photo(uuid,text,uuid) to authenticated;
create function public.reserve_photo(report uuid,kind_name text,operation uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.reserve_photo(report,kind_name,operation); $$;
revoke all on function public.reserve_photo(uuid,text,uuid) from public,anon;
grant execute on function public.reserve_photo(uuid,text,uuid) to authenticated;

create function private.photo_allowed(object_name text,object_owner text,metadata jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and object_owner=auth.uid()::text
 and object_name like '%.webp' and coalesce(metadata->>'mimetype','')='image/webp'
 and case when coalesce(metadata->>'size','') ~ '^[0-9]+$' then (metadata->>'size')::numeric between 1 and 1048576 else false end
 and exists(select 1 from private.photo_intents i where i.path=object_name and i.owner_id=auth.uid() and i.state='active' and i.expires_at>clock_timestamp());
$$;
revoke all on function private.photo_allowed(text,text,jsonb) from public,anon;
grant execute on function private.photo_allowed(text,text,jsonb) to authenticated;
drop policy photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated with check(bucket_id='report-photos' and private.photo_allowed(name,owner_id,metadata));
update storage.buckets set file_size_limit=1048576,allowed_mime_types=array['image/webp'] where id='report-photos';

create function private.claim_photo(photo_path text) returns void
language plpgsql security definer set search_path='' as $$
declare intent private.photo_intents;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into intent from private.photo_intents where path=photo_path for update;
 if not found or intent.owner_id<>auth.uid() or intent.state<>'active' or intent.expires_at<=clock_timestamp() then raise exception 'Invalid or expired photo reservation';end if;
 update private.photo_intents set state='committed' where path=photo_path;
end $$;
revoke all on function private.claim_photo(text) from public,anon;
grant execute on function private.claim_photo(text) to authenticated;

-- Reuse the existing trigger's validations. Additional trigger runs afterwards.
create function private.validate_launch_report() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if not private.valid_district(NEW.city_id,NEW.district,NEW.lat,NEW.lng) then raise exception '所選位置與行政區不一致，請重新確認';end if;
  perform private.claim_photo(NEW.before_image_path);
 elsif NEW.after_image_path is distinct from OLD.after_image_path and NEW.after_image_path is not null then
  perform private.claim_photo(NEW.after_image_path);
 end if;
 return NEW;
end $$;
revoke all on function private.validate_launch_report() from public,anon,authenticated;
create trigger zz_validate_launch_report before insert or update on public.reports for each row execute function private.validate_launch_report();
create function private.validate_launch_update() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if NEW.type='community' and NEW.image_path is not null then perform private.claim_photo(NEW.image_path);end if;
 return NEW;
end $$;
revoke all on function private.validate_launch_update() from public,anon,authenticated;
create trigger zz_validate_launch_update before insert on public.report_updates for each row execute function private.validate_launch_update();

create function private.owned_report(report uuid) returns uuid
language sql stable security definer set search_path='' as $$ select id from public.reports where id=report and created_by=auth.uid(); $$;
revoke all on function private.owned_report(uuid) from public,anon;
grant execute on function private.owned_report(uuid) to authenticated;
create function public.owned_report(report uuid) returns uuid language sql stable security invoker set search_path='' as $$ select private.owned_report(report); $$;
revoke all on function public.owned_report(uuid) from public,anon;
grant execute on function public.owned_report(uuid) to authenticated;

-- Cleanup workers use the Storage API; never delete storage.objects by SQL.
create function private.expired_photos() returns text[]
language plpgsql security definer set search_path='' as $$
declare paths text[];
begin
 select array_agg(path) into paths from (select i.path from private.photo_intents i where i.state in ('active','deleting') and i.expires_at<clock_timestamp()
 and not exists(select 1 from public.reports r where r.before_image_path=i.path or r.after_image_path=i.path)
 and not exists(select 1 from public.report_updates u where u.image_path=i.path)
 order by i.expires_at limit 20 for update skip locked) q;
 update private.photo_intents set state='deleting' where path=any(paths);
 return coalesce(paths,array[]::text[]);
end $$;
revoke all on function private.expired_photos() from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.expired_photos() to service_role;
create function public.expired_photos() returns text[] language sql security invoker set search_path='' as $$ select private.expired_photos(); $$;
revoke all on function public.expired_photos() from public,anon,authenticated;
grant execute on function public.expired_photos() to service_role;
create function private.finish_photo_cleanup(paths text[]) returns void language sql security definer set search_path='' as $$
 delete from private.photo_intents where state='deleting' and path=any(paths);
$$;
revoke all on function private.finish_photo_cleanup(text[]) from public,anon,authenticated;
grant execute on function private.finish_photo_cleanup(text[]) to service_role;
create function public.finish_photo_cleanup(paths text[]) returns void language sql security invoker set search_path='' as $$ select private.finish_photo_cleanup(paths); $$;
revoke all on function public.finish_photo_cleanup(text[]) from public,anon,authenticated;
grant execute on function public.finish_photo_cleanup(text[]) to service_role;

create index reports_city_district_created on public.reports(city_id,district,created_at desc,id desc);
create index reports_city_status_created on public.reports(city_id,status,created_at desc,id desc);
create index reports_after_photo on public.reports(after_image_path) where after_image_path is not null;
create index report_updates_photo on public.report_updates(image_path) where image_path is not null;
