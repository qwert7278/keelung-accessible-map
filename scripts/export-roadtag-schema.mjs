import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';

const base = new URL(process.env.VITE_PUBLIC_SITE_URL || loadEnv('production', process.cwd(), 'VITE_PUBLIC_SITE_URL').VITE_PUBLIC_SITE_URL || 'https://roadtag.org').origin;
const files = { '/': 'index.html', '/map': 'map.html', '/how-to': 'seo-pages/how-to.html', '/about': 'seo-pages/about.html', '/privacy': 'seo-pages/privacy.html', '/terms': 'seo-pages/terms.html' };
const pages = {};
for (const [route, file] of Object.entries(files)) {
  const html = (await readFile(file, 'utf8')).replaceAll('__PUBLIC_SITE_URL__', base);
  pages[base + route] = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  if (!pages[base + route].length) throw new Error(`Missing schema: ${route}`);
}
await mkdir('docs/seo', { recursive: true });
await writeFile('docs/seo/roadtag-structured-data.json', JSON.stringify(pages, null, 2) + '\n');
console.log('Exported the six routes with their actual JSON-LD.');
