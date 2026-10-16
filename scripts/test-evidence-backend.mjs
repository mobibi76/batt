// Explicit deployment smoke test. Only disposable synthetic accounts/data are created.
// Credentials are kept in memory and never printed. Customer files are not read.
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {parseWorkspaceSnapshot} from '../src/data/workspaceSnapshot.ts';
const ref='asfrsorbzmqhnwnxlxar',url=`https://${ref}.supabase.co`;
let keys;try{keys=JSON.parse(execFileSync('cmd.exe',['/d','/s','/c',`node_modules\\.bin\\supabase.cmd projects api-keys --project-ref ${ref} --output json`],{encoding:'utf8',stdio:['pipe','pipe','pipe']}));}catch{throw Error('Cannot read deployment test credentials');}
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,keys.find(k=>k.name==='service_role').api_key,options),anon=keys.find(k=>k.name==='anon').api_key;
const prefix=`evidence-qa-${Date.now()}`,users=[];let operator,reviewer;
function ok(r){if(r.error)throw Error(r.error.message);return r.data;}
async function rpc(client,name,args){
 if(name==='review_evidence'){name='review_evidence_checked';args={...args,expected_revision:ok(await client.from('intake_batches').select('revision').eq('id',args.batch).single()).revision};}
 if(name==='approve_recorded_pack')args={...args,reason:'synthetic review'};
 return ok(await client.rpc(name,args));}

