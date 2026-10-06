import {z} from 'zod';
export const uuid=z.uuid();
const lat=z.number().finite().min(-90).max(90),lng=z.number().finite().min(-180).max(180);
const text=(max:number)=>z.string().trim().max(max);
export const category=z.enum(['uneven_surface','level_difference','ramp','arcade','occupied','narrow','construction','other']);
const status=z.enum(['open','in_progress','resolved']);
const token=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const schemas={
 resolve_location:z.strictObject({lat:lat.optional(),lng:lng.optional(),query:text(200).min(1).optional(),city_hint:text(100).optional()}),
 search_nearby_reports:z.strictObject({lat,lng,radius_m:z.number().min(10).max(500).default(50),category:category.optional(),include_resolved:z.boolean().default(false),limit:z.number().int().min(1).max(20).default(10)}),
 create_report:z.strictObject({operation_id:uuid,photo_token:token,city_id:text(20).min(1),district:text(80).min(1),lat,lng,title:text(80).min(1),address:text(200).default(''),description:text(1000).default(''),category,wheelchair_access:z.enum(['blocked','difficult','passable']),confirmed:z.literal(true)}),
 add_observation:z.strictObject({operation_id:uuid,report_id:uuid,message:text(1000).min(1),suggested_status:status.nullable().default(null),photo_token:token.nullable().default(null),confirmed:z.literal(true)}),
 get_report:z.strictObject({report_id:uuid,include_observations:z.boolean().default(false)}),
};
export const handoffSchema=z.strictObject({operation_id:uuid,report_id:uuid,kind:z.enum(['before','updates']),format:z.enum(['jpeg','webp'])});
export type ToolName=keyof typeof schemas;
export type Principal={id:string;actor:string;write:boolean};
export type PublicRow=Record<string,unknown>;
export class RoadError extends Error {constructor(public code:string){super(code);}}
export function safeError(error:unknown){
 const text=error instanceof Error?error.message:'';
 const codes=['AUTH_REQUIRED','FORBIDDEN','INVALID_INPUT','NOT_FOUND','LOCATION_MISMATCH','LOCATION_AMBIGUOUS','LOCATION_SEARCH_UNAVAILABLE','PHOTO_REQUIRED','PHOTO_TOKEN_INVALID','PHOTO_TOKEN_EXPIRED','CONFIRMATION_REQUIRED','IDEMPOTENCY_CONFLICT','RATE_LIMITED','SERVICE_UNAVAILABLE'];
 const code=error instanceof SyntaxError?'INVALID_INPUT':codes.find(c=>text===c)||(/頻繁|額度|未完成的照片/.test(text)?'RATE_LIMITED':/invalid|syntax/i.test(text)?'INVALID_INPUT':'SERVICE_UNAVAILABLE');
 return {code,message:code==='SERVICE_UNAVAILABLE'?'服務暫時無法使用，請稍後重試。':code==='IDEMPOTENCY_CONFLICT'?'這次操作已使用不同內容，請重新確認。':'請確認權限、位置與輸入資料後重試。'};
}
export interface Backend {
 rpc(name:string,args:Record<string,unknown>):Promise<PublicRow>;
 feed(filters:Record<string,string>,offset?:number,limit?:number):Promise<PublicRow[]>;
 observations(report:string,limit:number):Promise<PublicRow[]>;
 put(path:string,bytes:Uint8Array,mime:string,principal:Principal):Promise<void>;
 bytes(path:string,principal:Principal):Promise<Uint8Array>;
 photoUrl(path:string):string;
}
