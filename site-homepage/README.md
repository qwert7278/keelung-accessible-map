# Road Recall public homepage

This folder contains the reviewed static homepage for the Road Recall public hub. It is kept separate from the Vite reporting application so the brochure homepage and the reporting/map app can evolve independently.

## Contents

- `index.html` — homepage layout, OpenStreetMap preview, and three sample report markers with status colors synced from the public Supabase view.
- `images/` — image assets used by the homepage.
- `apple-touch-icon.png`, `favicon.png` — page icons.

The browser code uses only the Supabase publishable key. Never place a Supabase service-role key in this folder. The configured homepage links people to the reporting application at `https://keelung-accessible-map.vercel.app/`.

The source was exported from the reviewed Site homepage. Site-specific private hosting metadata and local preview artifacts are intentionally excluded.
