import {useMemo,useState} from 'react';
import type {EvidenceCell} from '../supabase/functions/_shared/evidence';
import {fieldCriteria,planFieldGroups} from './fieldCriteria';
import {download,number} from './lib';

export function FieldProcessReference(){return <details className="progressive"><summary>실제 공정과 품질 기준 확인 · 2026-10-16</summary>
 <ol>{fieldCriteria.process.map(p=><li key={p}>{p}</li>)}</ol>
 <p>충방전·모듈·최종검사에서 데이터를 수집합니다. 새 팩은 모듈 검사 → 케이싱 → 최종검사 순으로 기록합니다. 기존 팩의 에이징 기록은 유지합니다.</p>
 <p>조합 기준은 용량 차 500mAh 이하, 초기 전압(OCV) 차 10mV 이하입니다. 내부저항은 참고 항목입니다. 원자료에 없으므로 다른 전압값으로 대신하지 않습니다.</p>
 <p>확인 필요: {fieldCriteria.unresolved.join(' / ')}. 검사 합격과 승인 기록만으로 출하 규격 충족을 자동 판단하지 않습니다.</p>
<h4>추가로 알고 싶은 정보 · 안정성과 수명</h4><p>목표는 기준을 통과하는 팩을 많이 만드는 것입니다. 안전성과 수명을 알려면 반복 충방전·온도·사용·고장 기록이 더 필요합니다. 현재 자료만으로는 예측하지 않습니다.</p>
 <small>근거: PoC_셀매칭_결과.xlsx 1_결과요약 A9·A14·A16, 소상공인_AI_지원과제_개발_회의록_261016.docx 공정 데이터 현황·미결 사항.</small>
 </details>;}

export default function FieldCriteriaReview({rows,context}:{rows:EvidenceCell[];context:{id:string;revision:number;file_hash:string;source_kind:string}}){
 const [target,setTarget]=useState(500);
 const plan=useMemo(()=>rows.length<=500?planFieldGroups(rows,target):null,[rows,target]);
 return <div className="evidence-body"><h3>통과 팩 수를 우선하는 8셀 편성 검토</h3><FieldProcessReference/>
 <p>AO열 Cutoff Cap(방전용량)을 기준으로 측정 완료·검토 가능 셀을 동일 LOT별로 편성합니다. 개별 셀의 절대 용량 합격 범위는 별도 확인 사항입니다. LOT 미확인 셀은 배치 내 비교에만 사용합니다.</p>
 <label>용량 차 검토 목표 (mAh)<select value={target} onChange={e=>setTarget(Number(e.target.value))}><option value={50}>50 · 현장 관행 검토</option><option value={100}>100 · 현장 관행 검토</option><option value={500}>500 · PoC 허용 범위</option></select></label>
 <p>50·100mAh는 회의에서 언급된 조합 관행의 비교값입니다. 모든 후보에 OCV 차 ≤10mV를 함께 적용합니다. 50·100mAh 선택은 생산 SOP의 500mAh 한계값을 변경하지 않습니다.</p>
 {!plan?<p>500셀 이하 배치로 비교하세요.</p>:<><p>전체 {rows.length}셀 / 검토 가능 {plan.eligible}셀 / 보류·미완료·사용 완료 등 제외 {plan.excluded.length}셀 / 후보 {plan.groups.length}팩 ({plan.groups.length*8}셀) / 미배정 {plan.unused.length}셀</p>
 <p>최대 5가지 탐색 결과 중 통과 팩 수가 많은 편성을 선택하고, 동률은 편차 합으로 비교합니다. 전역 최대 팩 수는 보장하지 않습니다. 미배정은 불량 판정이 아닙니다. 평균·최소 용량은 구성 셀의 참고 통계입니다. 현행 업체 업무를 재현하는 비교이며 공정 타당성 평가는 별도입니다.</p>
 <div className="table-wrap"><table><thead><tr><th>후보 / LOT</th><th>셀 채널 8개</th><th>용량 차 mAh</th><th>OCV 차 mV</th><th>셀 평균 / 최소 mAh</th><th>PoC 조합</th></tr></thead><tbody>{plan.groups.map((g,i)=><tr key={g.ids.join(',')}><td>{i+1} / {g.lot||'미확인'}</td><td>{g.channels.join(', ')}</td><td>{number(g.capacitySpread!,3)}</td><td>{number(g.voltageSpread!,3)}</td><td>{number(g.meanCapacity!,2)} / {number(g.minCapacity!,2)}</td><td>두 항목 충족 · 용량·전압 충족</td></tr>)}</tbody></table></div>
 <details><summary>미배정·제외 셀</summary><p>미배정: {plan.unused.join(', ')||'없음'}</p><p>제외: {plan.excluded.join(', ')||'없음'}</p></details>
 <button className="secondary" onClick={()=>download('현장_8셀_편성검토.json',JSON.stringify({context,criteria:fieldCriteria,plan,scope:'브라우저 검토 계산. 생산 재고 배정·품질 승인·출하 승인 아님.',input:rows},null,2),'application/json')}>현장 편성 검토 근거 내보내기</button></>}
 </div>;
}
