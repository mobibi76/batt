import type {Pack,Inspection,Profile} from './lib';
import type {Approval} from './approvals';
import {latestInspection} from './approvals';
import {canConfirm,canReview,canSubmit} from './permissions';
export type ApprovalIndex=Pick<Approval,'id'|'kind'|'pack_id'|'status'|'submitted_by'|'submitted_at'>;
export const packFilters={all:'전체 팩',failed:'불합격 확인',unlinked:'검사 이력 미연결',aging:'에이징 기록 대기',final:'최종검사 기록 대기',ready:'품질 검토 요청 가능',pending:'최종 승인 대기',approved:'품질 승인 완료'} as const;
export type PackFilter=keyof typeof packFilters;
export function packSignal(pack:Pack,tests:Inspection[],requests:ApprovalIndex[]|null){
 const aging=latestInspection(tests,pack.id,'aging'),final=latestInspection(tests,pack.id,'final');
 const linked=pack.pack_cells.length===8&&!!aging&&!!final,failed=aging?.result==='fail'||final?.result==='fail';
 const request=requests?.filter(r=>r.pack_id===pack.id&&['pending','approved'].includes(r.status)).sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at)||b.id.localeCompare(a.id))[0];
 const state=failed?'failed':!linked?(!aging?'aging':!final?'final':'unlinked'):requests===null?'unknown':request?.status==='approved'?'approved':request?.status==='pending'?'pending':'ready';
 const reason=aging?.result==='fail'?'에이징 불합격':final?.result==='fail'?'최종검사 불합격':state==='unknown'?'승인 상태 조회 필요':packFilters[state as PackFilter];
 return {pack,aging,final,linked,failed,request,state,reason};
}
export type PackSignal=ReturnType<typeof packSignal>;
/** Select the unresolved inspection the operator can actually perform. Never imply approval. */
export function nextInspection(signal:PackSignal,profile:Profile,demo=false):Inspection['kind']|null{
 for(const kind of ['aging','final'] as const){
  if((demo||canConfirm(profile,kind))&&(!signal[kind]||signal[kind]?.result==='fail'))return kind;
 }
 return null;
}
export function independentReview(signal:PackSignal,profile:Profile,demo=false){return signal.request?.status==='pending'&&(demo||(canReview(profile)&&![signal.pack.created_by,signal.aging?.created_by,signal.final?.created_by,signal.request.submitted_by].includes(profile.id)));}
export function matchesPack(signal:PackSignal,filter:PackFilter){return filter==='all'||(filter==='failed'?signal.failed:filter==='unlinked'?!signal.linked:filter==='aging'?!signal.aging:filter==='final'?!!signal.aging&&!signal.final:filter==='pending'?signal.request?.status==='pending':signal.state===filter);}
export function canHandle(signal:PackSignal,profile:Profile,demo=false){
 if(demo)return signal.state!=='approved'&&signal.state!=='unknown';
 if(independentReview(signal,profile))return true;
 if(signal.state==='failed')return (signal.aging?.result==='fail'&&canConfirm(profile,'aging'))||(signal.final?.result==='fail'&&canConfirm(profile,'final'));
 if(signal.state==='aging'||signal.state==='final')return canConfirm(profile,signal.state);
 if(signal.state==='ready')return canSubmit(profile);
 if(signal.state==='pending')return canReview(profile)&&![signal.pack.created_by,signal.aging?.created_by,signal.final?.created_by,signal.request?.submitted_by].includes(profile.id);
 return false;
}
export function prioritizedWork(packs:Pack[],tests:Inspection[],requests:ApprovalIndex[]|null,profile:Profile,demo=false){
 const priority:Record<string,number>={failed:0,aging:1,final:1,unlinked:1,pending:2,ready:3,unknown:4,approved:5};
 return packs.map(p=>packSignal(p,tests,requests)).filter(s=>canHandle(s,profile,demo)).sort((a,b)=>priority[a.state]-priority[b.state]||a.pack.created_at.localeCompare(b.pack.created_at)||a.pack.id.localeCompare(b.pack.id));
}
export function firstPassSummary(packs:Pack[],tests:Inspection[]){
 const ids=new Set(packs.map(p=>p.id));const first=new Map<string,Inspection>();
 [...tests].filter(t=>t.kind==='final'&&ids.has(t.pack_id)).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)).forEach(t=>{if(!first.has(t.pack_id))first.set(t.pack_id,t);});
 const failed=[...first.values()].filter(t=>t.result==='fail').length;return {tested:first.size,failed,rate:first.size?100*failed/first.size:null};
}
