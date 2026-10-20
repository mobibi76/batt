import {useState} from 'react';
import type {Tab} from './workModes';
import type {PrivateDataset} from './demoData';
import './customer-tutorial.css';

const steps: {title:string;task:Tab;action:string;check:string;doc:string;automatic?:'pack'|'inspection'|'research'}[] = [
 {title:'고객 자료 살펴보기',task:'cells',action:'‘고객 자료 검토’에서 원본 자료와 사용할 수 없는 셀의 이유를 확인하세요. ‘샘플 데이터’를 열어 고객이 제공한 값과 실습용으로 채운 값을 구분해 보세요.',check:'전압과 용량은 고객이 제공한 값입니다. 내부저항 0.42 mΩ와 셀 번호(ID)·묶음 번호(LOT)·시험 시각은 실습용으로 넣었습니다. 원본에 없던 값을 실제로 측정한 것은 아닙니다.',doc:'sample'},
 {title:'생산 · 셀 8개로 팩 만들기',task:'matching',action:'‘조합 추천’을 누르고, 추천된 셀 8개의 측정값 차이를 살펴보세요. ‘조합 검토 · 확정’에서 선택한 이유와 팩 일련번호를 입력해 팩 1개를 만드세요.',check:'전압 차이 10 mV, 용량 차이 500 mAh 조건을 만족해도 검사에 합격한 것은 아닙니다. 추천 결과가 없으면 ‘셀 재고’에서 사용이 보류된 셀과 그 이유를 확인하고, 추천 조건도 살펴보세요.',doc:'matching',automatic:'pack'},
 {title:'생산 · 검사 결과 남기기',task:'packs',action:'만든 팩의 ‘상세 조회’를 열어 검사 결과와 이유를 입력하세요. 모듈 검사 → 케이싱 → 최종검사 순서로 진행합니다. 불합격인 경우에는 조치 내용을 적고 다시 검사해 보세요.',check:'검사 결과를 1건 이상 저장하면 다음 실습으로 갈 수 있습니다. 아직 모든 공정을 마쳤거나 품질 승인을 받은 것은 아닙니다.',doc:'inspection',automatic:'inspection'},
 {title:'품질 · 검사 결과 확인하기',task:'quality',action:'‘품질 리포트’에서 어떤 검사 결과가 집계됐는지 확인하세요. 이어서 ‘품질·공정 승인함’에서 승인에 필요한 검사와 검토 조건을 살펴보세요.',check:'처음 검사한 결과와 가장 최근 결과를 구분해 보세요. 같은 팩을 여러 번 검사할 수 있으므로 검사 건수와 팩 수는 다를 수 있습니다. 직접 제출하거나 공정 확인에 참여한 팩은 다른 승인 담당자가 검토해야 합니다. 실습 결과는 고객의 실제 불량률이나 개선 성과가 아닙니다.',doc:'quality'},
 {title:'연구 · 셀 조합 비교하기',task:'research',action:'‘현재 측정·판정 자료 가져오기’를 누르세요. ‘2. 비교 조건’에서 실습용 값도 포함할지 확인한 뒤 ‘알고리즘 비교 실행’을 누르세요. 결과에서 추천된 셀 8개와 측정값 차이를 비교해 보세요.',check:'생산 실습에서 만든 팩과 검사 기록도 함께 가져옵니다. 비교에 사용할 수 있는 셀이 8개 이상 있어야 합니다. 정해진 계산 방법을 비교하는 실습이며, AI를 학습시키거나 배터리 수명·안전성을 예측하는 기능은 아닙니다.',doc:'research',automatic:'research'},
 {title:'연구 · 작업 순서와 시간 살펴보기',task:'twin',action:'‘공정 설계’에서 장비별로 모을 데이터와 작업 순서를 살펴보세요. ‘시뮬레이션’에서 목표 수량과 작업시간을 바꿔 보세요. 전체 소요 시간과 작업이 오래 걸리는 곳이 어떻게 달라지는지 확인하세요.',check:'표시된 시간은 입력한 조건으로 계산한 예상 시간입니다. 실제 장비에서 측정한 시간은 아닙니다. ‘데이터·AI 검증’의 연구 문헌에서는 수명·안전성 연구를 위해 어떤 데이터를 더 측정해야 하는지도 살펴볼 수 있습니다.',doc:'twin'},
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
  {!collapsed&&(finished?<div><h2>생산·품질·연구 실습을 마쳤습니다</h2><p>자료 {dataset.intake.rows.length}행으로 실습했습니다. 현재 팩 {packCount}개 · 검사 {inspectionCount}건 · 연구 비교 {researchDone?'실행 완료':'미실행'} 상태입니다. 실습 결과는 실제 운영에 저장되지 않으며 체험을 종료하면 삭제됩니다.</p><p>화면의 버튼이나 입력 방법이 궁금하면 ‘사용 안내’를 여세요. 자세한 순서와 문제 해결 방법은 DOCS(전체 매뉴얼)에서 볼 수 있습니다.</p><div className="tutorial-actions"><a href="#docs/field">생산 DOCS</a><a href="#docs/quality">품질 DOCS</a><a href="#docs/research">연구 DOCS</a><button className="secondary" onClick={()=>{setIndex(0);onOpen('cells');}}>처음부터 다시 살펴보기</button><button className="primary" onClick={onFinish}>자유 체험으로 이어가기</button></div></div>:<div>
   <p>{step.action}</p><details><summary>이 단계에서 알아둘 점</summary><p>{step.check}</p><p>전체 자료 {dataset.intake.rows.length}행 중 비교에 쓸 수 있는 자료는 {dataset.verification.valid}행이고, 확인이 더 필요한 자료는 {dataset.verification.held}행입니다. 실습 중 바꾼 내용은 실제 운영에 저장되지 않습니다.</p></details>
   {step.automatic?<p role="status">{ready?'완료했습니다. ‘다음 실습’을 눌러 주세요.':step.automatic==='pack'?'팩 1개를 만들면 다음 실습으로 갈 수 있습니다.':step.automatic==='inspection'?'검사 결과를 1건 저장하면 다음 실습으로 갈 수 있습니다.':'알고리즘 비교를 실행하면 다음 실습으로 갈 수 있습니다.'}</p>:<label><input type="checkbox" checked={confirmed.includes(index)} onChange={e=>setConfirmed(e.target.checked?[...confirmed,index]:confirmed.filter(i=>i!==index))}/> 안내에 따라 화면을 살펴봤습니다</label>}
   <div className="tutorial-actions"><button className="secondary" disabled={!index} onClick={()=>{setIndex(index-1);onOpen(steps[index-1].task);}}>이전 실습</button><button className="secondary" onClick={()=>onOpen(step.task)}>실습 화면으로</button><button className="primary" disabled={!ready} onClick={next}>{index===steps.length-1?'실습 마무리':'다음 실습'}</button><a href={`#docs/${step.doc}`}>자세한 설명 (DOCS)</a><a href="#docs/tutorial">튜토리얼 사용법</a></div>
  </div>)}
 </section>;
}
