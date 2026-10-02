// Official household-registration district names. Refresh manually, never at runtime.
import { mkdir, writeFile } from 'node:fs/promises';
const base = 'https://api.nlsc.gov.tw/other/';
const xml = async (path) => {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
};
const field = (item, name) => item.match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1];
const counties = [...(await xml('ListCounty')).matchAll(/<countyItem>([\s\S]*?)<\/countyItem>/g)];
const data = [];
for (const [, item] of counties) {
  const code = field(item, 'countycode');
  const towns = [...(await xml(`ListTown1/${code}`)).matchAll(/<townItem>([\s\S]*?)<\/townItem>/g)];
  if (!towns.length) throw new Error(`Missing districts: ${code}`);
  data.push({ code, name: field(item, 'countyname'), code01: field(item, 'countycode01'), districts: towns.map(([, town]) => ({ code: field(town, 'towncode'), name: field(town, 'townname') })) });
}
if (data.length !== 22 || data.reduce((n, c) => n + c.districts.length, 0) !== 368) throw new Error('Unexpected administrative division count; review upstream changes.');
await mkdir('src/data', { recursive: true });
await writeFile('src/data/taiwan-districts.json', JSON.stringify({ source: base, retrieved: new Date().toISOString().slice(0, 10), counties: data }, null, 2) + '\n');
console.log('Saved 22 counties/cities and 368 household-registration districts.');
