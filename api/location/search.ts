import { locationResponse } from '../../server/location/handler.js';
export const GET = (request:Request) => locationResponse(request,'search');
