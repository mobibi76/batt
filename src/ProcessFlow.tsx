import { ArrowRight, CheckCircle2, CircleDot, Database, FlaskConical, Layers3, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import type { Cell } from '../supabase/functions/_shared/matching';
import type { Pack, Inspection } from './lib';
import { inspectionQueues } from './lib';
export default function ProcessFlow({cells,packs,tests,recommendations,onNavigate}:{cells:Cell[];packs:Pack[];tests:Inspection[];recommendations:number;onNavigate:(tab:'cells'|'matching'|'packs'|'quality')=>void}) {
  const aging=new Set(tests.filter(t=>t.kind==='aging').map(t=>t.pack_id));
  const final=new Set(tests.filter(t=>t.kind==='final').map(t=>t.pack_id));
  const {aging:waitAging,final:waitFinal}=inspectionQueues(packs,tests);
  const available=cells.filter(c=>c.status==='available').length;
  const stages=[
    {name:'셀 데이터 등록',owner:'데이터 수집',icon:Database,value:cells.length,unit:'셀',detail:'형식·단위 검증 후 등록',state:cells.length?'등록 완료':'입력 대기',tone:cells.length?'done':'idle',tab:'cells' as const},
    {name:'매칭 준비',owner:'재고 · 기준 확인',icon:ShieldCheck,value:available,unit:'셀',detail:'미사용 셀 / SOP v1',state:available>=8?'추천 가능':'셀 확보 대기',tone:available>=8?'done':'idle',tab:'cells' as const},
    {name:'조합 추천',owner:'매칭 엔진',icon:Sparkles,value:recommendations,unit:'조합',detail:'현재 실행의 미승인 추천',state:recommendations?'승인 대기':'추천 실행 대기',tone:recommendations?'waiting':'idle',tab:'matching' as const},
    {name:'작업자 승인',owner:'생산 담당',icon:UserCheck,value:packs.length,unit:'팩',detail:'셀 8개 ↔ 팩 ID 연결',state:packs.length?'팩 구성 완료':'승인 대기',tone:packs.length?'done':'idle',tab:'packs' as const},
    {name:'에이징 검사',owner:'품질 담당',icon:FlaskConical,value:waitAging,unit:'팩 대기',detail:`에이징 기록 ${aging.size}팩`,state:waitAging?'검사 기록 필요':aging.size?'기록 완료':'팩 대기',tone:waitAging?'waiting':aging.size?'done':'idle',tab:'packs' as const},
    {name:'최종검사',owner:'품질 담당',icon:CheckCircle2,value:waitFinal,unit:'팩 대기',detail:`최종검사 기록 ${final.size}팩`,state:waitFinal?'최종검사 필요':final.size?'기록 완료':'검사 대기',tone:waitFinal?'waiting':final.size?'done':'idle',tab:'packs' as const}
  ];
  return <section className="panel process-panel"><div className="section-head"><div><div className="eyebrow">PROCESS CONTROL</div><h2>한눈에 보는 공정 흐름</h2><p>등록 → 추천 → 승인 → 검사 · 단계를 선택하면 해당 작업으로 이동합니다.</p></div><div className="process-legend"><span><i className="done"/>처리 기록 있음</span><span><i className="waiting"/>작업 대기</span><span><i className="idle"/>진행 전</span></div></div><div className="process-scroll"><div className="process-track">{stages.map((s,i)=><div className="process-stage" key={s.name}><div className="stage-owner">{s.owner}</div><button className={`process-node ${s.tone}`} onClick={()=>onNavigate(s.tab)}><span className="stage-number">0{i+1}</span><s.icon className="icon-22"/><strong>{s.name}</strong><div className="stage-value">{s.value}<small>{s.unit}</small></div><p>{s.detail}</p><span className={`stage-state ${s.tone}`}><CircleDot className="icon-11"/>{s.state}</span></button>{i<stages.length-1&&<div className="process-connector"><ArrowRight className="icon-16"/></div>}</div>)}</div></div><div className="process-feedback"><Layers3 className="icon-15"/><span>팩 ID를 기준으로 모든 검사이력을 연결합니다.</span><span className="feedback-line"/><button onClick={()=>onNavigate('quality')}>품질 리포트로 확인 <ArrowRight className="icon-14"/></button></div><div className="process-caveat">등록 데이터 기준 현황입니다. 설비 실시간 센서 상태가 아니며, 셀 수와 팩 수는 단위가 다릅니다.</div></section>;
}
