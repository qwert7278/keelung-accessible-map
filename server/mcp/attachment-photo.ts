import {hash,RoadTagService} from '../roadtag/service.js';
import {RoadError,type Principal,type ToolName} from '../roadtag/contracts.js';
import {attachmentSchemas} from './attachment-probe.js';
export async function attachmentPhoto(service:RoadTagService,name:ToolName,raw:unknown,p:Principal,bytes:Uint8Array){
 if(name!=='create_report'&&name!=='add_observation')throw new RoadError('INVALID_INPUT');
 if(!p.write)throw new RoadError('FORBIDDEN');
 const parsed=attachmentSchemas[name].safeParse(raw);if(!parsed.success||!parsed.data.photo_file)throw new RoadError('INVALID_INPUT');
 const i=parsed.data,report=name==='create_report'?i.operation_id:('report_id' in i?i.report_id:'');
 const handoff={operation_id:i.operation_id,report_id:report,kind:name==='create_report'?'before':'updates',format:'webp'};
 const reservation=await service.reserve(handoff,p),path=String(reservation.path);
 if(reservation.uploaded){if(hash(await service.backend.bytes(path,p))!==hash(bytes))throw new RoadError('IDEMPOTENCY_CONFLICT');}
 else await service.backend.put(path,bytes,'image/webp',p);
 return service.finalize(handoff,p);
}
