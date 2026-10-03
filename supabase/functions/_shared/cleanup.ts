import type {SupabaseClient} from '@supabase/supabase-js';
export async function cleanupPhotos(client:SupabaseClient,maxBatches=1,deadline=Date.now()+50000) {
 let removed=0,batches=0,more=false;
 for(;batches<maxBatches && Date.now()<deadline;batches++) {
  const expired=await client.rpc('expired_photos');
  if(expired.error) throw new Error('Cannot query expired photos');
  const paths:string[]=expired.data||[];
  if(!paths.length) {more=false;break;}
  const deleted=await client.storage.from('report-photos').remove(paths);
  if(deleted.error) throw new Error('Storage cleanup failed; reservations retained');
  const finished=await client.rpc('finish_photo_cleanup',{paths});
  if(finished.error) throw new Error('Cleanup metadata pending retry');
  removed+=paths.length;more=paths.length===20;
 }
 return {removed,batches,more};
}
