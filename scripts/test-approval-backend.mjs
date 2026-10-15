// Explicit integration test: creates only disposable prefixed users/records, then removes them.
// Never print credentials or service keys. Run after applying the approval migration.
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const raw=execFileSync('cmd.exe',['/d','/s','/c','node_modules\\.bin\\supabase.cmd projects api-keys --project-ref asfrsorbzmqhnwnxlxar --output json'],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
const keys=JSON.parse(raw),url='https://asfrsorbzmqhnwnxlxar.supabase.co';
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,keys.find(k=>k.name==='service_role').api_key,options);
const publicKey=keys.find(k=>k.name==='anon').api_key;
const prefix=`approval-qa-${Date.now()}`,users=[],accounts={};let browser;
function ok(result){if(result.error)throw Error(result.error.message);return result.data;}
async function rpc(client,name,args){
 if(name==='import_cells'){name='import_cells_with_source';args={...args,kind:'synthetic'};}
 if(name==='approve_pack'){const cells=ok(await client.from('cells').select('lot').eq('id',args.cell_ids[0]).single());const run=ok(await client.functions.invoke('match-cells',{body:{lot:cells.lot,count:1}}));name='approve_recorded_pack';args={...args,run:run.run_id,reason:'synthetic test review'};}
 return ok(await client.rpc(name,args));}

