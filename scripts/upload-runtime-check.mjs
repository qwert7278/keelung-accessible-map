import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve('output');mkdirSync(root,{recursive:true});
const directory=mkdtempSync(join(root,'upload-runtime-'));
try {
 execFileSync(process.execPath,[resolve('node_modules/typescript/bin/tsc'),'api/prepare-photo.ts','api/photo-cleanup.ts','--ignoreConfig','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--types','node','--outDir',directory],{stdio:'inherit'});
 writeFileSync(join(directory,'package.json'),JSON.stringify({type:'module'}));
 const {POST}=await import(pathToFileURL(join(directory,'api/prepare-photo.js')).href);
 const {GET}=await import(pathToFileURL(join(directory,'api/photo-cleanup.js')).href);
 assert.equal((await POST(new Request('https://roadtag.org/api/prepare-photo',{method:'POST'}))).status,401);
 delete process.env.CRON_SECRET;
 assert.equal((await GET(new Request('https://roadtag.org/api/photo-cleanup'))).status,401);
 console.log('Emitted Node.js upload and scheduled cleanup endpoints load and reject unauthorized access.');
}finally {
 assert(directory.startsWith(root+'\\')||directory.startsWith(root+'/'));
 rmSync(directory,{recursive:true,force:true});
}
