import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadEnv } from "vite";

const root = process.cwd();
const dist = resolve(root, "dist");
const pages = ["how-to", "about", "privacy", "terms"];
const productionUrl = "https://roadtag.org";
const configuredUrl = process.env.VITE_PUBLIC_SITE_URL
  || loadEnv("production", root, "VITE_PUBLIC_SITE_URL").VITE_PUBLIC_SITE_URL
  || productionUrl;
const publicUrl = new URL(configuredUrl).origin.replace(/\/$/, "");
const previewBuild = process.env.VERCEL_ENV === "preview";

if (!publicUrl.startsWith("https://")) {
  throw new Error("VITE_PUBLIC_SITE_URL must use HTTPS.");
}
if (new URL(publicUrl).host.endsWith(".vercel.app") && publicUrl !== productionUrl) {
  throw new Error("VITE_PUBLIC_SITE_URL must be the production host, never a Preview hostname.");
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

const manifest = JSON.parse(await readFile(join(dist, '.vite', 'manifest.json'), 'utf8'));
const consentEntry = manifest['src/consent-entry.tsx'];
if (!consentEntry) throw new Error('Cookie entry missing from Vite manifest.');
for (const page of pages) {
  let html = await readFile(join(root, "seo-pages", `${page}.html`), "utf8");
  html = html.replace('/src/consent-entry.tsx', '/' + consentEntry.file);
  html = html.replace('</head>', (consentEntry.css || []).map(file => `<link rel="stylesheet" href="/${file}" />`).join('\n') + '\n</head>');
  const target = join(dist, page, "index.html");
  await mkdir(join(dist, page), { recursive: true });
  await writeFile(target, html, "utf8");
}

for (const path of [join(dist, "robots.txt"), join(dist, "sitemap.xml"), ...(await htmlFiles(dist))]) {
  let contents = await readFile(path, "utf8");
  contents = contents.replaceAll("__PUBLIC_SITE_URL__", publicUrl);
  if (previewBuild && path.endsWith(".html") && !/<meta\s+name=["']robots["']/i.test(contents)) {
    contents = contents.replace(/<\/head>/i, '  <meta name="robots" content="noindex, nofollow, noarchive" />\n  </head>');
  }
  await writeFile(path, contents, "utf8");
}

console.log(`SEO assets generated for ${previewBuild ? "Preview (noindex)" : "Production"} using ${publicUrl}.`);
