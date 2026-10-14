import { ArrowRight, Activity, Link2 } from 'lucide-react';
import { number, qualitySummary, inspectionQueues, type Pack, type Inspection } from './lib';


type Props = { packs: Pack[]; tests: Inspection[]; onNavigate: (tab: 'quality' | 'packs' | 'matching') => void };
export function QualityPriorities({ packs, tests, onNavigate }: Props) {
  const q = qualitySummary(packs, tests);
  return <section className="quality-priorities" aria-label="핵심 품질 지표">
    <article className={`panel outcome-card ${q.failed ? 'needs-attention' : ''}`}>
      <div className="outcome-title"><span className="eyebrow">01 · 품질 성과</span><Activity className="icon-20"/></div>
      <h2>최종검사 불량률</h2>
      <div className="outcome-value">{q.rate === null ? '—' : number(q.rate, 2)}{q.rate !== null && <span>%</span>}</div>
      <p className="outcome-basis">{q.tested ? `불합격 ${number(q.failed)}팩 / 최종검사 ${number(q.tested)}팩` : '최종검사 기록이 없어 아직 집계할 수 없습니다.'}</p>
      <p>팩별 최신 결과 기준 · 재검사 반영 · 초도 불량률과 다름</p>
      <div className="outcome-reference">제안서 목표 2.08% → 1.0% · 실제 개선 여부는 동일 조건의 전후 비교 필요</div>
      <button className="text-button" onClick={() => onNavigate('quality')}>집계 기준·품질 리포트 <ArrowRight className="icon-15"/></button>
    </article>
    <article className="panel outcome-card">
      <div className="outcome-title"><span className="eyebrow">02 · 검사 추적성</span><Link2 className="icon-20"/></div>
      <h2>검사 이력 연결률</h2>
      <div className="outcome-value">{q.linkRate === null ? '—' : number(q.linkRate, 1)}{q.linkRate !== null && <span>%</span>}</div>
      <p className="outcome-basis">{packs.length ? `완전 연결 ${number(q.linked)}팩 / 전체 ${number(packs.length)}팩 · 미연결 ${number(packs.length - q.linked)}팩` : '등록된 팩이 없어 아직 집계할 수 없습니다.'}</p>
      <p>구성 셀 8개 + 에이징 + 최종검사 기록이 모두 있는 팩</p>
      <div className="outcome-reference">합격 여부와 별개인 기록 완전성 지표 · 검사 미완료 팩도 분모에 포함</div>
      <button className="text-button" onClick={() => onNavigate('packs')}>팩별 검사 이력 확인 <ArrowRight className="icon-15"/></button>
    </article>
  </section>;
}

export function WorkQueues({ packs, tests, recommendations, onNavigate }: Props & { recommendations: number }) {
  const queues = inspectionQueues(packs, tests);
  const failed = qualitySummary(packs, tests).failed;
  return <section className="panel work-queues" aria-label="공정별 대기량">
    <div className="section-head"><div><div className="eyebrow">03 · 다음 작업</div><h2>공정별 대기량</h2><p>등록 기록 기준 · 승인 대기 조합은 현재 실행 결과입니다.</p></div></div>
    <div className="queue-grid">{[
      { label: '조합 승인 대기', value: recommendations, unit: '조합', detail: '현재 실행의 미승인 추천', tab: 'matching' as const },
      { label: '에이징 기록 대기', value: queues.aging, unit: '팩', detail: '에이징 기록이 없는 승인 팩', tab: 'packs' as const },
      { label: '최종검사 기록 대기', value: queues.final, unit: '팩', detail: '에이징 기록 있음 · 최종검사 없음', tab: 'packs' as const },
    ].map(item => <button className={`queue-card ${item.value ? 'waiting' : ''}`} key={item.label} onClick={() => onNavigate(item.tab)}>
      <strong>{item.label}</strong><span className="queue-value">{number(item.value)}<small>{item.unit}</small></span><span>{item.detail}</span><span className="queue-link">작업 화면 보기 <ArrowRight className="icon-14"/></span>
    </button>)}</div>
    <div className={`queue-note ${failed ? 'has-failures' : ''}`}><span>최신 최종검사 불합격 <strong>{number(failed)}팩</strong> · 기록 대기량과 별도로 확인하세요.</span><button className="text-button" onClick={() => onNavigate('packs')}>검사 결과 확인 <ArrowRight className="icon-14"/></button></div>
  </section>;
}

export function Throughput({ cells, available, packs, tested }: { cells: number; available: number; packs: number; tested: number }) {
  return <section className="panel throughput-panel" aria-label="누적 처리량">
    <div className="section-head"><div><div className="eyebrow">04 · 업무량</div><h2>누적 처리량</h2><p>전체 등록 기간 기준 · 당일 생산량이나 출하량이 아닙니다.</p></div></div>
    <dl className="throughput-grid">{[
      ['등록 셀', cells, '셀'], ['승인 팩', packs, '팩'], ['최종검사 기록 팩', tested, '팩'],
    ].map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd>{number(Number(value))}<small>{unit}</small></dd></div>)}</dl>
    <p className="throughput-note">현재 매칭 가능 재고 {number(available)}셀 · 처리량은 불량률 개선 성과와 별도로 집계합니다.</p>
  </section>;
}
