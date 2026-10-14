import type {PackSnapshot} from './approvals';
export default function ConfirmationSummary({evidence}:{evidence:PackSnapshot}){
 return <dl className="confirmation-summary" aria-label="공정별 확인 현황">
  <div><dt>셀 등록·매칭</dt><dd>조합 확정 · {evidence.pack.confirmed_name||evidence.pack.created_by||'기존 기록'}</dd></div>
  {[evidence.aging,evidence.final].map(test=><div key={test.id}><dt>{test.kind==='aging'?'에이징 검사':'최종검사'}</dt><dd><span className={`approval-status ${test.result==='pass'?'approved':'rejected'}`}>{test.result==='pass'?'합격':'불합격'}</span> · {test.confirmed_name||test.created_by||'기존 기록'}</dd></div>)}
 </dl>;
}
