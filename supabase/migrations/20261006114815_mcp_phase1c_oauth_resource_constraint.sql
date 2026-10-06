-- Forward-only B1: preserve existing Preview rows and admit only the exact Production resource.
-- Apply to staging after local review. Production application needs separate authorization.
alter table private.mcp_oauth_clients drop constraint mcp_oauth_clients_resource_check;
alter table private.mcp_oauth_clients add constraint mcp_oauth_clients_resource_check
 check (resource = 'https://roadtag.org/api/mcp-chatgpt'
 or resource ~ '^https://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app/api/mcp-chatgpt$');
