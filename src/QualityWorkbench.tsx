import type {Pack,Inspection,Profile} from './lib';
import {canConfirm,canReview} from './permissions';
import {prioritizedWork,independentReview,type ApprovalIndex,type PackSignal} from './workflow';
export default function QualityWorkbench({packs,tests,requests,profile,demo,available,recommendations,onWork,onMatch,onData,onMembers,onApprovals}:{packs:Pack[];tests:Inspection[];requests:ApprovalIndex[]|null;profile:Profile;demo:boolean;available:number;recommendations:number;onWork:(signal:PackSignal)=>void;onMatch:()=>void;onData:()=>void;onMembers:()=>void;onApprovals:()=>void}){
 const work=prioritizedWork(packs,tests,requests,profile,demo),assembly=demo||canConfirm(profile,'assembly');
 return <section className="panel quality-workbench" aria-label="품질 판단 작업대"><div className="section-head"><div><h2>지금 확인할 품질 판단</h2><p>관측된 불합격 → 누락된 근거 → 최종 판단 순서 · 담당 공정 기준</p></div></div>
 <div className="workbench-body">{work.length?<ul className="quality-actions">{work.slice(0,3).map(s=><li key={s.pack.id}><div><strong>{s.pack.serial_no}</strong><p>{s.reason}</p></div><button className={s.failed?'primary':'secondary'} onClick={()=>onWork(s)}>{independentReview(s,profile,demo)?'제출본 검토':s.state==='ready'?'품질 검토 요청':'근거 확인·조치'}</button></li>)}</ul>:<p className="context-line">{profile.role==='admin'&&!demo?'품질 현황을 조회하고 담당자·승인권자를 지정할 수 있습니다.':canReview(profile)?'현재 직접 검토할 팩 제출본이 없습니다.':'현재 담당 범위에서 확인할 팩이 없습니다.'} {requests===null?'승인 상태는 조회 중입니다.':''}</p>}
 {work.length>3&&<p className="context-line">우선순위가 높은 3건을 표시합니다. 나머지는 팩·검사이력에서 확인하세요.</p>}
 {assembly&&<div className="matching-entry"><div><strong>더 나은 8셀 조합 판단</strong><p>{recommendations?`${recommendations}개 추천 조합을 검토할 수 있습니다.`:available>=8?`매칭 가능한 ${available}개 셀에서 후보를 비교하세요.`:'측정값을 등록하면 조합 비교를 시작할 수 있습니다.'} 현재는 SOP·편차 기반 추천입니다.</p></div><button className="primary" onClick={available>=8?onMatch:onData}>{available>=8?'셀 매칭 시작':'측정 데이터 준비'}</button></div>}
 {!demo&&profile.role==='admin'&&<button className="secondary" onClick={onMembers}>담당·승인권 배정 확인</button>}
 {!demo&&canReview(profile)&&<button className="secondary" onClick={onApprovals}>품질·공정 승인함 확인</button>}
 </div></section>;
}
