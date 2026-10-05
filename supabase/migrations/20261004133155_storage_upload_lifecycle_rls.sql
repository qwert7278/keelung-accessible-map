-- Storage authorizes INSERT before final object metadata is persisted.
-- Bucket limits enforce request MIME/size. RLS authorizes only a reserved path;
-- claim_photo checks finalized metadata before any report can reference it.
create or replace function private.photo_allowed(object_name text,object_owner text,metadata jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and object_owner=auth.uid()::text
 and (object_name like '%.webp' or object_name like '%.jpg')
 and exists(select 1 from private.photo_intents i
  where i.path=object_name and i.owner_id=auth.uid()
  and i.state='active' and i.expires_at>clock_timestamp());
$$;
revoke all on function private.photo_allowed(text,text,jsonb) from public,anon;
grant execute on function private.photo_allowed(text,text,jsonb) to authenticated;

create or replace function private.claim_photo(photo_path text) returns void
language plpgsql security definer set search_path='' as $$
declare intent private.photo_intents;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into intent from private.photo_intents where path=photo_path for update;
 if not found or intent.owner_id<>auth.uid() or intent.state<>'active' or intent.expires_at<=clock_timestamp() then
  raise exception 'Invalid or expired photo reservation';
 end if;
 -- Final metadata exists after Storage HTTP upload has finished. Matching the
 -- reserved path's extension prevents a JPEG being attached as WebP or vice versa.
 if not exists(select 1 from storage.objects o
  where o.bucket_id='report-photos' and o.name=intent.path and o.owner_id=auth.uid()::text
  and ((o.name like '%.webp' and o.metadata->>'mimetype'='image/webp')
   or (o.name like '%.jpg' and o.metadata->>'mimetype'='image/jpeg'))
  and case when coalesce(o.metadata->>'size','') ~ '^[0-9]+$'
   then (o.metadata->>'size')::numeric between 1 and 1048576 else false end) then
  raise exception '照片上傳尚未完成，請重新選擇照片後再試。';
 end if;
 update private.photo_intents set state='committed' where path=photo_path;
end $$;
revoke all on function private.claim_photo(text) from public,anon;
grant execute on function private.claim_photo(text) to authenticated;

-- Preserve the existing bucket and policies, including no UPDATE/DELETE grants.
update storage.buckets set file_size_limit=1048576,
 allowed_mime_types=array['image/webp','image/jpeg'] where id='report-photos';
