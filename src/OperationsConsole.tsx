import ProcessDesignReference from './ProcessDesignReference';
import type {ProcessDesign} from './useProcessDesign';
import {fieldSteps,inspectionNames} from './process';
import UserManual from './manual/UserManual';
import TaskSteps from './TaskSteps';
import FieldConfirmation from './FieldConfirmation';
import {lazy,Suspense,useEffect,useMemo,useState,useRef,type ReactNode} from 'react';
import {metricCohort,metricScopeNames,type MetricScope,qualitySummary,number,type Pack,type Inspection,type Profile} from './lib';
import {packSignal,independentReview,nextInspection,canHandle,type PackFilter,type ApprovalIndex,type PackSignal} from './workflow';
import {canConfirm} from './permissions';
import {fieldLayout,initialSimulation} from './twin/model';
import type {SceneAnnotation} from './twin/TwinScene';
import {modeNames,type Tab,type WorkMode} from './workModes';
import './console.css';
import './twin.css';
import './operational-twin.css';
const TwinScene=lazy(()=>import('./twin/TwinScene'));
export type {WorkMode} from './workModes';
export function signalStage(s:PackSignal):string {
 if(s.pack.pack_cells.length!==8)return 'assembly';
 const next=s.order.find(k=>!s.checks[k]||s.checks[k]?.result==='fail');
 return next==='aging'?'module':next||'final';
}
type Props={taskActions?:ReactNode;processDesign?:ProcessDesign|null;processDesignError?:string;focusedPackId?:string;onOpenPack:(pack:Pack)=>void;sampleView?:ReactNode;onSampleData?:()=>void;onPrivateDemo?:()=>void;privateDemo?:boolean;demoLabel?:string;metricScope:MetricScope;onMetricScope:(scope:MetricScope)=>void;dataFocus?:string;task:Tab;taskTitle:string;children:ReactNode;onLogout:()=>void;onReport:()=>void;active:boolean;mode:WorkMode;onMode:(mode:WorkMode)=>void;profile:Profile;demo:boolean;packs:Pack[];tests:Inspection[];requests:ApprovalIndex[]|null;cells:number;available:number;lastSync:string;syncError:boolean;approvalError:string;onPacks:(filter:PackFilter,scope:MetricScope)=>void;onOpen:(tab:Tab)=>void;onWork:(s:PackSignal)=>void;onRecord:(pack:Pack,kind:Inspection['kind'],result:Inspection['result'],note:string,resultKind?:'measured'|'test')=>Promise<void>};
export default function OperationsConsole(p:Props){
 const fieldRef=useRef<HTMLElement>(null),panelRef=useRef<HTMLElement>(null);
 const [selectedStage,setSelectedStage]=useState('');
 const [chosenId,setChosenId]=useState('');
 const [workQuery,setWorkQuery]=useState('');
 const [fieldCellFocus,setFieldCellFocus]=useState<string>();
 const [recordPack,setRecordPack]=useState<Pack|null>(null);
 const [expanded,setExpanded]=useState(false);
 const [camera,setCamera]=useState<'iso'|'top'>('iso');
 const selectedVersion=p.packs.find(pack=>pack.id===(recordPack?.id||chosenId||p.focusedPackId));
 const design=selectedVersion?(selectedVersion.process_design??null):p.processDesign;
 const layout=useMemo(()=>design?.layout??fieldLayout(),[design]);
 const simulation=useMemo(()=>{const s=initialSimulation(layout);Object.values(s.machines).forEach(m=>m.status='offline');return s;},[layout]);
 const cohort=metricCohort(p.packs,p.tests,p.metricScope),q=qualitySummary(cohort.packs,cohort.tests);
 const signals=useMemo(()=>p.packs.map(pack=>packSignal(pack,p.tests,p.requests)).sort((a,b)=>Number(b.failed)-Number(a.failed)||Number(b.state==='pending')-Number(a.state==='pending')||a.pack.created_at.localeCompare(b.pack.created_at)),[p.packs,p.tests,p.requests]);
 useEffect(()=>{if(p.focusedPackId){setChosenId(p.focusedPackId);setSelectedStage('');setWorkQuery('');}},[p.focusedPackId]);
 const selected=signals.find(s=>s.pack.id===chosenId);
 const searched=workQuery?signals.find(s=>s.pack.serial_no.toLowerCase().includes(workQuery.toLowerCase())):undefined;
 const stageId=searched?signalStage(searched):selected?signalStage(selected):selectedStage|| (signals.find(s=>s.state!=='approved')?signalStage(signals.find(s=>s.state!=='approved')!):'grading');
 const baseStage=fieldSteps.find(s=>s.id===stageId)!;
 const stageDevices=layout.devices.filter(d=>layout.plan?.stations[d.id]?.stage===stageId);
 const stage={...baseStage,name:stageDevices.length?stageDevices.map(d=>d.name).join(' · '):baseStage.name};
 const stageSignals=signals.filter(s=>signalStage(s)===stageId);
 const work=workQuery?signals.filter(s=>s.pack.serial_no.toLowerCase().includes(workQuery.toLowerCase())):stageSignals;
 const current=selected&&work.some(s=>s.pack.id===selected.pack.id)?selected:work[0];
 const recordSignal=signals.find(s=>s.pack.id===recordPack?.id);
 const inspection=current?nextInspection(current,p.profile,p.demo):null;
 const pending=signals.filter(s=>s.state==='pending').length,failed=signals.filter(s=>s.failed).length;
 const openTask=p.task!=='overview',operational=p.mode!=='research';
 const annotations:Record<string,SceneAnnotation>=Object.fromEntries(layout.devices.map((d,i)=>{
 const step=fieldSteps.find(s=>s.id===(layout.plan?.stations[d.id]?.stage??d.id))??fieldSteps[0];
  const at=signals.filter(s=>signalStage(s)===step.id),bad=at.filter(s=>s.failed).length,waiting=at.filter(s=>s.state!=='approved').length;
  return [d.id,{title:`${i+1}. ${d.name}`,detail:step.id==='grading'?`등록 ${p.cells}셀`:step.id==='storage'?`사용 가능 ${p.available}셀`:bad?`불합격 ${bad}팩 · 확인 필요`:step.id==='assembly'&&!at.length?'8셀 조합 준비':step.id==='final'&&pending?`승인 대기 ${pending}팩`:waiting?`다음 작업 ${waiting}팩`:at.length?`검사 완료 ${at.length}팩`:'대기 없음',tone:bad?'attention':waiting?'waiting':'quiet'}];
 }));
 function selectStage(id:string){setSelectedStage(layout.plan?.stations[id]?.stage??id);setChosenId('');setWorkQuery('');setExpanded(false);p.onOpen('overview');if(matchMedia('(max-width:800px)').matches)requestAnimationFrame(()=>panelRef.current?.scrollIntoView({block:'start',behavior:'smooth'}));}
 function selectPack(s:PackSignal){setChosenId(s.pack.id);setSelectedStage(signalStage(s));setWorkQuery('');}
 function switchMode(mode:WorkMode){p.onMode(mode);setExpanded(false);}
 function openCells(focus:string){setFieldCellFocus(focus);p.onOpen('cells');}
 function act(s:PackSignal){setChosenId(s.pack.id);const next=nextInspection(s,p.profile,p.demo);if(p.mode==='field'&&next){setRecordPack(s.pack);return;}if(independentReview(s,p.profile,p.demo)||s.state==='ready'&&canHandle(s,p.profile,p.demo))p.onWork(s);else p.onOpenPack(s.pack);}
 const menu:[Tab,string][]=p.mode==='field'?[['overview','생산 작업'],['cells','셀 검사·재고'],['matching','8셀 조합'],['packs','팩 진행 이력']]:p.mode==='control'?[['overview','품질 현황'],['packs','검사·조치 이력'],['approvals','품질 승인'],['quality','분석·보고']]:[['overview','연구 개요'],['twin','공정 설계·시뮬레이션'],['research','데이터·AI 검증']];
 const taskView=<div className="console-task-view"><div className="console-task-heading"><button className="text-button" onClick={()=>{p.onOpen('overview');setExpanded(false);}}>{modeNames[p.mode]} 홈</button><h2>{p.taskTitle}</h2>{p.taskActions&&<div className="console-task-tools">{p.taskActions}</div>}{operational&&<button className="text-button workspace-expand" onClick={()=>setExpanded(v=>!v)}>{expanded?'공정과 함께 보기':'작업 크게 보기'}</button>}</div><div className="console-task-body">{['cells','matching','quality'].includes(p.task)?<TaskSteps key={p.task} focus={p.task==='cells'?(fieldCellFocus||p.dataFocus):undefined} initial={p.task==='cells'?'측정 파일로 시작하세요':undefined}>{p.children}</TaskSteps>:p.children}</div></div>;
 const context=<div className="floor-context console-home-body">
  <header className="floor-context-heading"><button className="text-button floor-return" onClick={()=>fieldRef.current?.scrollIntoView({block:'start',behavior:'smooth'})}>공정 전체 보기 ↑</button><span className="floor-eyebrow">{p.mode==='field'?'생산 작업':'품질 확인'} · {fieldSteps.findIndex(s=>s.id===stageId)+1} / 6 공정</span><h2>{stage.name}</h2><p>{stage.detail}</p></header>
  <ProcessDesignReference design={current?current.pack.process_design:design} stage={stageId}/>{p.processDesignError&&<p className="notice">{p.processDesignError}</p>}{p.approvalError&&<p className="notice" role="status">승인 상태 조회 실패 · 승인을 진행하기 전에 다시 확인하세요.</p>}
  {p.requests===null&&!p.approvalError&&<p role="status">승인 상태 조회 중</p>}
  <div className="floor-stage-work">
  {stageId==='grading'||stageId==='storage'?<><h3>{stageId==='grading'?'측정 자료를 확인하세요':'사용할 셀을 확인하세요'}</h3><p>{stageId==='grading'?`등록된 셀 ${p.cells}개 · 충방전 측정 자료의 누락과 오류를 확인합니다.`:`사용 가능한 셀 ${p.available}개 · 용량과 출처를 확인하고 조합합니다.`}</p><button className="primary" onClick={()=>openCells(stageId==='grading'?(p.cells?'고객 자료 검토':'측정 파일로 시작하세요'):'셀 재고')}>{stageId==='grading'?(p.cells?'충방전 자료 검토':'측정 파일 등록 시작'):'셀 재고 확인'}</button>{(p.demo||canConfirm(p.profile,'assembly'))&&<button className="text-button" onClick={()=>{setSelectedStage('assembly');p.onOpen('matching');}}>셀 매칭 시작</button>}</>:stageId==='assembly'?<><h3>기준을 통과하는 8셀 팩을 구성합니다</h3><p>용량차 ≤500mAh · 전압차 ≤10mV. 통과 팩 수를 우선해 후보를 비교합니다.</p><button className="primary" onClick={()=>p.onOpen('matching')}>셀 매칭 시작</button></>:null}
  {current&&<section className={`console-target ${current.failed?'attention':''}`} aria-label="선택한 팩"><span className="floor-eyebrow">지금 확인할 팩</span><h3>{current.pack.serial_no}</h3><strong>{current.reason}</strong><p>{current.pack.process_version!=='field-v1'&&'기존 공정 기록 · '}{current.order.map(k=>`${inspectionNames[k]} ${current.checks[k]?.result==='pass'?'완료':current.checks[k]?.result==='fail'?'불합격':'기록 없음'}`).join(' · ')}</p><div className="console-target-action"><button className="primary" onClick={()=>act(current)}>{p.mode==='field'&&inspection?'검사 확인·기록':independentReview(current,p.profile,p.demo)?'제출본 검토':current.state==='ready'&&canHandle(current,p.profile,p.demo)?'품질 검토 요청':'팩 근거 확인'}</button><button className="text-button" onClick={()=>{setChosenId(current.pack.id);p.onOpenPack(current.pack);}}>셀 구성·검사 이력</button></div></section>}
  {!current&&!['grading','storage','assembly'].includes(stageId)&&<p className="floor-empty">이 공정에서 확인할 팩이 없습니다. 3D 현장에서 다른 공정을 선택하세요.</p>}
  <div className="floor-pack-list"><label>팩 찾기<input aria-label="담당 팩 번호 찾기" placeholder="팩 번호로 전체 공정 검색" value={workQuery} onChange={e=>{setWorkQuery(e.target.value);setChosenId('');}}/></label>{workQuery&&!work.length&&<p>검색한 팩이 없습니다.</p>}{work.length>1&&<><h3>{workQuery?'검색 결과':'이 공정의 작업물'} · {work.length}팩</h3><ul>{work.slice(0,12).map(s=><li key={s.pack.id}><button className="floor-pack-row" aria-pressed={current?.pack.id===s.pack.id} onClick={()=>selectPack(s)}><strong>{s.pack.serial_no}</strong><span className={s.failed?'floor-failure':''}>{s.reason}</span></button></li>)}</ul>{work.length>12&&<button className="text-button" onClick={()=>p.onPacks(stageId==='module'?'module':stageId==='casing'?'casing':stageId==='final'?'final':'all',p.metricScope)}>전체 팩 이력에서 찾기</button>}</>}</div>
  </div>
  {p.mode==='control'&&<section className="console-quality-summary floor-quality-links" aria-label="운영 판단 요약"><h3>품질 근거 확인</h3><small>{metricScopeNames[p.metricScope]}</small><button onClick={()=>p.onPacks('final_failed',p.metricScope)}><span>최종 불량률</span><strong>{q.rate===null?'—':number(q.rate,1)+'%'}</strong></button><button onClick={()=>p.onPacks('unlinked',p.metricScope)}><span>검사 연결률</span><strong>{q.linkRate===null?'—':number(q.linkRate,1)+'%'}</strong><small>{q.linked}/{cohort.packs.length}팩</small></button><button onClick={()=>p.onPacks('final_recorded',p.metricScope)}><span>처리량 · 누적</span><strong>{q.tested}팩</strong></button></section>}
 </div>;
 return <section className={`operations-console floor-console ${operational?'is-operational':''} ${p.sampleView?'sample-open':''}`} aria-label="생산·품질·연구 작업대">
  <header className="console-header"><strong>주성산업 <small>공정 관제</small></strong><div className="console-mode" aria-label="업무 모드">{(['field','control','research'] as const).map(mode=><button key={mode} disabled={!!recordPack||!!p.sampleView} aria-pressed={p.mode===mode} onClick={()=>switchMode(mode)}>{modeNames[mode]}</button>)}</div></header>
  <div className={`console-source ${p.syncError?'stale':''}`} role="status">{p.demo?p.demoLabel||'합성 기록 체험':p.syncError?'갱신 실패 · 이전 조회본':p.lastSync?`기록 조회 ${p.lastSync}`:'기록 조회 중'} · {metricScopeNames[p.metricScope]} · 장비 신호 미연결</div>
  <nav className="console-tabs" aria-label="작업 선택">{menu.map(([id,label])=><button key={id} disabled={!!recordPack||!!p.sampleView} aria-pressed={p.task===id} onClick={()=>{p.onOpen(id);setExpanded(false);}}>{label}</button>)}</nav>
  <div className={`console-content ${p.sampleView?'sample-workspace-hidden':''}`}>
   {operational?<div className={`operational-workspace ${openTask?'has-task':''} ${recordPack?'has-record':''} ${expanded?'expanded':''}`}>
    <section ref={fieldRef} className="floor-scene console-scene" aria-label="공유 현장"><div className="floor-briefing"><h1>현장을 보고, 작업을 이어갑니다</h1><p>전체 등록 기록 · {signals.filter(s=>s.state!=='approved').length}팩 후속 작업{failed>0&&<> · <button className="floor-attention" disabled={!!recordPack} onClick={()=>selectPack(signals.find(s=>s.failed)!)}>불합격 {failed}팩 확인</button></>}{pending>0&&<> · <button className="text-button" disabled={!!recordPack} onClick={()=>selectPack(signals.find(s=>s.state==='pending')!)}>승인 대기 {pending}팩</button></>}</p></div>
    <div className="floor-scene-body"><Suspense fallback={<p>현장 공정 준비 중</p>}><TwinScene layout={layout} simulation={simulation} selected={layout.devices.find(d=>(layout.plan?.stations[d.id]?.stage??d.id)===stageId)?.id??stageId} annotations={annotations} disabled={!!recordPack} editing={false} running={false} view={camera} onSelect={id=>{if(!recordPack)selectStage(id);}} onMove={()=>{}}/></Suspense></div>
    <footer className="floor-scene-caption"><span>{design?`승인 공정: ${design.title} · ${selectedVersion?'선택 팩의 고정 버전':'신규 팩 적용 기준'}`:'기존 공정 기준 · 개념 배치'}</span><button className="text-button" onClick={()=>setCamera(v=>v==='iso'?'top':'iso')}>{camera==='iso'?'위에서 보기':'입체로 보기'}</button></footer></section>
    <aside ref={panelRef} className="floor-work-panel" aria-label="선택 공정 업무">{recordPack?<FieldConfirmation key={recordPack.id} pack={recordPack} profile={p.profile} demo={p.demo} initialKind={recordSignal?nextInspection(recordSignal,p.profile,p.demo)||undefined:undefined} onRecord={p.onRecord} onClose={()=>setRecordPack(null)}/>:openTask?taskView:context}</aside>
   </div>:openTask?taskView:<section className="research-home console-home-body"><h2>공정 효율과 8셀 조합을 검토합니다</h2><p>생산·품질 자료로 공정을 설계하고, 조합과 수명·안전성 연구를 준비하세요.</p><div className="research-entry-grid"><article><h3>공정 설계·시뮬레이션</h3><p>장비별 수집 항목을 정하고 작업시간·병목을 비교하세요. 승인한 공정은 신규 팩에 적용됩니다.</p><button className="primary" onClick={()=>p.onOpen('twin')}>공정 설계 시작</button></article><article><h3>데이터·AI 검증</h3><p>8셀 조합: 측정값·작업자 판단을 연결하고 조합을 비교합니다. 수명·안전성: 연구 문헌과 필요 데이터 항목을 등록하고 부족한 자료를 확인합니다.</p><button className="primary" onClick={()=>p.onOpen('research')}>데이터·AI 연구 시작</button></article></div><aside><strong>주성산업의 연구 방향</strong><p>목표는 현장 판단을 학습한 8셀 조합과 팩 수명·안전성 추론입니다. 현재는 데이터 준비 확인과 고정 알고리즘 비교를 제공합니다. 학습 모델과 검증된 팩 추론은 아직 없습니다.</p></aside></section>}
  </div>
  {p.sampleView&&<div className="console-content">{p.sampleView}</div>}
  <footer className="console-footer"><div className="console-task-actions">{!p.sampleView&&p.profile.role==='admin'&&<button className="text-button" onClick={()=>p.onOpen('members')}>권한 관리</button>}{p.onSampleData&&<button className="text-button" onClick={p.onSampleData}>샘플 데이터</button>}{p.onPrivateDemo&&<button className="text-button" onClick={p.onPrivateDemo}>고객 데이터 체험</button>}<button className="text-button" onClick={p.onLogout}>{p.privateDemo?'체험 종료':'로그아웃'}</button></div></footer>
  <UserManual context={p.sampleView?'sample':recordPack?'inspection':openTask?p.task:p.mode==='research'?'research':p.mode==='field'?'field':'quality'}/>
 </section>;
}