try{
 for(const role of ['operator','reviewer']){
  const email=`${prefix}-${role}@example.invalid`,password=randomUUID()+'aA1!';
  const {user}=ok(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:prefix+' '+role}}));users.push(user.id);
  ok(await service.from('profiles').update({role:'operator',status:'approved',process_stages:role==='operator'?['assembly','aging','final']:[],quality_reviewer:role==='reviewer'}).eq('id',user.id));
  const client=createClient(url,anon,options);ok(await client.auth.signInWithPassword({email,password}));if(role==='operator')operator=client;else reviewer=client;
 }
 const rows=Array.from({length:8},(_,i)=>({row_no:i+2,id:`${prefix}-${i}`,channel:String(i),voltage_mv:3300,resistance_mohm:null,capacity_mah:25000,measured_at:'2026-10-15T00:00:00Z',issues:['synthetic missing resistance'],state:'ready'}));
 const hash=randomUUID().replaceAll('-','').repeat(2);
 const batch=await rpc(operator,'register_intake',{payload:{name:prefix+'.csv',hash,source_kind:'synthetic',mapping_version:'qa-v1',headers:[['synthetic fixture']],rows},note:'Disposable synthetic deployment test; not production evidence'});
 assert.ok((await operator.rpc('import_cells',{rows:[],source:'bypass'})).error);
 assert.ok((await operator.rpc('approve_pack',{cell_ids:[],serial:'bypass'})).error);
 const concurrent=await Promise.all(['A','B'].map(reason=>operator.rpc('review_evidence_checked',{batch,cell:rows[0].id,next_state:'ready',reason,expected_revision:1,measurement:null})));
 assert.equal(concurrent.filter(r=>!r.error).length,1);assert.equal(concurrent.filter(r=>r.error).length,1);
 const unverified=ok(await operator.functions.invoke('analyze-batch',{body:{batch_id:batch}}));assert.equal(unverified.result.sop_version,'JSI-SOP-v2');assert.ok(unverified.result.alternatives.every(g=>g.status==='pass'&&g.spreads.resistance_mohm===null));

 assert.ok((await reviewer.functions.invoke('analyze-batch',{body:{batch_id:batch}})).error);
 for(const row of rows)await rpc(operator,'review_evidence',{batch,cell:row.id,next_state:'ready',reason:'synthetic remeasurement',measurement:{voltage_mv:3300,resistance_mohm:null,capacity_mah:25000,measured_at:'2026-10-15T00:00:00Z'}});
 const verified=ok(await operator.functions.invoke('analyze-batch',{body:{batch_id:batch}}));assert.equal(verified.result.alternatives[0].status,'pass');const persisted=ok(await operator.from('matching_runs').select('batch_revision,created_at').eq('id',verified.id).single());assert.equal(verified.batch_revision,persisted.batch_revision);assert.equal(Date.parse(verified.created_at),Date.parse(persisted.created_at));
 const pack=await rpc(operator,'approve_evidence_pack',{run:verified.id,cell_ids:rows.map(r=>r.id),serial:prefix,reason:'synthetic full SOP review'});
 const consumed=ok(await operator.from('intake_batches').select('rows').eq('id',batch).single());assert.equal(consumed.rows.filter(r=>r.state==='used').length,8);
 const noReuse=ok(await operator.functions.invoke('analyze-batch',{body:{batch_id:batch}}));assert.equal(noReuse.result.eligible_count,0);
 ok(await operator.from('research_runs').insert({id:randomUUID(),created_by:users[0],report:{scope:'synthetic browser research persistence test'}}));
 assert.equal(ok(await operator.from('research_runs').select('id')).length,1);
 assert.equal(ok(await reviewer.from('research_runs').select('id')).length,0);
 for(const kind of ['aging','final'])await rpc(operator,'record_inspection',{target_pack:pack,test_kind:kind,test_result:'pass',test_note:'synthetic QA',result_kind:'test'});
 const request=await rpc(operator,'submit_quality_request',{request_kind:'pack',target_pack:pack,request_title:'',request_message:'synthetic independent approval',twin_layout:null});
 const reviewContext=await rpc(reviewer,'pack_decision_context',{target_pack:pack});assert.equal(reviewContext.reviews[0].reason,'synthetic full SOP review');assert.ok(reviewContext.events.some(e=>e.actor_name));assert.equal(ok(await reviewer.from('audit_logs').select('id')).length,0);
 await rpc(reviewer,'decide_quality_request',{request_id:request,decision:'approved',review_note:'synthetic workflow only'});
 const snapshot=ok(await operator.from('quality_requests').select('snapshot,status').eq('id',request).single());assert.equal(snapshot.status,'approved');assert.equal(snapshot.snapshot.final.evidence_kind,'test');assert.equal(snapshot.snapshot.pack.source_kind,'synthetic');
 await rpc(operator,'record_inspection',{target_pack:pack,test_kind:'final',test_result:'fail',test_note:'synthetic retest',result_kind:'test'});
 assert.equal(ok(await operator.from('quality_requests').select('status').eq('id',request).single()).status,'superseded');
 const canonical=rows.map((r,i)=>({id:`${prefix}-STD-${i}`,lot:prefix,voltage_mv:3300,resistance_mohm:null,capacity_mah:25000,measured_at:'2026-10-15T00:00:00Z'}));
 await rpc(operator,'import_cells_with_source',{rows:canonical,source:prefix,kind:'synthetic'});
 const standard=ok(await operator.functions.invoke('match-cells',{body:{lot:prefix,count:1}}));assert.ok(standard.run_id);assert.equal(standard.groups.length,1);
 await rpc(operator,'approve_recorded_pack',{cell_ids:standard.groups[0].cell_ids,serial:prefix+'-STD',run:standard.run_id});
 const multi=canonical.map((c,i)=>({...c,id:`${prefix}-MULTI-${i}`,lot:prefix+'-MULTI'}));for(const half of [multi.slice(0,4),multi.slice(4)])await rpc(operator,'import_cells_with_source',{rows:half,source:prefix,kind:'synthetic'});const targets=await rpc(operator,'inventory_review_targets',{cell_ids:multi.map(c=>c.id)});assert.equal(targets.length,2);for(const t of targets)await rpc(operator,'review_evidence',{batch:t.batch_id,cell:t.cell_ids[0],next_state:'retest',reason:'multi source test',measurement:null});
 const loadRows=Array.from({length:500},(_,i)=>({...rows[0],id:`${prefix}-LOAD-${i}`,row_no:i+1,lot:'LOAD',resistance_mohm:.42,capacity_mah:25000+i%100}));
 const loadBatch=await rpc(operator,'register_intake',{payload:{name:prefix+'-load.csv',hash:randomUUID().replaceAll('-','').repeat(2),source_kind:'synthetic',mapping_version:'load-test-v1',rows:loadRows},note:'Disposable 500-row bound test'});
 const load=ok(await operator.functions.invoke('analyze-batch',{body:{batch_id:loadBatch}}));assert.equal(load.result.input_count,500);assert.equal(load.result.recommended.groups.length,62);
 const workspace=await rpc(operator,'read_workbench',{known_revision:null});assert.equal(workspace.profile.id,users[0]);assert.equal(workspace.members.length,0);assert.ok(workspace.packs.some(p=>p.id===pack&&p.pack_cells.length===8));
 parseWorkspaceSnapshot(workspace,users[0],null);
 const unchanged=await rpc(operator,'read_workbench',{known_revision:workspace.revision});assert.equal(unchanged.changed,false);assert.equal(unchanged.cells,undefined);parseWorkspaceSnapshot(unchanged,users[0],workspace.revision);
 console.log('PASS: deployed coherent workspace snapshot and unchanged-poll response');
 console.log('PASS: 500-row deployed Edge calculation; elapsed_ms='+Math.round(load.result.elapsed_ms)+' (elapsed, not CPU time)');
 console.log('PASS: deployed batch/standard Edge calculations, v2 nullable resistance, stored runs, retest, pack lineage, independent approval and supersession');
}catch(error){console.error('FAIL:',error.message);process.exitCode=1;}
finally{
 if(users.length){
  try{
   const packs=ok(await service.from('packs').select('id').in('created_by',users)).map(p=>p.id);
   const requests=ok(await service.from('quality_requests').select('id').in('submitted_by',users)).map(r=>r.id);
   if(requests.length){ok(await service.from('quality_events').delete().in('request_id',requests));ok(await service.from('quality_requests').delete().in('id',requests));}
   if(packs.length){ok(await service.from('inspections').delete().in('pack_id',packs));ok(await service.from('pack_cells').delete().in('pack_id',packs));ok(await service.from('packs').delete().in('id',packs));}
   ok(await service.from('cells').delete().in('created_by',users));ok(await service.from('evidence_events').delete().in('created_by',users));ok(await service.from('matching_runs').delete().in('created_by',users));ok(await service.from('intake_batches').delete().in('created_by',users));ok(await service.from('research_runs').delete().in('created_by',users));ok(await service.from('audit_logs').delete().in('actor',users));
   for(const id of users)ok(await service.auth.admin.deleteUser(id));console.log('PASS: disposable test records and accounts removed');
  }catch(error){console.error('CLEANUP REQUIRED:',prefix,error.message);process.exitCode=1;}
 }
}
