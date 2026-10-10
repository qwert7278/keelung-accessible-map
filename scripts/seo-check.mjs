import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnv } from "vite";

const dist = resolve(process.cwd(), "dist");
const base = new URL(process.env.VITE_PUBLIC_SITE_URL
  || loadEnv("production", process.cwd(), "VITE_PUBLIC_SITE_URL").VITE_PUBLIC_SITE_URL
  || "https://roadtag.org").origin;
const expectedPaths = ["/", "/map", "/how-to", "/about", "/privacy", "/terms"];
const failures = [];
const read = async (path) => readFile(resolve(dist, path), "utf8");
const check = (condition, message) => { if (!condition) failures.push(message); };
const meta = (html, key, value) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["']`, "i"));
  return !value || match?.[1] === value;
};

const index = await read("index.html");
for (const match of index.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
  const source = match[1];
  if (/^(?:https?:|data:|\/\/)/i.test(source)) continue;
  const assetPath = new URL(source, "https://local.test/").pathname.slice(1);
  try {
    const asset = await readFile(resolve(dist, assetPath));
    check(asset.length > 0, `Homepage image is empty: ${source}.`);
    if (/\.webp$/i.test(assetPath)) {
      check(asset.toString("ascii", 0, 4) === "RIFF" && asset.toString("ascii", 8, 12) === "WEBP", `Homepage image must contain actual WebP data: ${source}.`);
    }
  } catch {
    check(false, `Homepage image is missing from build output: ${source}.`);
  }
}
check(index.includes(`<html lang="zh-Hant-TW">`), "Homepage language must remain zh-Hant-TW.");
check(index.includes("台灣騎樓與人行道通行回報平台"), "Homepage title/topic is missing.");
check(index.includes(`${base}/`), "Homepage canonical and social URLs must use the production host.");
check(meta(index, "og:type", "website"), "Homepage og:type must be website.");
check(/"@type"\s*:\s*"WebSite"/.test(index), "WebSite JSON-LD is missing.");
check((index.match(/<h1\b/g) || []).length === 1, "Homepage must have exactly one H1.");
check(meta(index, "og:site_name", "路見不平 Road Tag"), "Homepage social brand must match the CIS.");
const homepageSchema = JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || "{}");
const homepageEntities = homepageSchema['@graph'] || [homepageSchema];
const websiteSchema = homepageEntities.find(entity => entity['@type'] === 'WebSite') || {};
const organization = homepageEntities.find(entity => entity['@type'] === 'Organization');
check(organization?.name === '社團法人無礙玩家生活關懷協會' && organization?.['@id'] === `${base}/#organization`, 'Homepage needs the association Organization entity.');
check(websiteSchema.publisher?.['@id'] === organization?.['@id'], 'WebSite publisher must reference the association.');
check(websiteSchema.name === "路見不平" && websiteSchema.alternateName === "Road Tag", "WebSite JSON-LD must use the current Chinese and English brand names.");
check(index.includes("home-map-root") && !index.includes("featuredIds"), "Homepage must use the shared report map instead of hard-coded featured records.");
check(index.includes("路見不平，一起標註"), "Homepage must include the approved slogan as readable text.");
check(!/localhost|\.vercel\.app\//i.test(index.replaceAll(base, "")), "Homepage must not contain a preview or localhost URL.");

const faqSchema = [...index.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])).find(e => e['@type'] === 'FAQPage');
const visibleFaq = index.match(/<section[^>]*class="section wrap home-faq"[\s\S]*?<\/section>/)?.[0] || '';
check(faqSchema?.mainEntity?.length === [...visibleFaq.matchAll(/<details\b/g)].length && faqSchema?.mainEntity?.length >= 5, 'Homepage needs the matching visible FAQ schema.');
const chatgptGuide = index.match(/<section[^>]*id="chatgpt"[\s\S]*?<\/section>/)?.[0] || '';
check(chatgptGuide.includes('封閉測試中，暫未對所有人開放'), 'ChatGPT guide must disclose private Closed Alpha access.');
check(chatgptGuide.includes('id="chatgpt-guide"') && chatgptGuide.includes('href="#chatgpt-guide"') && chatgptGuide.includes('href="/map"'), 'ChatGPT guide needs working tutorial and website links.');
check((chatgptGuide.match(/<li>/g) || []).length === 6 && chatgptGuide.includes('示意對話') && chatgptGuide.includes('id="copy-chatgpt-example"'), 'ChatGPT guide needs six invite-only steps and a copyable labelled example.');
check(!/href=["']https?:\/\/(?:chatgpt\.com|chat\.openai\.com)/i.test(chatgptGuide), 'Private connector must not expose an invented launch URL.');
check(faqSchema?.mainEntity?.some(q => q.name === '誰負責建置與維護 Road Tag？'), 'Association FAQ is required.');
for (const q of faqSchema?.mainEntity || []) { check(visibleFaq.includes(q.name) && visibleFaq.includes(q.acceptedAnswer.text), 'FAQ structured data must match visible content.'); }
const mapPage = await read("map.html");
for (const path of ["index.html", "map.html", ...["how-to", "about", "privacy", "terms"].map(p => `${p}/index.html`)]) {
  const html = await read(path);
  const entities = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap(match => { const parsed = JSON.parse(match[1]); return parsed['@graph'] || [parsed]; });
  check(entities.some(entity => ['WebPage', 'AboutPage'].includes(entity['@type'])), `${path} needs its page schema.`);
  check(entities.some(entity => entity['@type'] === 'BreadcrumbList'), `${path} needs breadcrumb schema.`);
  // Validate existing graph relationships against the canonical page; no new schema types.
  const canonicalPath = path === 'index.html' ? '/' : path === 'map.html' ? '/map' : '/' + path.split('/')[0];
  const canonicalUrl = base + canonicalPath;
  const pageEntities = entities.filter(entity => ['WebPage', 'AboutPage'].includes(entity['@type']));
  check(pageEntities.length === 1, path + ' needs exactly one page entity.');
  for (const entity of entities) {
    if (entity['@id']) check(entity['@id'].startsWith(canonicalUrl + '#') || [base + '/#website', base + '/#organization'].includes(entity['@id']), path + ' schema @id conflicts with canonical.');
    if (entity.publisher) check(entity.publisher['@id'] === base + '/#organization', path + ' publisher must reference the association.');
    if (['WebPage', 'AboutPage'].includes(entity['@type'])) {
      check(entity.url === canonicalUrl, path + ' page schema URL must match canonical.');
      check(entity.isPartOf?.['@id'] === base + '/#website', path + ' page schema must reference the shared WebSite.');
      if (entity.breadcrumb) check(entities.some(item => item['@type'] === 'BreadcrumbList' && item['@id'] === entity.breadcrumb['@id']), path + ' breadcrumb reference is unresolved.');
    }
    if (entity['@type'] === 'WebSite') check(entity['@id'] === base + '/#website' && entity.url === base + '/', path + ' WebSite identity must match the production host.');
    if (entity['@type'] === 'BreadcrumbList') {
      check(entity['@id'] === canonicalUrl + '#breadcrumb', path + ' breadcrumb identity must match canonical.');
      const items = entity.itemListElement || [];
      check(items.length > 0 && items.every((item, i) => item['@type'] === 'ListItem' && item.position === i + 1 && item.name && [base + '/', canonicalUrl].includes(item.item)), path + ' breadcrumb items must have ordered public URLs.');
      check(items.at(-1)?.item === canonicalUrl, path + ' final breadcrumb must identify this page.');
    }
  }

  if (path === 'map.html') {
    const mapEntities = entities.filter(entity => entity['@type'] === 'WebPage');
    check(mapEntities.length === 1, 'Map needs exactly one WebPage entity.');
    check(mapEntities[0]?.breadcrumb?.['@id'] === `${base}/map#breadcrumb`, 'Map WebPage must link its breadcrumb entity.');
    const description = html => html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1];
    check(description(mapPage) && description(index) && description(mapPage) !== description(index), 'Map description must differ from the homepage.');
  }
  check(!html.includes('__PUBLIC_SITE_URL__'), `${path} contains an unresolved URL placeholder.`);
}
const mapSchema = JSON.parse(mapPage.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || "{}");
check(mapSchema["@graph"]?.some((entity) => entity["@type"] === "WebSite" && entity["@id"] === `${base}/#website` && entity.name === "路見不平"), "Map must reference the same branded WebSite as the homepage.");
check(mapPage.includes(`<link rel="canonical" href="${base}/map" />`), "Map canonical URL must use /map.");
check(meta(mapPage, "og:url", `${base}/map`), "Map social URL must use /map.");

for (const path of ["how-to", "about", "privacy", "terms"]) {
  const html = await read(`${path}/index.html`);
  check(html.includes(`<html lang="zh-Hant-TW">`), `${path} language is missing.`);
  check(html.includes(`<h1>`), `${path} must have one H1.`);
  check((html.match(/<h1>/g) || []).length === 1, `${path} must have exactly one H1.`);
  check(html.includes(`${base}/${path}`), `${path} canonical/social URLs must use its production route.`);
  check(/<title>[^<]+<\/title>/.test(html), `${path} title is missing.`);
  check(/<meta[^>]+name="description"[^>]+content="[^"]+"/.test(html), `${path} description is missing.`);
  check(!/localhost|\.vercel\.app\//i.test(html.replaceAll(base, "")), `${path} must not contain a preview or localhost URL.`);
  check(!/<a\b[^>]*href=["']\/["'][^>]*>(?:通行地圖|地圖|前往通行地圖|查看基隆通行地圖)<\/a>/i.test(html), `${path} map links must target /map instead of the homepage.`);
}

const robots = await read("robots.txt");
check(robots.includes("User-agent: *\nAllow: /"), "robots.txt must allow public pages.");
check(robots.includes(`Sitemap: ${base}/sitemap.xml`), "robots.txt Sitemap URL must use the canonical host.");
check(!robots.includes("Disallow: /admin"), "robots.txt must not block crawling the admin noindex header.");

const sitemap = await read("sitemap.xml");
check(sitemap.includes("<urlset"), "sitemap.xml must be XML.");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
check(urls.length === expectedPaths.length, "Sitemap must include only the stable public routes.");
for (const path of expectedPaths) check(urls.includes(`${base}${path}`), `Sitemap is missing ${path}.`);
check(!/admin|\?|localhost|vercel\.app/i.test(urls.join("\n").replaceAll(base, "")), "Sitemap contains an admin, query, local or preview URL.");

const vercelConfig = JSON.parse(await readFile(resolve(process.cwd(), "vercel.json"), "utf8"));
const rewrites = new Map(vercelConfig.rewrites.map(({ source, destination }) => [source, destination]));
for (const [source, destination] of [
  ["/map", "/map.html"],
  ["/admin", "/map.html"],
  ["/how-to", "/how-to/index.html"],
  ["/about", "/about/index.html"],
  ["/privacy", "/privacy/index.html"],
  ["/terms", "/terms/index.html"],
]) check(rewrites.get(source) === destination, `Vercel rewrite ${source} -> ${destination} is required.`);
check(!vercelConfig.rewrites.some(({ source }) => source === "/(.*)" || source.includes(".*")), "A catch-all rewrite can make unknown routes soft 404s.");
const adminHeaders = vercelConfig.headers.filter(({ source }) => source === "/admin" || source === "/admin/:path*");
check(adminHeaders.some(({ headers }) => headers.some(({ key, value }) => key.toLowerCase() === "x-robots-tag" && /noindex/i.test(value))), "Admin response must include an X-Robots-Tag noindex header.");

const shareImagePath = resolve(dist, "og-image.png");
for (const path of ["index.html", "map.html", "404.html", ...["how-to", "about", "privacy", "terms"].map((p) => `${p}/index.html`)]) {
  check(!/基隆好行|Road Recall|Road Record/.test(await read(path)), `${path} must not expose the retired brand.`);
}
const shareImage = await readFile(shareImagePath);
const width = shareImage.readUInt32BE(16);
const height = shareImage.readUInt32BE(20);
check(width === 1200 && height === 630, `OG image must be 1200x630 (got ${width}x${height}).`);
check((await stat(resolve(dist, "favicon.svg"))).isFile(), "Favicon must exist in build output.");
check((await stat(resolve(dist, "404.html"))).isFile(), "A static 404 page must exist.");

const preview = process.env.VERCEL_ENV === "preview" || process.argv.includes("--preview");
if (preview) {
  for (const path of ["index.html", "map.html", ...["how-to", "about", "privacy", "terms"].map((p) => `${p}/index.html`)]) {
    const html = await read(path);
    check(/<meta\s+name="robots"\s+content="noindex, nofollow, noarchive"/i.test(html), `${path} must be noindex on Preview.`);
  }
}

if (failures.length) {
  console.error(`SEO check failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`SEO check passed: homepage images, metadata, safe routes, robots, sitemap, ${width}x${height} OG image${preview ? ", and Preview noindex" : ""}.`);
}
