import {createHash} from 'node:crypto';
import {z} from 'zod';
import {schemas,RoadError,type ToolName} from '../roadtag/contracts.js';
// Temporary staging gate: inspect structure only; never fetch, reserve, or write.
const photoFile=z.strictObject({download_url:z.string().min(1).max(8192),file_id:z.string().min(1).max(200),mime_type:z.string().max(100).optional(),file_name:z.string().max(255).optional()});
export const attachmentSchemas={
 ...schemas,
 create_report:schemas.create_report.extend({photo_token:schemas.create_report.shape.photo_token.optional(),photo_file:photoFile.optional()}).refine(v=>Number(!!v.photo_token)+Number(!!v.photo_file)===1),
 add_observation:schemas.add_observation.extend({photo_file:photoFile.optional()}).refine(v=>Number(!!v.photo_token)+Number(!!v.photo_file)<=1),
};
export function hasAttachment(name:ToolName,input:unknown){return (name==='create_report'||name==='add_observation')&&typeof input==='object'&&input!==null&&Object.hasOwn(input,'photo_file');}
export function inspectAttachment(name:ToolName,input:unknown){
 if(name!=='create_report'&&name!=='add_observation')throw new RoadError('INVALID_INPUT');
 const parsed=attachmentSchemas[name].safeParse(input);if(!parsed.success||!parsed.data.photo_file)throw new RoadError('INVALID_INPUT');
 const f=parsed.data.photo_file;let u:URL|undefined;try{u=new URL(f.download_url);}catch{/* Structural probe only. */}
 return {mode:'attachment_structure_probe',downloaded:false,database_written:false,file_param_present:true,file_id_present:!!f.file_id,download_url_parse_success:!!u,scheme:u?.protocol.replace(':','')||'invalid',hostname_hash:u?createHash('sha256').update(u.hostname).digest('hex'):null,mime_type:['image/jpeg','image/png','image/webp','image/heic'].includes(f.mime_type||'')?f.mime_type:'unknown',file_name_present:!!f.file_name};
}
