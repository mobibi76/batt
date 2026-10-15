import {createClient} from 'npm:@supabase/supabase-js@2';
import {analyzeEvidence} from '../_shared/evidence.ts';
const cors={'Access-Control-Allow-Origin':Deno.env.get('APP_ORIGIN')||'https://mobibi76.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
Deno.serve(async(req:Request)=>{
 const headers={...cors,'Content-Type':'application/json'};const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const authorization=req.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'로그인이 필요합니다'},401);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data:{user},error}=await db.auth.getUser(authorization.slice(7));if(error||!user)return reply({error:'로그인이 필요합니다'},401);
 const permission=await db.rpc('can_confirm_stage',{stage:'assembly'});if(permission.error||!permission.data)return reply({error:'셀 등록·매칭 담당 권한이 필요합니다'},403);
 try{
  const body=await req.json();if(typeof body.batch_id!=='string'||!/^[\da-f-]{36}$/i.test(body.batch_id))return reply({error:'배치 ID 확인 필요'},400);
  const {data:batch,error:readError}=await db.from('intake_batches').select('id,rows,revision').eq('id',body.batch_id).single();if(readError)throw readError;
  const result=analyzeEvidence(batch.rows,body.exclude_outliers===true);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const saved=await admin.rpc('commit_matching_run',{batch:batch.id,expected_revision:batch.revision,actor:user.id,output:result});if(saved.error)throw saved.error;
  return reply({id:saved.data,result});
 }catch(e){return reply({error:e instanceof Error?e.message:(e as {message?:string})?.message||'비교 실패'},400);}
});
