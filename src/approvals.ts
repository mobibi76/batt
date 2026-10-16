import {inspectionOrder,processChecks} from './process';
import { supabase, type Inspection, type Pack } from './lib';
import { validateLayout, runError, type Layout } from './twin/model';
import type { Cell } from '../supabase/functions/_shared/matching';
export const approvalStatuses={pending:'승인 대기',approved:'승인',rejected:'반려',cancelled:'요청 취소',superseded:'재검토 필요'};
export type ApprovalStatus=keyof typeof approvalStatuses;
export type PackSnapshot={decision_context?:import('./DecisionEvidence').DecisionContext;pack:Pack;cells:Cell[];aging:Inspection;casing?:Inspection;final:Inspection};
export type ApprovalEvent={id:number;request_id:string;actor:string;actor_name:string;action:ApprovalStatus|'submitted';note:string;created_at:string};
export type Approval={id:string;kind:'pack'|'twin';pack_id:string|null;title:string;snapshot:PackSnapshot|Layout;request_note:string;status:ApprovalStatus;submitted_by:string;submitted_name:string;submitted_at:string;reviewed_by:string|null;reviewed_name:string|null;reviewed_at:string|null;decision_note:string|null;events?:ApprovalEvent[]};
export const requestColumns='id,kind,pack_id,title,request_note,status,submitted_by,submitted_name,submitted_at,reviewed_by,reviewed_name,reviewed_at,decision_note';
export function participatedInPack(request:Approval,actor:string){
 if(request.kind!=='pack')return false;
 const evidence=request.snapshot as PackSnapshot;
 return [evidence.pack.created_by,evidence.aging.created_by,evidence.casing?.created_by,evidence.final.created_by].includes(actor);
}
export function latestInspection(tests:Inspection[],packId:string,kind:Inspection['kind']){return tests.filter(t=>t.pack_id===packId&&t.kind===kind).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0];}
export function packEvidence(pack:Pack,cells:Cell[],tests:Inspection[]):PackSnapshot {
 const checks=processChecks(pack,tests),aging=checks[inspectionOrder(pack)[0]],casing=checks.casing,final=checks.final;
 if(pack.pack_cells.length!==8||!aging||!final||(pack.process_version==='field-v1'&&!casing))throw Error('구성 셀 8개와 공정 순서에 맞는 검사·케이싱 기록을 먼저 등록하세요.');
 return {pack:structuredClone(pack),cells:pack.pack_cells.map(pc=>cells.find(c=>c.id===pc.cell_id)!).filter(Boolean),aging:structuredClone(aging),...(casing?{casing:structuredClone(casing)}:{}),final:structuredClone(final)};
}
export function normalizeTwin(layout:unknown):Layout {const valid=validateLayout(layout);const error=runError(valid);if(error)throw Error(error);return valid;}
export async function submitTwin(layout:Layout,title:string,note:string){normalizeTwin(layout);const {data,error}=await supabase.rpc('submit_quality_request',{request_kind:'twin',target_pack:null,request_title:title,request_message:note,twin_layout:layout});if(error)throw Error(error.message);return data as string;}
export function createDemoRequest(kind:Approval['kind'],snapshot:Approval['snapshot'],title:string,note:string,by='demo-requester'):Approval {
 if(!title.trim()||!note.trim())throw Error('이름과 요청 사유를 입력하세요.');
 if(kind==='twin')normalizeTwin(snapshot);
 const id=crypto.randomUUID(),now=new Date().toISOString();const name=by==='demo-reviewer'?'체험 승인자':'체험 작업자';
 return {id,kind,pack_id:kind==='pack'?(snapshot as PackSnapshot).pack.id:null,title,request_note:note,status:'pending',snapshot:structuredClone(snapshot),submitted_by:by,submitted_name:name,submitted_at:now,reviewed_by:null,reviewed_name:null,reviewed_at:null,decision_note:null,events:[{id:1,request_id:id,actor:by,actor_name:name,action:'submitted',note,created_at:now}]};
}
export function demoDecision(r:Approval,actor:string,decision:'approved'|'rejected',note:string):Approval {
 if(actor!=='demo-reviewer')throw Error('품질 승인 권한이 필요합니다.');
 if(r.status!=='pending')throw Error('이미 처리되었거나 변경된 요청입니다.');
 if(r.submitted_by===actor)throw Error('자신이 제출한 요청은 다른 승인자가 검토해야 합니다.');
 if(participatedInPack(r,actor))throw Error('본인이 공정 확인한 팩은 다른 품질 승인권자가 검토해야 합니다.');
 if(!note.trim())throw Error('검토 의견을 입력하세요.');
 if(decision==='approved'&&r.kind==='pack'&&((r.snapshot as PackSnapshot).aging.result!=='pass'||(r.snapshot as PackSnapshot).final.result!=='pass'||((r.snapshot as PackSnapshot).pack.process_version==='field-v1'&&(r.snapshot as PackSnapshot).casing?.result!=='pass')))throw Error('모든 공정 확인이 합격이어야 품질 승인할 수 있습니다.');
 const now=new Date().toISOString();return {...r,status:decision,reviewed_by:actor,reviewed_name:'체험 승인자',reviewed_at:now,decision_note:note,events:[...(r.events||[]),{id:(r.events?.length||0)+1,request_id:r.id,actor,actor_name:'체험 승인자',action:decision,note,created_at:now}]};
}
export function supersedeDemoRequests(requests:Approval[],packId:string):Approval[]{return requests.map(r=>r.pack_id===packId&&['pending','approved'].includes(r.status)?{...r,status:'superseded',events:[...(r.events||[]),{id:(r.events?.length||0)+1,request_id:r.id,actor:'demo-requester',actor_name:'체험 작업자',action:'superseded',note:'새 검사 기록으로 재검토가 필요합니다.',created_at:new Date().toISOString()}]}:r);}
