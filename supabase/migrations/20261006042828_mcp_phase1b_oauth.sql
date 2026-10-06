-- Staging-only OAuth bridge. No changes to alpha sessions or Phase 1A operations.
create table private.mcp_oauth_clients (
 client_id uuid primary key,
 resource text not null check (resource ~ '^https://[^/]+\.vercel\.app/api/mcp-chatgpt$'),
 enabled boolean not null default false
);
alter table private.mcp_oauth_clients enable row level security;
revoke all on private.mcp_oauth_clients from public,anon,authenticated,service_role;

create function public.mcp_oauth_actor(p text,a uuid,c uuid,r text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare who private.mcp_principals;
begin
 select * into who from private.mcp_principals where principal=p and actor=a and enabled;
 if not found or not exists(select 1 from private.mcp_oauth_clients where client_id=c and enabled and resource=r) or exists(select 1 from private.admin_users where user_id=a) then raise exception 'FORBIDDEN';end if;
 return jsonb_build_object('actor',who.actor,'can_write',who.can_write);
end $$;
revoke all on function public.mcp_oauth_actor(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.mcp_oauth_actor(text,uuid,uuid,text) to service_role;

-- The Auth service, never user_metadata, binds a signed resource to approved clients.
-- Keep aud=authenticated so the same incoming JWT can satisfy Storage RLS.
create function public.mcp_oauth_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare claims jsonb; target text;
begin
 claims := (event->'claims') - 'resource';
 select c.resource into target from private.mcp_oauth_clients c
 where c.enabled and c.client_id::text=claims->>'client_id' and claims->>'is_anonymous'='false'
 and exists(select 1 from private.mcp_principals p where p.enabled and p.actor::text=claims->>'sub')
 and not exists(select 1 from private.admin_users a where a.user_id::text=claims->>'sub');
 if target is not null then claims:=jsonb_set(claims,'{resource}',to_jsonb(target));end if;
 return jsonb_set(event,'{claims}',claims);
end $$;
revoke all on function public.mcp_oauth_access_token_hook(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.mcp_oauth_access_token_hook(jsonb) to supabase_auth_admin;
