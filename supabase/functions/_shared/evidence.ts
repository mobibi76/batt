import {packByYield} from './packing.ts';
import {SOP} from './sop.ts';
// Measured values remain nullable. No synthetic replacement for missing resistance.
export type SourceKind = 'measured' | 'reconstructed' | 'synthetic' | 'unknown';
export type EvidenceCell = { field_origins?:Partial<Record<string,'provided'|'supplemented'|'synthetic'>>; row_no:number; lot?:string|null; id:string; channel:string; voltage_mv:number|null; resistance_mohm:number|null; capacity_mah:number|null; measured_at:string|null; issues:string[]; state:'ready'|'held'|'retest'|'used'; raw?:unknown };
export const evidenceKeys = SOP.dimensions;
export const evidenceLimits = SOP.limits;
export function range(rows:EvidenceCell[],key:typeof evidenceKeys[number]):number|null {
 const values=rows.map(r=>r[key]);
 return values.some(v=>v===null)?null:Number((Math.max(...values as number[])-Math.min(...values as number[])).toFixed(5));
}
export function assess(rows:EvidenceCell[]) {
 const spreads=Object.fromEntries(evidenceKeys.map(k=>[k,range(rows,k)])) as Record<typeof evidenceKeys[number],number|null>;
 const failed=SOP.requiredDimensions.filter(k=>spreads[k]!==null&&spreads[k]!>evidenceLimits[k]);
 const missing=SOP.requiredDimensions.filter(k=>spreads[k]===null);
 return {spreads,failed,missing,status:failed.length?'fail':missing.length?'unverified':'pass'};
}
function quantile(xs:number[],p:number){const pos=(xs.length-1)*p,lo=Math.floor(pos);return xs[lo]+(xs[Math.ceil(pos)]-xs[lo])*(pos-lo);}
export function qcRows(rows:EvidenceCell[]) {
 return [...new Set(rows.map(r=>r.lot||''))].flatMap(lot=>{
 const cohort=rows.filter(r=>(r.lot||'')===lot);
 // A collapsed IQR still identifies departures from the repeated value.
 const bounds=evidenceKeys.map(k=>{const values=cohort.map(x=>x[k]).filter((v):v is number=>v!==null).sort((a,b)=>a-b);if(values.length<8)return null;const q1=quantile(values,.25),q3=quantile(values,.75),iqr=q3-q1;return [q1-1.5*iqr,q3+1.5*iqr];});
 return cohort.map(r=>({id:r.id,flags:evidenceKeys.filter((k,i)=>r[k]!==null&&bounds[i]!==null&&(r[k]!<bounds[i]![0]-1e-8||r[k]!>bounds[i]![1]+1e-8))})).filter(r=>r.flags.length);
 });
}
export function analyzeEvidence(input:EvidenceCell[],excludeOutliers=false) {
 if(input.length>500||input.length<1)throw Error('비교는 배치별 1~500행을 지원합니다.');
 const started=performance.now();
 const qc=qcRows(input.filter(r=>r.state==='ready'));
 const outliers=new Set(qc.map(r=>r.id));
 const eligible=input.filter(r=>r.state==='ready'&&r.voltage_mv!==null&&r.capacity_mah!==null&&(!excludeOutliers||!outliers.has(r.id)));
 const summarize=(groups:EvidenceCell[][])=>({groups:groups.map(g=>({ids:g.map(r=>r.id),...assess(g)})),used:groups.length*8,unused:eligible.filter(r=>!groups.some(g=>g.some(x=>x.id===r.id))).map(r=>r.id),mean_capacity_spread:groups.length?groups.reduce((n,g)=>n+range(g,'capacity_mah')!,0)/groups.length:null});
 const cohorts=[...new Set(eligible.map(r=>r.lot||''))].map(lot=>eligible.filter(r=>(r.lot||'')===lot));
 const sequence=cohorts.flatMap(rows=>Array.from({length:Math.floor(rows.length/8)},(_,i)=>rows.slice(i*8,i*8+8)));
 const cost=(g:EvidenceCell[])=>SOP.requiredDimensions.reduce((n,k)=>n+(range(g,k)??0)/evidenceLimits[k],0);
 const proposed=packByYield(eligible);
 const alternatives=proposed.slice(0,3);
 return {engine_version:'evidence-yield-v1',sop_version:SOP.version,limits:evidenceLimits,exclude_outliers:excludeOutliers,input_count:input.length,eligible_count:eligible.length,input_snapshot:input,qc,sequence:summarize(sequence),recommended:summarize(proposed),alternatives:alternatives.map(g=>({ids:g.map(r=>r.id),score:Math.round((1-cost(g)/SOP.requiredDimensions.length)*100),reason:'동일 LOT·SOP 충족 후보를 용량·전압 편차 합으로 추천 · 저항 참고',...assess(g)})),elapsed_ms:performance.now()-started,scope:'LOT별 분리 편성. LOT 미확인 행은 동일 배치 내 시험 비교이며 현장 적합성 미확인. 최대 5가지 탐색 중 통과 팩 수 우선, 동률은 편차 합 비교. 동일 적격 셀 집합 비교. 사용·잔여 셀 차이 포함. 학습·생산 불량률·전역 최적성 검증 아님.'};
}
