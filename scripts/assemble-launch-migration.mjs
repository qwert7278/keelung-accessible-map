// Generated city/district data are sourced from NLSC, not production rows.
import { readFile, writeFile } from 'node:fs/promises';
const divisions=JSON.parse(await readFile('src/data/taiwan-districts.json','utf8'));
const boundaries=JSON.parse(await readFile('src/data/district-boundaries.json','utf8'));
const bounds=JSON.parse(await readFile('src/data/city-bounds.json','utf8'));
const ids={C:'TW-KEE',A:'TW-TPE',F:'TW-NWT',H:'TW-TAO',B:'TW-TXG',D:'TW-TNN',E:'TW-KHH',O:'TW-HSZ',J:'TW-HSQ',K:'TW-MIA',N:'TW-CHA',M:'TW-NAN',P:'TW-YUN',I:'TW-CYI',Q:'TW-CYQ',T:'TW-PIF',G:'TW-ILA',U:'TW-HUA',V:'TW-TTT',X:'TW-PEN',W:'TW-KIN',Z:'TW-LIE'};
const quote=v=>`'${String(v).replaceAll("'","''")}'`;
const cities=divisions.counties.map(c=>{const id=ids[c.code],[west,south,east,north]=bounds[id];return `(${quote(id)},${quote(c.name)},true,${south-0.0002},${north+0.0002},${west-0.0002},${east+0.0002},array[${c.districts.map(d=>quote(d.name)).join(',')}])`;});
let sql=`-- NLSC https://data.gov.tw/dataset/7441, 2025-03-18, Government Open Data License v1.0.\n-- Simplified 0.0001 degrees; validation tolerance 0.0002 degrees. Existing evidence remains unchanged.\ninsert into public.cities(id,name,enabled,south,north,west,east,districts) values\n${cities.join(',\n')}\non conflict(id) do update set name=excluded.name,enabled=true,south=excluded.south,north=excluded.north,west=excluded.west,east=excluded.east,districts=excluded.districts;\n`;
sql+=await readFile('supabase/nationwide-guards.sql','utf8');
sql+='\ninsert into private.district_regions(city_id,district,bounds,polygons) values\n'+boundaries.regions.map(r=>`(${quote(r.cityId)},${quote(r.district)},array[${r.bounds.join(',')}],${quote(JSON.stringify(r.polygons))}::jsonb)`).join(',\n')+';\n';
sql+=`create or replace view public.report_feed with (security_invoker=true) as select id,schema_version,city_id,district,title,address,description,category,lat,lng,status,wheelchair_access,created_at,updated_at,before_image_path,after_image_path,official_source,title||' '||address||' '||description as search_text from public.reports;\n`;
// Stage inactive cities and private geography before enabling the guards in one
// final transaction. Keep each migration below the management API payload limit.
const coreStart=sql.indexOf('-- App-owned');
const photoStart=sql.indexOf('create table private.photo_intents');
const regionStart=sql.indexOf('\ninsert into private.district_regions');
const viewStart=sql.indexOf('create or replace view public.report_feed');
const citySql=sql.slice(0,coreStart);
const parts=[{name:'nationwide_region_stage',sql:citySql.replace(/,true,/g,',false,').replace('enabled=true,','')+sql.slice(coreStart,photoStart)}];
const rows=sql.slice(regionStart,viewStart).trim().replace(/^insert into private.district_regions\(city_id,district,bounds,polygons\) values\n/,'').replace(/;\s*$/,'').split(/,\n(?=\()/);
let group='',n=1;
for(const row of rows){
 if(group.length+row.length>450000){parts.push({name:'nationwide_regions_'+n++,sql:'insert into private.district_regions(city_id,district,bounds,polygons) values\n'+group+';\n'});group='';}
 group+=(group?',\n':'')+row;
}
if(group)parts.push({name:'nationwide_regions_'+n,sql:'insert into private.district_regions(city_id,district,bounds,polygons) values\n'+group+';\n'});
parts.push({name:'nationwide_launch_guards',sql:citySql+sql.slice(photoStart,regionStart)+sql.slice(viewStart)});
const versions=['20261003093920','20261003093924','20261003093929','20261003093938','20261003093942','20261003093948','20261003094007','20261003094011','20261003094014','20261003094016'];
if(parts.length!==versions.length)throw new Error('Changed geography requires new migrations, not rewriting applied history.');
for(let i=0;i<parts.length;i++)await writeFile(`supabase/migrations/${versions[i]}_${parts[i].name}.sql`,parts[i].sql);
console.log('Generated',parts.length,'migrations for',cities.length,'cities and',boundaries.regions.length,'districts.');
