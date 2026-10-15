import { createClient } from 'npm:@supabase/supabase-js@2';
import { matchCells } from '../_shared/matching.ts';
const cors={'Access-Control-Allow-Origin':Deno.env.get('APP_ORIGIN')||'https://mobibi76.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
Deno.serve(async (req: Request)=>{
  const headers={...cors,'Content-Type':'application/json'};
  const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  if(req.method!=='POST') return reply({error:'Method not allowed'},405);
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer ')) return reply({error:'로그인이 필요합니다.'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await db.auth.getUser(authorization.slice(7));
  if(authError||!user) return reply({error:'로그인이 필요합니다.'},401);
  const {data:allowed,error:permissionError}=await db.rpc('can_confirm_stage',{stage:'assembly'});
  if(permissionError||!allowed) return reply({error:'셀 등록·매칭 담당 권한이 필요합니다.'},403);
  try {
    if(Number(req.headers.get('content-length')||0)>2048) return reply({error:'요청이 너무 큽니다.'},413);
    const body=await req.json();
    if(body.lot && (typeof body.lot!=='string'||body.lot.length>80)) return reply({error:'잘못된 LOT'},400);
    let query=db.from('cells').select('*').eq('status','available').order('id').limit(501);
    if(body.lot) query=query.eq('lot',body.lot);
    const {data,error}=await query;
    if(error) throw error;
    const start=performance.now();
    const result=matchCells(data||[],body.count??3);
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const saved=await admin.rpc('commit_standard_run',{actor:user.id,output:{...result,input_snapshot:data,parameters:{lot:body.lot||null,count:body.count??3},sop_version:'JSI-SOP-v1',elapsed_ms:performance.now()-start}});
    if(saved.error)throw saved.error;
    return reply({...result,groups:result.groups.map(g=>({...g,run_id:saved.data})),run_id:saved.data});
  } catch(e) { return reply({error:e instanceof Error?e.message:'매칭 요청을 처리할 수 없습니다.'},400); }
});
