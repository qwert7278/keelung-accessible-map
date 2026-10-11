/** Display only; coordinates and provider data remain unchanged. */
export function displayLocationAddress(address:string,city:string,district:string, includePostcode = true) {
  const areas=[city.replace(/^台/,'臺'),district];
  const roads:string[]=[],names:string[]=[],postcodes:string[]=[];
  const postal=/^\d{3}(?:\d{2,3}|-\d{2,3})?$/;
  for(let part of address.split(/[,，]/).map(value=>value.trim()).filter(Boolean)) {
    if(/^(台灣|臺灣|台湾|Taiwan(?:,? Republic of China)?|Republic of China)$/i.test(part)) continue;
    // Postal prefixes must be separated from the address, not a road/house number.
    const prefix=part.match(/^(\d{3}(?:\d{2,3}|-\d{2,3})?)\s+(?=[^\s]+[市縣])/);
    if(prefix) {postcodes.push(prefix[1]);part=part.slice(prefix[0].length);}
    const local=part.replace(/^台(?=.+[市縣])/,'臺');
    if(areas.includes(local)) continue;
    const cityPostal=areas[0] && local.startsWith(areas[0]) ? local.slice(areas[0].length).trim() : '';
    if(cityPostal && postal.test(cityPostal)) {postcodes.push(cityPostal);continue;}
    // Strip a full leading administrative prefix; never replace names inside a POI.
    if(areas[0] && local.startsWith(areas[0]) && (!areas[1] || local.slice(areas[0].length).trimStart().startsWith(areas[1]))) {
      part=local.slice(areas[0].length).trimStart();
      if(areas[1]) part=part.slice(areas[1].length).trimStart();
    }
    if(!part) continue;
    if(postal.test(part)) {postcodes.push(part);continue;}
    part=part.replace(/^(\d+(?:[-之]\d+)?(?:號(?:之\d+)?)?)\s+(.+(?:路|街|巷|弄))$/,(_,house:string,road:string)=>road+(/號/.test(house)?house:house+'號'));
    // Keep English street names readable; do not invent a Chinese translation.
    const englishRoad=/\b(?:road|rd\.?|street|st\.?|avenue|ave\.?|lane|ln\.?|alley)\b/i.test(part);
    const target=/(?:路|街|大道)(?:[一二三四五六七八九十百\d]+段)?(?:\d|[一二三四五六七八九十百]+[巷弄號]|$)|(?:巷|弄)\d/.test(part)||englishRoad?roads:names;
    if(!target.includes(part)) target.push(part);
  }
  const street=roads.join('');
  const landmark=names.join(' · ');
  const postcode=[...new Set(postcodes)].join(' ');
  return areas.join('')+street+(landmark?(street?' · ':'')+landmark:'')+(includePostcode && postcode?' '+postcode:'');
}
