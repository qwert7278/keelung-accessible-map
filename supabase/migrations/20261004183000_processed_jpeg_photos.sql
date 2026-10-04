-- Forward-only processed JPEG support; legacy callers remain WebP-only.
create function private.reserve_photo_format(report uuid,kind_name text,operation uuid,format_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing private.photo_intents; new_path text; stamp timestamptz:=clock_timestamp();
begin
 if format_name is null or format_name not in ('webp','jpeg') then raise exception 'Invalid photo format';end if;
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if kind_name is null or kind_name not in ('before','updates','after') or report is null or operation is null then raise exception 'Invalid upload request';end if;
 if kind_name='before' and report<>operation then raise exception 'Original upload must use its report ID';end if;
 if kind_name<>'before' and not exists(select 1 from public.reports where id=report) then raise exception 'Report not found';end if;
 if kind_name='after' and not private.is_admin() then raise exception 'Admin required';end if;
 -- Serialize quota decisions across accounts, not only within one browser.
 perform pg_advisory_xact_lock(742001);
 select * into existing from private.photo_intents where operation_id=operation for update;
 if found then
  if existing.owner_id<>auth.uid() or existing.report_id<>report or existing.kind<>kind_name or existing.path<>(report::text||'/'||kind_name||'/'||operation::text||(case format_name when 'webp' then '.webp' else '.jpg' end)) then raise exception 'Upload belongs to another operation';end if;
  if existing.state='deleting' or (existing.state='active' and existing.expires_at<=stamp) then raise exception 'Upload reservation expired; start a new report';end if;
  return jsonb_build_object('path',existing.path,'uploaded',exists(select 1 from storage.objects where bucket_id='report-photos' and name=existing.path and owner_id=auth.uid()::text));
 end if;
 if (select count(*) from private.photo_intents where owner_id=auth.uid() and created_at>stamp-interval '1 hour')>=10 then raise exception '照片上傳過於頻繁，請稍後再試';end if;
 if (select count(*) from private.photo_intents where created_at>=date_trunc('day',stamp))>=2000 then raise exception '今日照片上傳額度已達上限，請稍後再試';end if;
 if (select count(*) from private.photo_intents where owner_id=auth.uid() and state='active' and expires_at>stamp)>=4 then raise exception '尚有未完成的照片上傳，請完成後再試';end if;
 new_path:=report::text||'/'||kind_name||'/'||operation::text||case format_name when 'webp' then '.webp' else '.jpg' end;
 insert into private.photo_intents(operation_id,report_id,owner_id,kind,path) values(operation,report,auth.uid(),kind_name,new_path);
 return jsonb_build_object('path',new_path,'uploaded',false);
end $$;
revoke all on function private.reserve_photo_format(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function private.reserve_photo_format(uuid,text,uuid,text) to service_role;

create or replace function private.reserve_photo(report uuid,kind_name text,operation uuid) returns jsonb
language sql security definer set search_path='' as $$select private.reserve_photo_format(report,kind_name,operation,'webp');$$;
revoke all on function private.reserve_photo(uuid,text,uuid) from public,anon,authenticated;

create function private.reserve_photo_verified_format(actor uuid,anonymous boolean,report uuid,kind_name text,operation uuid,risk_hash text,format_name text) returns jsonb
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
 result:=private.reserve_photo_format(report,kind_name,operation,format_name);
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 return result;
end $$;
revoke all on function private.reserve_photo_verified_format(uuid,boolean,uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function private.reserve_photo_verified_format(uuid,boolean,uuid,text,uuid,text,text) to service_role;
create function public.reserve_photo_verified_format(actor uuid,anonymous boolean,report uuid,kind_name text,operation uuid,risk_hash text,format_name text) returns jsonb
language sql security invoker set search_path='' as $$select private.reserve_photo_verified_format(actor,anonymous,report,kind_name,operation,risk_hash,format_name);$$;
revoke all on function public.reserve_photo_verified_format(uuid,boolean,uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_photo_verified_format(uuid,boolean,uuid,text,uuid,text,text) to service_role;


create or replace function private.photo_allowed(object_name text,object_owner text,metadata jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and object_owner=auth.uid()::text
 and ((object_name like '%.webp' and coalesce(metadata->>'mimetype','')='image/webp')
 or (object_name like '%.jpg' and coalesce(metadata->>'mimetype','')='image/jpeg'))
 and case when coalesce(metadata->>'size','') ~ '^[0-9]+$' then (metadata->>'size')::numeric between 1 and 1048576 else false end
 and exists(select 1 from private.photo_intents i where i.path=object_name and i.owner_id=auth.uid() and i.state='active' and i.expires_at>clock_timestamp());
$$;
revoke all on function private.photo_allowed(text,text,jsonb) from public,anon;
grant execute on function private.photo_allowed(text,text,jsonb) to authenticated;

update storage.buckets set file_size_limit=1048576,allowed_mime_types=array['image/webp','image/jpeg'] where id='report-photos';
