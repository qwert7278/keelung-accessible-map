import assert from 'node:assert/strict';
import {hostedFixtureAuthorized} from './fixtures/mcp-hosted-deadline.js';
const origin='https://keelung-accessible-map-git-code-e64c38-masons-projects-2c78a251.vercel.app';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/roadtag-p2a-02',MCP_PUBLIC_READ_ENABLED:'true',MCP_PUBLIC_READ_ORIGIN:origin,MCP_PUBLIC_CONTROL_SECRET:'isolated-fixture'.repeat(4)};
const request=(key:string=env.MCP_PUBLIC_CONTROL_SECRET,url=origin)=>new Request(url+'/api/mcp-hosted-acceptance',{method:'POST',headers:{'x-roadtag-hosted-test-key':key}});
assert(hostedFixtureAuthorized(request(),env));
for(const change of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},{MCP_PUBLIC_READ_ENABLED:'false'},{MCP_PUBLIC_CONTROL_SECRET:''},{MCP_PUBLIC_READ_ORIGIN:'https://roadtag.org'}])assert(!hostedFixtureAuthorized(request(),{...env,...change}));
assert(!hostedFixtureAuthorized(request('wrong'),env));assert(!hostedFixtureAuthorized(request('',origin),env));assert(!hostedFixtureAuthorized(request(env.MCP_PUBLIC_CONTROL_SECRET,'https://roadtag.org'),env));
console.log('PASS temporary Hosted fixture authorization: exact Preview, branch, flag, constant-time credential and Production denials.');
