// No service credentials are sent to the client. Cleanup removes only expired,
// unreferenced reservations after the database locks them against later claims.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { preparePhotoHandler } from './handler.ts';
const api=Deno.env.get('SUPABASE_URL')!;
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
Deno.serve(preparePhotoHandler({
  authenticate:async authorization=>{
    const client=createClient(api,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data,error}=await client.auth.getUser();
    return !error && data.user ? client : null;
  },
  maintenance:()=>createClient(api,serviceKey,{auth:{persistSession:false}}),
}));
