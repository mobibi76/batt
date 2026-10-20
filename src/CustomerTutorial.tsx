import {useState} from 'react';
import type {Tab} from './workModes';
import type {PrivateDataset} from './demoData';
import './customer-tutorial.css';

const steps: {title:string;task:Tab;action:string;check:string;doc:string;automatic?:'pack'|'inspection'|'research'}[] = [
 {title:'고객 자료 이해',task:'cells',action:'고객 자료 검토에서 원행·보류 사유를 살펴보고, 샘플 데이터에서 제공값과 시험 보완값을 비교하세요.',check:'전압·용량은 고객 제공값입니다. 내부저항 0.42 mΩ, ID·LOT·시험 시각은 보완값이며 원본의 결측을 대체한 실측값이 아닙니다.',doc:'sample'},
 {title:'생산 · 8셀 팩 구성',task:'matching',action:'조합 추천을 실행하고 후보의 8셀과 편차를 검토하세요. 조합 검토 사유와 팩 일련번호를 입력해 팩 1개를 구성하세요.',check:'전압차 10 mV·용량차 500 mAh 조건 충족과 검사 합격은 별개입니다. 후보가 없으면 셀 재고의 보류 상태와 추천 조건을 확인하세요.',doc:'matching',automatic:'pack'},
 {title:'생산 · 검사 기록',task:'packs',action:'구성한 팩의 검사 기록에서 모듈 검사 → 케이싱 → 최종검사 순으로 시험 결과와 사유를 기록하세요. 불합격이면 조치 후 재검사 이력을 남겨보세요.',check:'최소 1건의 시험 검사 기록이 있으면 다음 실습으로 이동할 수 있습니다. 이는 전체 공정 완료나 품질 승인을 뜻하지 않습니다.',doc:'inspection',automatic:'inspection'},
 {title:'품질 · 근거 추적',task:'quality',action:'품질 리포트에서 시험 자료 범위와 검사 연결을 확인하세요. 품질·공정 승인함에서는 승인에 필요한 검사와 독립 검토 조건을 살펴보세요.',check:'초도·최신 결과와 검사 건수·팩 수를 구분하세요. 실습 중 만든 결과를 고객의 실제 불량률이나 개선 성과로 해석하지 않습니다.',doc:'quality'},
 {title:'연구 · 같은 데이터로 비교',task:'research',action:'현재 측정·판정 자료 가져오기를 누르세요. 시험 보완값 포함 여부를 확인한 뒤 비교 조건에서 실행하고, 검증 결과의 8셀 후보와 편차를 살펴보세요.',check:'생산에서 만든 팩과 검사도 함께 가져옵니다. 고정 알고리즘 비교이며 모델 학습·수명·안전성 예측이 아닙니다. 8개 이상 비교 가능한 셀이 필요합니다.',doc:'research',automatic:'research'},
 {title:'연구 · 공정과 추가 데이터',task:'twin',action:'공정 설계에서 장비별 확보 데이터와 작업 순서를 살펴보세요. 시뮬레이션에서 목표 수량·작업시간을 바꿔 완료시간과 병목을 비교하세요.',check:'시뮬레이션 시간은 입력 조건에 따른 추정입니다. 데이터·AI 검증의 연구 문헌에서 수명·안전성 연구에 추가로 필요한 측정 항목도 확인하세요.',doc:'twin'},
];

export default function CustomerTutorial({dataset,packCount,inspectionCount,researchDone,onOpen,onFinish}:{
 dataset:PrivateDataset;packCount:number;inspectionCount:number;researchDone:boolean;onOpen:(tab:Tab)=>void;onFinish:()=>void;
}){
 const [index,setIndex]=useState(0),[confirmed,setConfirmed]=useState<number[]>([]),[collapsed,setCollapsed]=useState(false);
 const step=steps[index],finished=index===steps.length;
 const ready=finished||(!step.automatic?confirmed.includes(index):step.automatic==='pack'?packCount>0:step.automatic==='inspection'?inspectionCount>0:researchDone);
 function next(){if(!ready)return;setIndex(index+1);if(index+1<steps.length)onOpen(steps[index+1].task);}
 return <section className="customer-tutorial" aria-label="고객 데이터 튜토리얼">
  <div className="tutorial-heading"><strong>{finished?'튜토리얼 마무리':`${index+1} / ${steps.length} · ${step.title}`}</strong><button className="text-button" aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}>{collapsed?'튜토리얼 펼치기':'튜토리얼 접기'}</button></div>
  {!collapsed&&(finished?<div><h2>고객 자료에서 생산·품질·연구까지</h2><p>자료 {dataset.intake.rows.length}행으로 시작해 현재 팩 {packCount}개 · 검사 {inspectionCount}건 · 연구 비교 {researchDone?'실행 완료':'미실행'}를 확인했습니다. 체험 결과는 운영에 반영되지 않으며 종료 시 삭제됩니다.</p><p>이제 각 작업의 ‘사용 안내’로 화면 설명을 확인하고, DOCS에서 절차와 예외를 찾아보세요.</p><div className="tutorial-actions"><a href="#docs/field">생산 DOCS</a><a href="#docs/quality">품질 DOCS</a><a href="#docs/research">연구 DOCS</a><button className="secondary" onClick={()=>{setIndex(0);onOpen('cells');}}>처음부터 다시 살펴보기</button><button className="primary" onClick={onFinish}>자유 체험으로 이어가기</button></div></div>:<div>
   <p>{step.action}</p><details><summary>판단할 때 확인할 점</summary><p>{step.check}</p><p>시작 자료 {dataset.intake.rows.length}행 · 비교 가능 {dataset.verification.valid}행 · 보류 {dataset.verification.held}행. 모든 실습 변경은 현재 체험에서만 유지됩니다.</p></details>
   {step.automatic?<p role="status">{ready?'실행 확인 완료':step.automatic==='pack'?'팩 구성 대기':step.automatic==='inspection'?'시험 검사 기록 대기':'연구 비교 실행 대기'}</p>:<label><input type="checkbox" checked={confirmed.includes(index)} onChange={e=>setConfirmed(e.target.checked?[...confirmed,index]:confirmed.filter(i=>i!==index))}/> 직접 살펴보고 판단 근거를 확인했습니다</label>}
   <div className="tutorial-actions"><button className="secondary" disabled={!index} onClick={()=>{setIndex(index-1);onOpen(steps[index-1].task);}}>이전 실습</button><button className="secondary" onClick={()=>onOpen(step.task)}>실습 화면으로</button><button className="primary" disabled={!ready} onClick={next}>{index===steps.length-1?'실습 마무리':'다음 실습'}</button><a href={`#docs/${step.doc}`}>관련 DOCS</a></div>
  </div>)}
 </section>;
}
