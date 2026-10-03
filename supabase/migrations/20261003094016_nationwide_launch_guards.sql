-- NLSC https://data.gov.tw/dataset/7441, 2025-03-18, Government Open Data License v1.0.
-- Simplified 0.0001 degrees; validation tolerance 0.0002 degrees. Existing evidence remains unchanged.
insert into public.cities(id,name,enabled,south,north,west,east,districts) values
('TW-TPE','臺北市',true,24.960300194000077,25.210340659000046,121.45694976500005,121.66612477400002,array['松山區','信義區','大安區','中山區','中正區','大同區','萬華區','文山區','南港區','內湖區','士林區','北投區']),
('TW-TXG','臺中市',true,23.998361168000038,24.441688526000057,120.45635962700004,121.45221245300007,array['中區','東區','南區','西區','北區','西屯區','南屯區','北屯區','豐原區','東勢區','大甲區','清水區','沙鹿區','梧棲區','后里區','神岡區','潭子區','大雅區','新社區','石岡區','外埔區','大安區','烏日區','大肚區','龍井區','霧峰區','太平區','大里區','和平區']),
('TW-KEE','基隆市',true,25.052269833000032,25.633570341000045,121.62659914900001,122.10933980300007,array['中正區','七堵區','暖暖區','仁愛區','中山區','安樂區','信義區']),
('TW-TNN','臺南市',true,22.887301808000025,23.41393053600006,120.026712422,120.65644979500001,array['新營區','鹽水區','白河區','柳營區','後壁區','東山區','麻豆區','下營區','六甲區','官田區','大內區','佳里區','學甲區','西港區','七股區','將軍區','北門區','新化區','善化區','新市區','安定區','山上區','玉井區','楠西區','南化區','左鎮區','仁德區','歸仁區','關廟區','龍崎區','永康區','東區','南區','北區','安南區','安平區','中西區']),
('TW-KHH','高雄市',true,10.371147663000052,23.471913349000026,114.35908983900009,121.04923079700012,array['鹽埕區','鼓山區','左營區','楠梓區','三民區','新興區','前金區','苓雅區','前鎮區','旗津區','小港區','鳳山區','林園區','大寮區','大樹區','大社區','仁武區','鳥松區','岡山區','橋頭區','燕巢區','田寮區','阿蓮區','路竹區','湖內區','茄萣區','永安區','彌陀區','梓官區','旗山區','美濃區','六龜區','甲仙區','杉林區','內門區','茂林區','桃源區','那瑪夏區']),
('TW-NWT','新北市',true,24.67302348600004,25.30050289800004,121.28248963800007,122.00770273400002,array['板橋區','三重區','中和區','永和區','新莊區','新店區','樹林區','鶯歌區','三峽區','淡水區','汐止區','瑞芳區','土城區','蘆洲區','五股區','泰山區','林口區','深坑區','石碇區','坪林區','三芝區','石門區','八里區','平溪區','雙溪區','貢寮區','金山區','萬里區','烏來區']),
('TW-ILA','宜蘭縣',true,24.309222574000053,25.92932753300004,121.3174652940001,124.5613539250001,array['宜蘭市','羅東鎮','蘇澳鎮','頭城鎮','礁溪鄉','壯圍鄉','員山鄉','冬山鄉','五結鄉','三星鄉','大同鄉','南澳鄉']),
('TW-TAO','桃園市',true,24.586311226000028,25.12381306100007,120.9818330330001,121.48019616100004,array['桃園區','中壢區','大溪區','楊梅區','蘆竹區','大園區','龜山區','八德區','龍潭區','平鎮區','新屋區','觀音區','復興區']),
('TW-CYI','嘉義市',true,23.439355106000058,23.518627506000023,120.38895790700002,120.5095758710001,array['東區','西區']),
('TW-HSQ','新竹縣',true,24.427175261000066,24.94657913400004,120.92502900000005,121.41252376000006,array['竹北市','竹東鎮','新埔鎮','關西鎮','湖口鄉','新豐鄉','芎林鄉','橫山鄉','北埔鄉','寶山鄉','峨眉鄉','尖石鄉','五峰鄉']),
('TW-MIA','苗栗縣',true,24.288325580000055,24.74127140800004,120.62166076500006,121.26283884200012,array['苗栗市','苑裡鎮','通霄鎮','竹南鎮','頭份市','後龍鎮','卓蘭鎮','大湖鄉','公館鄉','銅鑼鄉','南庄鄉','頭屋鄉','三義鄉','西湖鄉','造橋鄉','三灣鄉','獅潭鄉','泰安鄉']),
('TW-NAN','南投縣',true,23.43521024700005,24.246073619000065,120.61535711700009,121.3498872610001,array['南投市','埔里鎮','草屯鎮','竹山鎮','集集鎮','名間鄉','鹿谷鄉','中寮鄉','魚池鄉','國姓鄉','水里鄉','信義鄉','仁愛鄉']),
('TW-CHA','彰化縣',true,23.785410761000044,24.207383317000044,120.22016234000006,120.6841080960001,array['彰化市','鹿港鎮','和美鎮','線西鄉','伸港鄉','福興鄉','秀水鄉','花壇鄉','芬園鄉','員林市','溪湖鎮','田中鎮','大村鄉','埔鹽鄉','埔心鄉','永靖鄉','社頭鄉','二水鄉','北斗鎮','二林鎮','田尾鄉','埤頭鄉','芳苑鄉','大城鄉','竹塘鄉','溪州鄉']),
('TW-HSZ','新竹市',true,24.712394060000072,24.855011090000055,120.87433684700005,121.03374342600006,array['東區','北區','香山區']),
('TW-YUN','雲林縣',true,23.43550466400007,23.866419431000047,119.99670416000009,120.73635854900004,array['斗六市','斗南鎮','虎尾鎮','西螺鎮','土庫鎮','北港鎮','古坑鄉','大埤鄉','莿桐鄉','林內鄉','二崙鄉','崙背鄉','麥寮鄉','東勢鄉','褒忠鄉','臺西鄉','元長鄉','四湖鄉','口湖鄉','水林鄉']),
('TW-CYQ','嘉義縣',true,23.214582912000033,23.636096494000064,120.11786895800009,120.95769558300009,array['太保市','朴子市','布袋鎮','大林鎮','民雄鄉','溪口鄉','新港鄉','六腳鄉','東石鄉','義竹鄉','鹿草鄉','水上鄉','中埔鄉','竹崎鄉','梅山鄉','番路鄉','大埔鄉','阿里山鄉']),
('TW-PIF','屏東縣',true,21.75594891600003,22.885340379000063,120.35298643200002,120.90433337400003,array['屏東市','潮州鎮','東港鎮','恆春鎮','萬丹鄉','長治鄉','麟洛鄉','九如鄉','里港鄉','鹽埔鄉','高樹鄉','萬巒鄉','內埔鄉','竹田鄉','新埤鄉','枋寮鄉','新園鄉','崁頂鄉','林邊鄉','南州鄉','佳冬鄉','琉球鄉','車城鄉','滿州鄉','枋山鄉','三地門鄉','霧臺鄉','瑪家鄉','泰武鄉','來義鄉','春日鄉','獅子鄉','牡丹鄉']),
('TW-HUA','花蓮縣',true,23.09761804800008,24.370748851000023,120.98636502300002,121.77426513000006,array['花蓮市','鳳林鎮','玉里鎮','新城鄉','吉安鄉','壽豐鄉','光復鄉','豐濱鄉','瑞穗鄉','富里鄉','秀林鄉','萬榮鄉','卓溪鄉']),
('TW-TTT','臺東縣',true,21.942326678000036,23.44400857400006,120.73884541600006,121.61659709100007,array['臺東市','成功鎮','關山鎮','卑南鄉','鹿野鄉','池上鄉','東河鄉','長濱鄉','太麻里鄉','大武鄉','綠島鄉','海端鄉','延平鄉','金峰鄉','達仁鄉','蘭嶼鄉']),
('TW-KIN','金門縣',true,24.16005544400003,24.999814154000028,118.1377798370001,119.47941345300006,array['金城鎮','金沙鎮','金湖鎮','金寧鄉','烈嶼鄉','烏坵鄉']),
('TW-PEN','澎湖縣',true,23.186392319000056,23.810892086000074,119.31410906500008,119.72718610200008,array['馬公市','湖西鄉','白沙鄉','西嶼鄉','望安鄉','七美鄉']),
('TW-LIE','連江縣',true,25.94080260500005,26.38547526200005,119.90870508100005,120.51191868600012,array['南竿鄉','北竿鄉','莒光鄉','東引鄉'])
on conflict(id) do update set name=excluded.name,enabled=true,south=excluded.south,north=excluded.north,west=excluded.west,east=excluded.east,districts=excluded.districts;
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
create or replace view public.report_feed with (security_invoker=true) as select id,schema_version,city_id,district,title,address,description,category,lat,lng,status,wheelchair_access,created_at,updated_at,before_image_path,after_image_path,official_source,title||' '||address||' '||description as search_text from public.reports;
