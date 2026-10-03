"""Offline conversion of NLSC government open data; needs pyshp and shapely."""
import json
from pathlib import Path
import shapefile
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

root = Path(__file__).resolve().parent.parent
divisions = json.loads((root / 'src/data/taiwan-districts.json').read_text(encoding='utf-8'))
ids = {'C':'TW-KEE','A':'TW-TPE','F':'TW-NWT','H':'TW-TAO','B':'TW-TXG','D':'TW-TNN','E':'TW-KHH','O':'TW-HSZ','J':'TW-HSQ','K':'TW-MIA','N':'TW-CHA','M':'TW-NAN','P':'TW-YUN','I':'TW-CYI','Q':'TW-CYQ','T':'TW-PIF','G':'TW-ILA','U':'TW-HUA','V':'TW-TTT','X':'TW-PEN','W':'TW-KIN','Z':'TW-LIE'}
names = {c['name']: ids[c['code']] for c in divisions['counties']}
expected = {(names[c['name']], d['name']) for c in divisions['counties'] for d in c['districts']}
geometries = {}
for file in (root/'output/district-shp').glob('*.shp'):
    for item in shapefile.Reader(str(file), encoding='utf-8').iterShapeRecords():
        r = item.record.as_dict()
        key = (names[r['COUNTYNAME']], r['TOWNNAME'])
        geometries.setdefault(key, []).append(shape(item.shape.__geo_interface__))
assert set(geometries) == expected
regions = []
city_bounds = {}
def rounded(v):
    return [rounded(x) for x in v] if isinstance(v, (list, tuple)) else round(v, 6)
for (city, district), parts in sorted(geometries.items()):
    geometry = unary_union(parts).simplify(0.0001, preserve_topology=True)
    if geometry.geom_type == 'Polygon':
        from shapely.geometry import MultiPolygon
        geometry = MultiPolygon([geometry])
    assert geometry.is_valid and geometry.geom_type == 'MultiPolygon'
    box = list(geometry.bounds)
    point = geometry.representative_point()
    regions.append({'cityId':city,'district':district,'bounds':rounded(box),'point':[round(point.y,6),round(point.x,6)],'polygons':rounded(mapping(geometry)['coordinates'])})
    prev = city_bounds.get(city, box)
    city_bounds[city] = [min(prev[0],box[0]),min(prev[1],box[1]),max(prev[2],box[2]),max(prev[3],box[3])]
data = {'source':'https://data.gov.tw/dataset/7441','resourceDate':'2025-03-18','retrieved':'2026-10-03','license':'Government Open Data License v1.0','simplificationDegrees':0.0001,'regions':regions}
(root/'src/data/district-boundaries.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
(root/'src/data/city-bounds.json').write_text(json.dumps(city_bounds,separators=(',',':'))+'\n',encoding='utf-8')
(root/'src/data/district-boundaries').mkdir(exist_ok=True)
for city in city_bounds:
    (root/'src/data/district-boundaries'/f'{city}.json').write_text(json.dumps([r for r in regions if r['cityId']==city],ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print('Prepared 368 validated district polygons, including offshore islands.', (root/'src/data/district-boundaries.json').stat().st_size)
