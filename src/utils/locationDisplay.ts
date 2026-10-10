/** Display only; coordinates and provider data remain unchanged. */
export function displayLocationAddress(address:string,city:string,district:string) {
  const areas=[city.replace(/台/g,'臺'),district];
  const details:string[]=[];
  for(let part of address.split(/[,，]/).map(value=>value.trim()).filter(Boolean)) {
    if(/^(台灣|臺灣|Taiwan)$/i.test(part)) continue;
    part=part.replace(/台/g,'臺');
    for(const area of areas) if(area) part=part.replaceAll(area,'').trim();
    if(!part) continue;
    part=part.replace(/^(\d+(?:之\d+)?(?:號)?)\s+(.+(?:路|街|巷|弄))$/,(_,house:string,road:string)=>road+house.replace(/號$/,'')+'號');
    if(!details.includes(part)) details.push(part);
  }
  return areas.join('')+details.map(part=>/^\d{3,6}(?:-\d+)?$/.test(part)?' '+part:part).join('');
}
