import { locationCapabilities } from '../../server/location/safety.js';
export const GET=()=>Response.json(locationCapabilities(),{headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
