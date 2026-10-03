const aliases: Record<string, string> = {
  KEE:'TW-KEE', TPE:'TW-TPE', NWT:'TW-NWT', TAO:'TW-TAO', TXG:'TW-TXG', TNN:'TW-TNN', KHH:'TW-KHH',
  HSZ:'TW-HSZ', HSQ:'TW-HSQ', MIA:'TW-MIA', CHA:'TW-CHA', NAN:'TW-NAN', YUN:'TW-YUN', CYI:'TW-CYI',
  CYQ:'TW-CYQ', PIF:'TW-PIF', ILA:'TW-ILA', HUA:'TW-HUA', TTT:'TW-TTT', PEN:'TW-PEN', KIN:'TW-KIN', LIE:'TW-LIE',
};
const names: Record<string, string> = {
  keelung:'TW-KEE', taipei:'TW-TPE', newtaipei:'TW-NWT', taoyuan:'TW-TAO', taichung:'TW-TXG', tainan:'TW-TNN', kaohsiung:'TW-KHH',
  miaoli:'TW-MIA', changhua:'TW-CHA', nantou:'TW-NAN', yunlin:'TW-YUN', pingtung:'TW-PIF', yilan:'TW-ILA', hualien:'TW-HUA', taitung:'TW-TTT', penghu:'TW-PEN', kinmen:'TW-KIN', lienchiang:'TW-LIE',
  基隆:'TW-KEE', 臺北:'TW-TPE', 新北:'TW-NWT', 桃園:'TW-TAO', 臺中:'TW-TXG', 臺南:'TW-TNN', 高雄:'TW-KHH',
};
export function cityFromHeaders(headers: Headers): string | null {
  if (headers.get('x-vercel-ip-country') !== 'TW') return null;
  const region = headers.get('x-vercel-ip-country-region')?.toUpperCase().replace(/^TW-/, '');
  if (region && aliases[region]) return aliases[region];
  // Ambiguous county/city names (Hsinchu, Chiayi) require a region code.
  let name: string;
  try { name = decodeURIComponent(headers.get('x-vercel-ip-city') || '').toLowerCase().replace(/台/g,'臺').replace(/\s|-/g,'').replace(/city$|county$|市$|縣$/g,''); } catch { return null; }
  return names[name] || null;
}
