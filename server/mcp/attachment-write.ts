import {randomUUID} from 'node:crypto';
import {hash,RoadTagService} from '../roadtag/service.js';
import {RoadError,type Principal,type ToolName,type PublicRow} from '../roadtag/contracts.js';
import {attachmentSchemas} from './attachment-probe.js';
import {downloadAttachment,normalizeAttachment} from './attachment-download.js';
import {attachmentPhoto} from './attachment-photo.js';
export async function attachmentWrite(service:RoadTagService,name:ToolName,raw:unknown,p:Principal,download=downloadAttachment){
 if(name!=='create_report'&&name!=='add_observation')throw new RoadError('INVALID_INPUT');
 if(!p.write)throw new RoadError('FORBIDDEN');
 if((raw as PublicRow)?.confirmed!==true)throw new RoadError('CONFIRMATION_REQUIRED');
 const parsed=attachmentSchemas[name].safeParse(raw);if(!parsed.success||!parsed.data.photo_file)throw new RoadError('INVALID_INPUT');
 const i=parsed.data,file=i.photo_file!,business:PublicRow={...i};delete business.operation_id;delete business.photo_file;delete business.photo_token;
 const lease=randomUUID(),args={p:p.id,op:i.operation_id,tool_name:name,data:business,file_hash:hash(file.file_id),lease};
 const binding=await service.backend.rpc('mcp_attachment_begin',args);
 // Successful replay precedes URL validation, download budget and every byte access.
 if(binding.replay)return service.writeResult(binding.replay as PublicRow);
 if(binding.busy)throw new RoadError('RATE_LIMITED');
 try{
  let bytes:Uint8Array;
  if(binding.photo_path){bytes=await service.backend.bytes(String(binding.photo_path),p);if(hash(bytes)!==binding.digest)throw new RoadError('IDEMPOTENCY_CONFLICT');}
  else {await service.backend.rpc('mcp_attachment_download_budget',{p:p.id});bytes=(await normalizeAttachment(await download(file.download_url))).bytes;}
  await service.backend.rpc('mcp_attachment_digest',{p:p.id,op:i.operation_id,lease,digest:hash(bytes)});
  const finalized=await attachmentPhoto(service,name,i,p,bytes);
  const domain={...i,photo_token:finalized.photo_token} as PublicRow;delete domain.photo_file;
  return await service.call(name,domain,p);
 }finally{
  // Release only our byte lease. Never touch durable Auth session rotation locks.
  await service.backend.rpc('mcp_attachment_release',{p:p.id,op:i.operation_id,lease}).catch(()=>{});
 }
}