async function denied(client,name,args){const result=await client.rpc(name,args);assert.ok(result.error,`${name} should be denied`);}
const layout={version:1,source:'simulation',devices:[{id:'IN',kind:'scanner',name:'QA 리더',model:'가상',x:-3,z:0,rotation:0,cycle:2,tags:[{key:'rate',label:'모의 판독률',unit:'%',nominal:99,high:null}]},{id:'OUT',kind:'inspection',name:'QA 검사대',model:'가상',x:3,z:0,rotation:0,cycle:2,tags:[{key:'voltage',label:'전압',unit:'V',nominal:26,high:29}]}],links:[{from:'IN',to:'OUT'}]};
const twinArgs=(title)=>({request_kind:'twin',target_pack:null,request_title:title,request_message:'자동 검증용 가상 공정',twin_layout:layout});
try{
 for(const [name,role,status] of [['admin','admin','approved'],['operator','operator','approved'],['reviewer','operator','approved'],['reviewer2','operator','approved'],['aging','operator','approved'],['final','operator','approved'],['viewer','viewer','approved'],['pending','operator','pending']]){
  const email=`${prefix}-${name}@example.invalid`,password=randomUUID()+'aA1!';const {user}=ok(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:`검증 ${name}`}}));users.push(user.id);ok(await service.from('profiles').update({role,status}).eq('id',user.id));const client=createClient(url,publicKey,options);ok(await client.auth.signInWithPassword({email,password}));accounts[name]={client,id:user.id,email,password};
 }
 const {admin,operator,reviewer,reviewer2,aging,final,viewer,pending}=accounts;
 await denied(operator.client,'set_process_permissions',{target_id:operator.id,stages:['assembly']});
 for(const [account,stages] of [[operator,['assembly']],[aging,['aging']],[final,['final']]])await rpc(admin.client,'set_process_permissions',{target_id:account.id,stages});
 await rpc(admin.client,'set_quality_reviewer',{target_id:reviewer2.id,enabled:true});
 await denied(admin.client,'set_process_permissions',{target_id:admin.id,stages:['assembly']});
 await denied(admin.client,'set_quality_reviewer',{target_id:admin.id,enabled:true});
 await denied(operator.client,'set_quality_reviewer',{target_id:operator.id,enabled:true});await rpc(admin.client,'set_quality_reviewer',{target_id:reviewer.id,enabled:true});
 await denied(viewer.client,'submit_quality_request',twinArgs('읽기 전용 차단'));await denied(pending.client,'submit_quality_request',twinArgs('미승인 차단'));
 assert.ok((await operator.client.from('quality_requests').insert({kind:'twin',title:'직접 쓰기',snapshot:layout,request_note:'차단',submitted_by:operator.id,submitted_name:'임의'})).error);
 await denied(operator.client,'submit_quality_request',{...twinArgs('잘못된 공정'),twin_layout:{...layout,links:[]}});
 await denied(operator.client,'submit_quality_request',{...twinArgs('잘못된 출처'),twin_layout:{...layout,source:'live'}});
 await denied(admin.client,'submit_quality_request',twinArgs('관리자 업무 제출 차단'));
 const own=await rpc(operator.client,'submit_quality_request',twinArgs('담당자 본인 제출'));
 await rpc(admin.client,'set_quality_reviewer',{target_id:operator.id,enabled:true});
 await denied(operator.client,'decide_quality_request',{request_id:own,decision:'approved',review_note:'자기 승인 차단'});
 await rpc(admin.client,'set_quality_reviewer',{target_id:operator.id,enabled:false});
 await denied(admin.client,'decide_quality_request',{request_id:own,decision:'approved',review_note:'자기 승인 차단'});
 await denied(operator.client,'decide_quality_request',{request_id:own,decision:'approved',review_note:'일반 작업자 차단'});
 await denied(viewer.client,'cancel_quality_request',{request_id:own});
 await rpc(reviewer.client,'decide_quality_request',{request_id:own,decision:'rejected',review_note:'수정 후 재제출'});
 const same=await rpc(operator.client,'submit_quality_request',twinArgs('반려 후 재제출'));
 await rpc(operator.client,'cancel_quality_request',{request_id:same});
 const shared=await rpc(operator.client,'submit_quality_request',twinArgs('다중 사용자 공정 검토'));
 await denied(operator.client,'submit_quality_request',twinArgs('중복 제출 차단'));
 assert.equal(ok(await pending.client.from('quality_requests').select('id')).length,0);
 assert.ok(ok(await viewer.client.from('quality_requests').select('id').eq('id',shared)).length===1);
 browser=await chromium.launch({channel:'chrome',headless:true});const base=process.argv[2]||'http://127.0.0.1:4173/batt/';
 const [contextA,contextB]=await Promise.all([browser.newContext(),browser.newContext()]);
 const pageA=await contextA.newPage(),pageB=await contextB.newPage();
 for(const [page,account] of [[pageA,reviewer2],[pageB,reviewer]]){await page.goto(base);await page.getByLabel('이메일').fill(account.email);await page.getByLabel('비밀번호').fill(account.password);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('navigation').getByRole('button',{name:'품질·공정 승인함',exact:true}).click();await page.getByRole('row').filter({hasText:'다중 사용자 공정 검토'}).getByRole('button',{name:'제출본 검토'}).click();await page.getByLabel('검토 의견').fill('독립 브라우저에서 동일한 제출본 확인');}
 await Promise.all([pageA.getByRole('button',{name:'제출본 승인',exact:true}).click(),pageB.getByRole('button',{name:'제출본 승인',exact:true}).click()]);
 for(const page of [pageA,pageB])await page.locator('.approval-detail .approval-status.approved').waitFor();
 assert.equal(ok(await service.from('quality_events').select('*').eq('request_id',shared).eq('action','approved')).length,1);
 // Pack evidence, failing evidence, duplicate decision and automatic invalidation.
 const rows=Array.from({length:8},(_,i)=>({id:`${prefix}-cell-${i}`,lot:prefix,voltage_mv:3300+i*0.1,resistance_mohm:0.42,capacity_mah:30000+i,measured_at:new Date().toISOString()}));
 for(const account of [admin,aging,final,reviewer,viewer,pending]){
  await denied(account.client,'import_cells',{rows,source:prefix});
  const matching=await account.client.functions.invoke('match-cells',{body:{count:1}});assert.ok(matching.error,'matching must respect assembly assignment');
 }
 await rpc(operator.client,'import_cells',{rows,source:prefix});
 ok(await operator.client.functions.invoke('match-cells',{body:{lot:prefix,count:1}}));const pack=await rpc(operator.client,'approve_pack',{cell_ids:rows.map(c=>c.id),serial:prefix});
 for(const account of [admin,aging,final,reviewer])await denied(account.client,'approve_pack',{cell_ids:rows.map(c=>c.id),serial:prefix+'-denied'});
 for(const [account,kind] of [[admin,'aging'],[operator,'aging'],[aging,'final'],[final,'aging'],[reviewer,'final']])await denied(account.client,'record_inspection',{target_pack:pack,test_kind:kind,test_result:'pass',test_note:'wrong process'});
 const packArgs={request_kind:'pack',target_pack:pack,request_title:'',request_message:'검사 근거 검토',twin_layout:null};
 await denied(operator.client,'submit_quality_request',packArgs);
 await rpc(aging.client,'record_inspection',{target_pack:pack,test_kind:'aging',test_result:'pass',test_note:prefix});await rpc(final.client,'record_inspection',{target_pack:pack,test_kind:'final',test_result:'fail',test_note:prefix});
 const failing=await rpc(operator.client,'submit_quality_request',packArgs);await denied(reviewer.client,'decide_quality_request',{request_id:failing,decision:'approved',review_note:'불합격 승인 차단'});await rpc(reviewer.client,'decide_quality_request',{request_id:failing,decision:'rejected',review_note:'재검사 필요'});
 await rpc(final.client,'record_inspection',{target_pack:pack,test_kind:'final',test_result:'pass',test_note:prefix});const pass=await rpc(operator.client,'submit_quality_request',packArgs);
 for(const confirmer of [operator,aging,final]){
  await rpc(admin.client,'set_quality_reviewer',{target_id:confirmer.id,enabled:true});
  await denied(confirmer.client,'decide_quality_request',{request_id:pass,decision:'approved',review_note:'confirmation and approval cannot be by same person'});
  await rpc(admin.client,'set_quality_reviewer',{target_id:confirmer.id,enabled:false});
 }
 const evidence=ok(await service.from('quality_requests').select('snapshot').eq('id',pass).single()).snapshot;
 assert.equal(evidence.pack.created_by,operator.id);assert.equal(evidence.aging.created_by,aging.id);assert.equal(evidence.final.created_by,final.id);assert.equal(evidence.aging.confirmed_name,'검증 aging');
 const outcomes=await Promise.all([reviewer2.client.rpc('decide_quality_request',{request_id:pass,decision:'approved',review_note:'동시 승인 A'}),reviewer.client.rpc('decide_quality_request',{request_id:pass,decision:'approved',review_note:'동시 승인 B'})]);assert.equal(outcomes.filter(x=>!x.error).length,1);
 await rpc(aging.client,'record_inspection',{target_pack:pack,test_kind:'aging',test_result:'fail',test_note:prefix});const stale=ok(await service.from('quality_requests').select('*').eq('id',pass).single());assert.equal(stale.status,'superseded');assert.equal(stale.snapshot.aging.result,'pass');assert.ok(stale.reviewed_by);
 const fresh=await rpc(operator.client,'submit_quality_request',packArgs);await rpc(aging.client,'record_inspection',{target_pack:pack,test_kind:'aging',test_result:'pass',test_note:prefix});await denied(reviewer.client,'decide_quality_request',{request_id:fresh,decision:'approved',review_note:'변경된 제출본 차단'});
 // Administrator can delegate/revoke reviewer access in the actual member screen.
 const adminPage=await (await browser.newContext()).newPage();await adminPage.goto(base);await adminPage.getByLabel('이메일').fill(admin.email);await adminPage.getByLabel('비밀번호').fill(admin.password);await adminPage.getByRole('button',{name:'로그인',exact:true}).click();
 await adminPage.getByRole('navigation').getByRole('button',{name:'품질·공정 승인함',exact:true}).click();await adminPage.getByRole('row').filter({hasText:'다중 사용자 공정 검토'}).getByRole('button',{name:'제출본 검토'}).click();assert.equal(await adminPage.getByLabel('검토 의견').count(),0);
 await adminPage.getByRole('navigation').getByRole('button',{name:'사용자 관리',exact:true}).click();
 const operatorRow=adminPage.getByRole('row').filter({hasText:operator.email});await operatorRow.getByText('업무 권한 설정',{exact:true}).click();await operatorRow.getByLabel('셀 등록·매칭',{exact:true}).click();await expect.poll(()=>rpc(operator.client,'can_confirm_stage',{stage:'assembly'})).toBe(false);
 await denied(operator.client,'import_cells',{rows:[],source:prefix});
 await operatorRow.getByLabel('셀 등록·매칭',{exact:true}).click();await expect.poll(()=>rpc(operator.client,'can_confirm_stage',{stage:'assembly'})).toBe(true);
 const memberRow=adminPage.getByRole('row').filter({hasText:reviewer.email});await memberRow.getByText('업무 권한 설정',{exact:true}).click();await memberRow.getByRole('button',{name:'품질 승인 권한 해제',exact:true}).click();await memberRow.getByRole('button',{name:'품질 승인 권한 부여',exact:true}).waitFor();assert.equal(ok(await service.from('profiles').select('quality_reviewer').eq('id',reviewer.id).single()).quality_reviewer,false);await memberRow.getByRole('button',{name:'품질 승인 권한 부여',exact:true}).click();await memberRow.getByRole('button',{name:'품질 승인 권한 해제',exact:true}).waitFor();
 // Actual UI exposes only the assigned inspection, with no administrator production controls.
 for(const [account,kinds] of [[aging,['aging']],[final,['final']],[operator,[]],[admin,[]]]){
  const context=await browser.newContext(),page=await context.newPage();await page.goto(base);await page.getByLabel('이메일').fill(account.email);await page.getByLabel('비밀번호').fill(account.password);await page.getByRole('button',{name:'로그인',exact:true}).click();
  await page.getByRole('navigation').getByRole('button',{name:'팩 · 검사이력',exact:true}).click();await page.getByRole('row').filter({hasText:prefix}).getByRole('button',{name:'상세 조회'}).click();
  if(kinds.length)assert.deepEqual(await page.getByLabel('검사 구분').locator('option').evaluateAll(items=>items.map(i=>i.value)),kinds);else assert.equal(await page.getByLabel('검사 구분').count(),0);
  await context.close();
 }
 // Suspension revokes both reads and writes even for an existing session.
 ok(await service.from('profiles').update({status:'suspended'}).eq('id',reviewer.id));assert.equal(ok(await reviewer.client.from('quality_requests').select('id')).length,0);await denied(reviewer.client,'decide_quality_request',{request_id:fresh,decision:'approved',review_note:'정지 계정 차단'});
 await pageB.getByRole('button',{name:'승인함 새로고침',exact:true}).click();await pageB.locator('.approval-message').filter({hasText:'사용 권한이 변경'}).waitFor();assert.equal(await pageB.locator('.approval-detail').count(),0);
 console.log('PASS: administrator excluded, stage-specific RPC/Edge access, signed process evidence, independent final approvers, one atomic decision, role/RLS checks, self-review blocked, immutable snapshots, failed-pack rejection, reinspection invalidation and resubmission.');
}catch(error){if(browser){let i=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:`.local/approval-backend-error-${i++}.png`});}throw error;}finally{
 await browser?.close();
 if(users.length){const requests=ok(await service.from('quality_requests').select('id').in('submitted_by',users)).map(r=>r.id);if(requests.length){ok(await service.from('quality_events').delete().in('request_id',requests));ok(await service.from('quality_requests').delete().in('id',requests));}
 const packs=ok(await service.from('packs').select('id').in('created_by',users)).map(p=>p.id);if(packs.length){ok(await service.from('inspections').delete().in('pack_id',packs));ok(await service.from('pack_cells').delete().in('pack_id',packs));ok(await service.from('packs').delete().in('id',packs));}ok(await service.from('cells').delete().in('created_by',users));
 ok(await service.from('evidence_events').delete().in('created_by',users));ok(await service.from('matching_runs').delete().in('created_by',users));ok(await service.from('intake_batches').delete().in('created_by',users));
ok(await service.from('audit_logs').delete().in('actor',users));for(const id of users)ok(await service.auth.admin.deleteUser(id));console.log('Disposable test users and their records removed.');}
}
