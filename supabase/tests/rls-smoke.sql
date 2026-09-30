-- Transaction-only integration tests. Synthetic fixtures never persist.
begin;
insert into private.admin_users(user_id) values ('00000000-0000-4000-8000-000000000002');
insert into storage.objects(bucket_id,name,owner_id) values
 ('report-photos','10000000-0000-4000-8000-000000000001/before/test.jpg','00000000-0000-4000-8000-000000000001'),
 ('report-photos','10000000-0000-4000-8000-000000000001/after/test.jpg','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',true);
insert into public.reports(id,city_id,district,title,category,lat,lng,wheelchair_access,before_image_path)
values ('10000000-0000-4000-8000-000000000001','TW-KEE','仁愛區','RLS test only','ramp',25.13,121.74,'blocked','10000000-0000-4000-8000-000000000001/before/test.jpg');
do $$ begin
 if public.is_admin() then raise exception 'TEST FAILED: anonymous is admin'; end if;
 update public.reports set status='in_progress',admin_note='unauthorized' where id='10000000-0000-4000-8000-000000000001';
 if found then raise exception 'TEST FAILED: anonymous changed status'; end if;
 begin
  update public.reports set title='overwrite' where id='10000000-0000-4000-8000-000000000001';
  raise exception 'TEST FAILED: immutable column update allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into private.admin_users(user_id) values ('00000000-0000-4000-8000-000000000001');
  raise exception 'TEST FAILED: self elevation allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects(bucket_id,name,owner_id) values ('report-photos','10000000-0000-4000-8000-000000000001/after/hack.jpg','00000000-0000-4000-8000-000000000001');
  raise exception 'TEST FAILED: non-admin after photo allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects(bucket_id,name,owner_id) values ('report-photos','10000000-0000-4000-8000-000000000001/updates/hack.jpg','00000000-0000-4000-8000-000000000002');
  raise exception 'TEST FAILED: another user photo namespace allowed';
 exception when insufficient_privilege then null; end;
end $$;
insert into public.report_updates(report_id,message,suggested_status) values ('10000000-0000-4000-8000-000000000001','問題仍存在','resolved');
do $$ begin
 if (select status from public.reports where id='10000000-0000-4000-8000-000000000001') <> 'open' then raise exception 'TEST FAILED: suggestion changed status'; end if;
 begin
  insert into public.report_updates(report_id,message,type) values ('10000000-0000-4000-8000-000000000001','forged admin','admin');
  raise exception 'TEST FAILED: admin history forgery';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
update public.reports set status='in_progress',admin_note='開始處理' where id='10000000-0000-4000-8000-000000000001';
do $$ begin
 if not public.is_admin() then raise exception 'TEST FAILED: admin role not effective'; end if;
 if (select count(*) from public.report_updates where report_id='10000000-0000-4000-8000-000000000001' and type='admin') <> 1 then raise exception 'TEST FAILED: missing atomic audit'; end if;
 begin
  update public.reports set status='resolved',admin_note='missing evidence' where id='10000000-0000-4000-8000-000000000001';
  raise exception 'TEST FAILED: resolved without after photo';
 exception when check_violation then null; end;
end $$;
update public.reports set status='resolved',wheelchair_access='passable',admin_note='改善完成',after_image_path='10000000-0000-4000-8000-000000000001/after/test.jpg'
where id='10000000-0000-4000-8000-000000000001';
do $$ begin
 if (select count(*) from public.report_updates where report_id='10000000-0000-4000-8000-000000000001' and type='admin') <> 2 then raise exception 'TEST FAILED: second audit'; end if;
 if (select status from public.reports where id='10000000-0000-4000-8000-000000000001') <> 'resolved' then raise exception 'TEST FAILED: admin resolution'; end if;
 begin
  delete from public.report_updates where report_id='10000000-0000-4000-8000-000000000001';
  raise exception 'TEST FAILED: history deletion';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 if not exists(select 1 from public.reports where id='10000000-0000-4000-8000-000000000001') then raise exception 'TEST FAILED: public read'; end if;
end $$;
select 'PASS: public read, anonymous create, admin status lifecycle, atomic history, and negative RLS cases' as result;
rollback;
