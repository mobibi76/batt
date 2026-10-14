export type ResearchCell = { id: string; cohort: string; voltage_mv: number; resistance_mohm: number; capacity_mah: number; soc_pct?: number };
export type Limits = { voltage_mv: number; resistance_mohm: number; capacity_mah: number };
export const keys = ['voltage_mv','resistance_mohm','capacity_mah'] as const;
export const algorithms = ['sequence-v1', 'capacity-sort-v1', 'multi-start-nearest-v1'] as const;
export type Algorithm = typeof algorithms[number];
export const algorithmNames: Record<Algorithm,string> = { 'sequence-v1':'무작위 순서 조합', 'capacity-sort-v1':'용량 정렬 조합', 'multi-start-nearest-v1':'다중 시작점 · 3변수 탐색' };
export function validateResearch(cells: ResearchCell[], limits: Limits) {
  if(cells.length<8 || cells.length>300) throw Error('독립 셀 8~300개를 입력하세요.');
  if(new Set(cells.map(c=>c.id)).size!==cells.length) throw Error('셀 ID가 중복됩니다. 한 물리 셀당 한 측정만 사용하세요.');
  for(const key of keys) if(!Number.isFinite(limits[key])||limits[key]<=0)throw Error('허용 편차는 0보다 큰 유한한 수여야 합니다.');
  for(const c of cells){
    if(!c.id?.trim()||!c.cohort?.trim())throw Error('셀 ID와 측정 조건 그룹(cohort)이 필요합니다.');
    for(const k of keys)if(!Number.isFinite(c[k])||c[k]<=0)throw Error(`${c.id}: ${k} 측정값을 확인하세요.`);
    if(c.soc_pct!==undefined&&(!Number.isFinite(c.soc_pct)||c.soc_pct<0||c.soc_pct>100))throw Error('SOC는 0~100%여야 합니다.');
  }
}
export function spread(cells: ResearchCell[]): Limits {
  return Object.fromEntries(keys.map(k=>[k,Math.max(...cells.map(c=>c[k]))-Math.min(...cells.map(c=>c[k]))])) as Limits;
}
const cost=(cells:ResearchCell[],limits:Limits)=>{const s=spread(cells);return keys.reduce((a,k)=>a+s[k]/limits[k],0)/3;};
export const researchFits=(cells:ResearchCell[],limits:Limits)=>keys.every(k=>spread(cells)[k]<=limits[k]+1e-9);
export function shuffled(cells:ResearchCell[],seed:number){let state=seed>>>0;const result=[...cells];for(let i=result.length-1;i>0;i--){state=(1664525*state+1013904223)>>>0;const j=state%(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;}
export function groupResearch(cells: ResearchCell[], limits: Limits, algorithm: Algorithm): ResearchCell[][] {
  validateResearch(cells,limits);
  if(new Set(cells.map(c=>c.cohort)).size!==1)throw Error('서로 다른 측정 조건 그룹은 함께 조합할 수 없습니다.');
  if(algorithm!=='multi-start-nearest-v1'){
    const sorted=algorithm==='capacity-sort-v1'?[...cells].sort((a,b)=>a.capacity_mah-b.capacity_mah||a.id.localeCompare(b.id)):cells;
    return Array.from({length:Math.floor(sorted.length/8)},(_,i)=>sorted.slice(i*8,i*8+8));
  }
  let remaining=[...cells].sort((a,b)=>a.id.localeCompare(b.id));const groups:ResearchCell[][]=[];
  while(remaining.length>=8){
    let best:ResearchCell[]|null=null,bestCost=Infinity;
    for(const seed of remaining){
      const neighbors=remaining.filter(c=>c.id!==seed.id).sort((a,b)=>{
        const distance=(c:ResearchCell)=>keys.reduce((s,k)=>s+((c[k]-seed[k])/limits[k])**2,0);
        return distance(a)-distance(b)||a.id.localeCompare(b.id);
      });
      const candidate=[seed];
      for(const c of neighbors){if(researchFits([...candidate,c],limits))candidate.push(c);if(candidate.length===8)break;}
      if(candidate.length===8&&cost(candidate,limits)<bestCost){best=candidate;bestCost=cost(candidate,limits);}
    }
    if(!best)break;
    groups.push(best);const ids=new Set(best.map(c=>c.id));remaining=remaining.filter(c=>!ids.has(c.id));
  }
  return groups;
}
export function evaluate(cells:ResearchCell[],limits:Limits,algorithm:Algorithm,seed:number){
  const start=performance.now();const proposed=groupResearch(shuffled(cells,seed),limits,algorithm);const accepted=proposed.filter(g=>researchFits(g,limits));
  const averages=accepted.length?Object.fromEntries(keys.map(k=>[k,accepted.reduce((n,g)=>n+spread(g)[k],0)/accepted.length])) as Limits:null;
  return {algorithm,seed,input:cells.length,possible:Math.floor(cells.length/8),proposed:proposed.length,accepted:accepted.length,rejected:proposed.length-accepted.length,unused:cells.length-accepted.length*8,yield_pct:100*accepted.length/Math.floor(cells.length/8),mean_spread:averages,cost:accepted.length?accepted.reduce((n,g)=>n+cost(g,limits),0)/accepted.length:null,elapsed_ms:performance.now()-start,groups:proposed.map(g=>({ids:g.map(c=>c.id),spreads:spread(g),accepted:researchFits(g,limits)}))};
}
export function runExperiment(cells:ResearchCell[],limits:Limits,seed:number){
  validateResearch(cells,limits);if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('시드는 0~4294967295 정수여야 합니다.');
  const cohorts=[...new Set(cells.map(c=>c.cohort))].sort();
  return cohorts.map(cohort=>{
    const sample=cells.filter(c=>c.cohort===cohort);
    if(sample.length<8)return {cohort,count:sample.length,skipped:true,results:[]};
    return {cohort,count:sample.length,skipped:false,results:algorithms.map(algorithm=>({algorithm,trials:Array.from({length:5},(_,i)=>evaluate(sample,limits,algorithm,(seed+i)>>>0))}))};
  });
}
export type ExperimentResult = ReturnType<typeof runExperiment>;
