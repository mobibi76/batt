// Measured values remain nullable. No synthetic replacement for missing resistance.
export type SourceKind = 'measured' | 'reconstructed' | 'synthetic' | 'unknown';
export type EvidenceCell = { row_no:number; lot?:string|null; id:string; channel:string; voltage_mv:number|null; resistance_mohm:number|null; capacity_mah:number|null; measured_at:string|null; issues:string[]; state:'ready'|'held'|'retest'|'used'; raw?:unknown };
export const evidenceKeys = ['voltage_mv','resistance_mohm','capacity_mah'] as const;
export const evidenceLimits = {voltage_mv:10,resistance_mohm:0.01,capacity_mah:500};
export function range(rows:EvidenceCell[],key:typeof evidenceKeys[number]):number|null {
 const values=rows.map(r=>r[key]);
 return values.some(v=>v===null)?null:Number((Math.max(...values as number[])-Math.min(...values as number[])).toFixed(5));
}
export function assess(rows:EvidenceCell[]) {
 const spreads=Object.fromEntries(evidenceKeys.map(k=>[k,range(rows,k)])) as Record<typeof evidenceKeys[number],number|null>;
 const failed=evidenceKeys.filter(k=>spreads[k]!==null&&spreads[k]!>evidenceLimits[k]);
 const missing=evidenceKeys.filter(k=>spreads[k]===null);
 return {spreads,failed,missing,status:failed.length?'fail':missing.length?'unverified':'pass'};
}
function quantile(xs:number[],p:number){const pos=(xs.length-1)*p,lo=Math.floor(pos);return xs[lo]+(xs[Math.ceil(pos)]-xs[lo])*(pos-lo);}
export function qcRows(rows:EvidenceCell[]) {
 const bounds=evidenceKeys.map(k=>{const values=rows.map(x=>x[k]).filter((v):v is number=>v!==null).sort((a,b)=>a-b);if(values.length<8)return null;const q1=quantile(values,.25),q3=quantile(values,.75),iqr=q3-q1;return iqr>0?[q1-1.5*iqr,q3+1.5*iqr]:null;});
 return rows.map(r=>({id:r.id,flags:evidenceKeys.filter((k,i)=>r[k]!==null&&bounds[i]!==null&&(r[k]!<bounds[i]![0]||r[k]!>bounds[i]![1]))})).filter(r=>r.flags.length);
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
 const cost=(g:EvidenceCell[])=>evidenceKeys.reduce((n,k)=>n+(range(g,k)??0)/evidenceLimits[k],0);
 function candidates(rows:EvidenceCell[]){
  const found=new Map<string,EvidenceCell[]>();
  for(const key of evidenceKeys){
   if(rows.some(r=>r[key]===null))continue;
   const sorted=[...rows].sort((a,b)=>a[key]!-b[key]!||a.id.localeCompare(b.id));
   for(let i=0;i+7<sorted.length;i++){
    const group=[sorted[i]];
    for(let j=i+1;j<sorted.length&&group.length<8;j++){
     if(sorted[j][key]!-sorted[i][key]!>evidenceLimits[key])break;
     if((sorted[j].lot||'')===(group[0].lot||'')&&!assess([...group,sorted[j]]).failed.length)group.push(sorted[j]);
    }
    if(group.length===8)found.set(group.map(r=>r.id).sort().join('|'),group);
   }
  }
  return [...found.values()].map(group=>({group,missing:Number(assess(group).status!=='pass'),cost:cost(group),key:group.map(r=>r.id).join()})).sort((a,b)=>a.missing-b.missing||a.cost-b.cost||a.key.localeCompare(b.key)).map(x=>x.group);
 }
 // Missing measurements remain unverified in every candidate.
 const alternatives=candidates(eligible).slice(0,3);
 let remaining=[...eligible];const proposed:EvidenceCell[][]=[];
 while(remaining.length>=8){const best=candidates(remaining)[0];if(!best)break;proposed.push(best);const ids=new Set(best.map(r=>r.id));remaining=remaining.filter(r=>!ids.has(r.id));}
 return {engine_version:'evidence-greedy-v2',sop_version:'JSI-SOP-v1',limits:evidenceLimits,exclude_outliers:excludeOutliers,input_count:input.length,eligible_count:eligible.length,input_snapshot:input,qc,sequence:summarize(sequence),recommended:summarize(proposed),alternatives:alternatives.map(g=>({ids:g.map(r=>r.id),score:Math.round((1-cost(g)/3)*100),reason:'동일 LOT 내 SOP 정규화 편차 합 최소 우선 · 미측정 항목은 점수에서 제외',...assess(g)})),elapsed_ms:performance.now()-started,scope:'LOT별 분리 편성. LOT 미확인 행은 동일 배치 내 시험 비교이며 현장 적합성 미확인. 동일 적격 셀 집합 비교. 사용·잔여 셀 차이 포함. 학습·생산 불량률·전역 최적성 검증 아님.'};
}
