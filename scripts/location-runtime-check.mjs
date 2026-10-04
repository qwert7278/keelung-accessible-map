import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// Exercise emitted JavaScript, not Vite's source resolver, to catch ESM deployment failures.
const directory = mkdtempSync(join(tmpdir(), 'roadtag-location-'));
try {
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), 'api/location.ts', 'api/location/search.ts', 'api/location/reverse.ts', 'api/location/capabilities.ts', '--ignoreConfig', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--types', 'node', '--skipLibCheck', '--outDir', directory], { stdio:'inherit' });
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ type:'module' }));
  const { GET } = await import(pathToFileURL(join(directory, 'api/location.js')).href);
  assert.equal(GET(new Request('https://roadtag.org/api/location')).status, 403);
  const cookie = 'roadtag-consent=' + encodeURIComponent(JSON.stringify({ version:1, preferences:true, expires:Date.now()+60000 }));
  const response = GET(new Request('https://roadtag.org/api/location', { headers:{ cookie, 'x-vercel-ip-country':'TW', 'x-vercel-ip-country-region':'TPE' } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { cityId:'TW-TPE', source:'ip-city' });
  assert.match(response.headers.get('cache-control'), /no-store/);
  const { GET:capabilities }=await import(pathToFileURL(join(directory,'api/location/capabilities.js')).href);
  assert.deepEqual(await capabilities().json(),{searchReady:false,reverseReady:false});
  const { GET:search } = await import(pathToFileURL(join(directory, 'api/location/search.js')).href);
  const { GET:reverse } = await import(pathToFileURL(join(directory, 'api/location/reverse.js')).href);
  assert.equal((await search(new Request('https://roadtag.org/api/location/search?q=x'))).status,400);
  assert.equal((await reverse(new Request('https://roadtag.org/api/location/reverse?lat=NaN&lng=121'))).status,400);
  process.env.TGOS_LOCATION_ENABLED='false';
  const unavailable=await search(new Request('https://roadtag.org/api/location/search?q=海洋大學'));
  assert.equal(unavailable.status,503);
  assert.deepEqual(await unavailable.json(),{error:'LOCATION_TEMPORARILY_UNAVAILABLE'});
  assert.equal((await reverse(new Request('https://roadtag.org/api/location/reverse?lat=25&lng=121'))).status,503);
  console.log('Emitted Node.js search/reverse endpoints verified: validation and safe unavailable provider response.');
  console.log('Emitted Node.js city endpoint verified: consent gate, city response, and cache policy.');
} finally {
  rmSync(directory, { recursive:true, force:true });
}
