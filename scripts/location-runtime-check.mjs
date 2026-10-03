import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// Exercise emitted JavaScript, not Vite's source resolver, to catch ESM deployment failures.
const directory = mkdtempSync(join(tmpdir(), 'roadtag-location-'));
try {
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), 'api/location.ts', '--ignoreConfig', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--skipLibCheck', '--outDir', directory], { stdio:'inherit' });
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ type:'module' }));
  const { GET } = await import(pathToFileURL(join(directory, 'api/location.js')).href);
  assert.equal(GET(new Request('https://roadtag.org/api/location')).status, 403);
  const cookie = 'roadtag-consent=' + encodeURIComponent(JSON.stringify({ version:1, preferences:true, expires:Date.now()+60000 }));
  const response = GET(new Request('https://roadtag.org/api/location', { headers:{ cookie, 'x-vercel-ip-country':'TW', 'x-vercel-ip-country-region':'TPE' } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { cityId:'TW-TPE', source:'ip-city' });
  assert.match(response.headers.get('cache-control'), /no-store/);
  console.log('Emitted Node.js city endpoint verified: consent gate, city response, and cache policy.');
} finally {
  rmSync(directory, { recursive:true, force:true });
}
