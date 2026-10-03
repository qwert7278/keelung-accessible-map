import divisions from './data/taiwan-districts.json';
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
export const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  "https://roadtag.org"
).replace(/\/+$/, "");
export const BETA_FEEDBACK_EMAIL = "lingwei2046@gmail.com";
// City-center starting views are editorial choices, not a footfall ranking.
// Bounds are broad validation envelopes, not official administrative polygons.
const startingViews: Record<string, [string, string, number, number, number, number, number, number]> = {
 C: ['TW-KEE', '仁愛區', 25.1283, 121.7419, 25.05, 25.2, 121.62, 121.82],
 A: ['TW-TPE', '中山區', 25.0527, 121.5204, 24.95, 25.22, 121.45, 121.68],
 F: ['TW-NWT', '板橋區', 25.012, 121.462, 24.6, 25.31, 121.27, 122.01],
 H: ['TW-TAO', '桃園區', 24.9936, 121.301, 24.32, 25.13, 120.95, 121.5],
 B: ['TW-TXG', '中區', 24.139, 120.681, 24.0, 24.46, 120.47, 121.47],
 D: ['TW-TNN', '中西區', 22.993, 120.203, 22.88, 23.43, 120.0, 120.67],
 E: ['TW-KHH', '新興區', 22.631, 120.302, 22.45, 23.5, 120.15, 121.08],
 O: ['TW-HSZ', '東區', 24.804, 120.972, 24.7, 24.88, 120.87, 121.04],
 J: ['TW-HSQ', '竹北市', 24.838, 121.009, 24.4, 24.97, 120.92, 121.45],
 K: ['TW-MIA', '苗栗市', 24.564, 120.82, 24.25, 24.78, 120.61, 121.28],
 N: ['TW-CHA', '彰化市', 24.075, 120.543, 23.75, 24.21, 120.24, 120.68],
 M: ['TW-NAN', '南投市', 23.909, 120.685, 23.4, 24.3, 120.61, 121.4],
 P: ['TW-YUN', '斗六市', 23.709, 120.543, 23.48, 23.86, 120.0, 120.78],
 I: ['TW-CYI', '西區', 23.479, 120.441, 23.42, 23.53, 120.38, 120.51],
 Q: ['TW-CYQ', '朴子市', 23.465, 120.247, 23.2, 23.67, 120.1, 120.99],
 T: ['TW-PIF', '屏東市', 22.671, 120.488, 21.86, 22.9, 120.3, 121.0],
 G: ['TW-ILA', '宜蘭市', 24.754, 121.752, 24.3, 24.99, 121.32, 121.96],
 U: ['TW-HUA', '花蓮市', 23.977, 121.605, 23.09, 24.4, 120.99, 121.78],
 V: ['TW-TTT', '臺東市', 22.755, 121.15, 21.9, 23.46, 120.73, 121.66],
 X: ['TW-PEN', '馬公市', 23.566, 119.578, 23.15, 23.82, 119.3, 119.76],
 W: ['TW-KIN', '金城鎮', 24.432, 118.317, 24.35, 25.01, 118.1, 119.52],
 Z: ['TW-LIE', '南竿鄉', 26.159, 119.949, 25.9, 26.41, 119.88, 120.52],
};
const order = ['C', 'A', 'F', 'H', 'B', 'D', 'E', 'O', 'J', 'K', 'N', 'M', 'P', 'I', 'Q', 'T', 'G', 'U', 'V', 'X', 'W', 'Z'];
export const CITIES = order.map((code) => {
 const county = divisions.counties.find(c => c.code === code)!;
 const [id, defaultDistrict, lat, lng, south, north, west, east] = startingViews[code];
 const districts = county.districts.map(d => d.name);
 return { id, name: county.name, productName: '路見不平', defaultDistrict,
  center: { lat, lng }, zoom: 16, bounds: { south, north, west, east },
  districts: [defaultDistrict, ...districts.filter(d => d !== defaultDistrict)] };
});
export type City = (typeof CITIES)[number];
export const CITY = CITIES[0];
// Actual production availability is still Keelung. Do not imply nationwide launch.
export const canReportInCity = (id: string) => DEMO_MODE || id === CITY.id;
