import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
it('keeps MCP social metadata consistent with the read-only guide',()=>{
 const html=readFileSync(resolve('mcp/index.html'),'utf8');
 const description='教你將 Road Tag 公開唯讀 MCP 連接至 AI 助理，查詢道路通行障礙與公開案件。';
 for(const key of ['description','og:description','twitter:description']){
  const tag=html.match(new RegExp('<meta (?:name|property)="'+key+'" content="([^"]*)"'))?.[1];
  expect(tag).toBe(description);
 }
 expect(html).toContain('href="__PUBLIC_SITE_URL__/mcp"');
 expect(html.match(/<title>([^<]+)<\/title>/)?.[1]).toContain('MCP 接入教學');
 expect(html).toContain('"url":"__PUBLIC_SITE_URL__/mcp"');
 expect(readFileSync(resolve('public/sitemap.xml'),'utf8')).toContain('__PUBLIC_SITE_URL__/mcp</loc>');
});

it('keeps homepage and guide wired to the same gated location capability',()=>{
 for(const path of ['index.html','mcp/index.html']){
  const html=readFileSync(resolve(path),'utf8');
  expect(html.match(/id="public-mcp-capabilities"/g)).toHaveLength(1);
  expect(html).toMatch(/id="public-mcp-capabilities">[^<]*尚未開放/);
  expect(html.match(/id="public-mcp-location-note"/g)).toHaveLength(1);
  expect(html).toMatch(/id="public-mcp-location-note"[^>]*hidden/);
  expect(html).toContain('https://www.geoapify.com/');
  expect(html).toContain('https://www.openstreetmap.org/copyright');
 }
 const home=readFileSync(resolve('index.html'),'utf8');
 expect(home).not.toContain('id="copy-mcp-url"');
 for(const id of ['chatgpt','codex','claude','gemini','manus'])expect(home).toContain('href="/mcp#'+id+'"');
});
