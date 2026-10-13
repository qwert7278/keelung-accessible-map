import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const approved='https://keelung-accessible-approved-fixture.vercel.app';
for(const target of ['https://keelung-accessible-attacker.vercel.app/api/mcp-public','https://roadtag.org/api/mcp-public',approved+'/wrong-api']){
 const ran=spawnSync(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),'scripts/mcp-public-hosted.ts'],{encoding:'utf8',env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,MCP_HOSTED_TEST_AUTHORIZED:'true',MCP_HOSTED_APPROVED_PREVIEW_ORIGIN:approved,MCP_HOSTED_PREVIEW_URL:target,MCP_HOSTED_REPORT_ID:'00000000-0000-4000-8000-000000000001',MCP_HOSTED_EXPECTED_SHA:'a'.repeat(40),VERCEL_AUTOMATION_BYPASS_SECRET:'fixture-protection-secret-do-not-log'},timeout:10000});
 assert.equal(ran.status,1);assert(!ran.stderr.includes('fixture-protection-secret-do-not-log'));assert(!ran.stderr.includes(target));assert.equal(JSON.parse(ran.stderr.trim()).status,'FAIL');
}
console.log('PASS hosted harness rejects unapproved host/Production/path without exposing credentials. No hosted request made.');
