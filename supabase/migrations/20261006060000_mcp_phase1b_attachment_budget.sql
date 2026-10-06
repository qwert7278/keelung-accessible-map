-- Phase 1B download budget: staging-only forward migration.
create table private.mcp_attachment_downloads (
 principal text primary key references private.mcp_principals,
 window_start timestamptz not null default now(), attempts integer not null default 0
);
alter table private.mcp_attachment_downloads enable row level security;
revoke all on private.mcp_attachment_downloads from public,anon,authenticated,service_role;
create function public.mcp_attachment_download_budget(p text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 perform private.mcp_actor(p);
 insert into private.mcp_attachment_downloads as b(principal,window_start,attempts) values(p,now(),1)
 on conflict(principal) do update set window_start=case when b.window_start<now()-interval '1 hour' then now() else b.window_start end,
 attempts=case when b.window_start<now()-interval '1 hour' then 1 else b.attempts+1 end returning attempts into n;
 if n>10 then raise exception 'RATE_LIMITED';end if;
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function public.mcp_attachment_download_budget(text) from public,anon,authenticated;
grant execute on function public.mcp_attachment_download_budget(text) to service_role;
