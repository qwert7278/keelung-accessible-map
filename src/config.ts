export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";
export const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  "https://keelung-accessible-map.vercel.app"
).replace(/\/+$/, "");
export const BETA_FEEDBACK_EMAIL = "lingwei2046@gmail.com";
export const CITIES = [
  {
    id: "TW-KEE",
    name: "基隆市",
    productName: "基隆好行",
    center: { lat: 25.1283, lng: 121.7419 },
    zoom: 14,
    // Broad service envelope; not an official administrative boundary.
    bounds: { south: 25.05, north: 25.2, west: 121.62, east: 121.82 },
    districts: [
      "仁愛區",
      "中正區",
      "信義區",
      "中山區",
      "安樂區",
      "暖暖區",
      "七堵區",
    ],
  },
];
export const CITY = CITIES[0];
