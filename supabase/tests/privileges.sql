-- Privilege matrix and public projection negative tests; no fixtures persist.
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","user_metadata":{"role":"admin","admin":true}}',true);
do $$
declare command text;
begin
 if public.is_admin() then raise exception 'TEST FAILED metadata elevation'; end if;
 foreach command in array array[
  'select created_by from public.reports',
  'select admin_note from public.reports',
  'select created_by from public.report_updates',
  'select * from private.admin_users',
  'select * from private.admin_audit',
  'delete from public.reports',
  'delete from public.report_updates',
  'delete from public.cities',
  'truncate public.reports cascade',
  'truncate public.report_updates',
  'truncate public.cities cascade',
  'update public.reports set created_by=auth.uid()',
  'update public.reports set official_source=true',
  'update public.reports set created_at=now()',
  'update public.report_updates set message=''forged''',
  'insert into public.reports(created_by) values(auth.uid())',
  'insert into public.reports(status) values(''resolved'')',
  'insert into public.reports(admin_note) values(''forged'')',
  'insert into public.report_updates(type) values(''admin'')'
 ] loop
  begin execute command; raise exception 'TEST FAILED allowed: %',command;
  exception when insufficient_privilege then null; end;
 end loop;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('report_feed','report_update_feed') and column_name in ('created_by','admin_note')) then raise exception 'TEST FAILED unsafe projection'; end if;
 perform * from public.report_feed;
 perform private.consume_rate_limit('report');
 begin
  perform private.consume_rate_limit('report');
  raise exception 'TEST FAILED cooldown bypass';
 exception when raise_exception then
  if SQLERRM not like '%操作太頻繁%' then raise; end if;
 end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
declare command text;
begin
 perform * from public.report_feed;
 perform * from public.report_update_feed;
 foreach command in array array[
 'select created_by from public.reports','select admin_note from public.reports',
 'select created_by from public.report_updates','insert into public.reports(title) values(''no session'')',
 'update public.reports set status=''resolved''','delete from public.reports','truncate public.reports cascade',
 'insert into public.report_updates(message) values(''no session'')'
 ] loop
  begin execute command; raise exception 'TEST FAILED anon allowed: %',command;
  exception when insufficient_privilege then null; end;
 end loop;
end $$;
select 'PASS: hidden columns, delete/truncate, spoofing, metadata elevation, safe views, server cooldown' as result;
rollback;
