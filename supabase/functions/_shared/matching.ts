export type Cell = { id: string; lot: string; voltage_mv: number; resistance_mohm: number; capacity_mah: number; status: string; measured_at: string };
export type Group = { cell_ids: string[]; spreads: Record<string, number>; score: number; sop_version: string };
const dimensions = ['voltage_mv', 'resistance_mohm', 'capacity_mah'] as const;
const limits = [10, 0.01, 500];
const scales = [1000, 100000, 1000];
function ticks(c: Cell, d: number) { return Math.round(c[dimensions[d]] * scales[d]); }
export function spreads(group: Cell[]) {
  return Object.fromEntries(dimensions.map((k,d) => [k, (Math.max(...group.map(c=>ticks(c,d)))-Math.min(...group.map(c=>ticks(c,d))))/scales[d]]));
}
export function fits(group: Cell[]) {
  const s = spreads(group);
  return dimensions.every((k,d)=>s[k]<=limits[d]);
}
export function matchCells(input: Cell[], count=3) {
  if (input.length>500) throw new Error('한 번에 최대 500개 셀까지 추천할 수 있습니다. LOT를 선택하세요.');
  if (!Number.isInteger(count) || count<1 || count>10) throw new Error('요청 팩 수는 1~10개여야 합니다.');
  if (new Set(input.map(c=>c.id)).size!==input.length) throw new Error('중복 셀 ID가 있습니다.');
  for (const c of input) for (let d=0;d<3;d++) {
    const value=c[dimensions[d]];
    if (!Number.isFinite(value)||value<=0||Math.abs(value*scales[d]-Math.round(value*scales[d]))>0.00001) throw new Error('측정값 또는 측정 정밀도를 확인하세요.');
  }
  let remaining=input.filter(c=>c.status==='available');
  const groups: Group[]=[];
  // Bounded multi-order greedy search. Never claims infeasibility or global optimality.
  for (let p=0;p<count && remaining.length>=8;p++) {
    let best: Cell[]|null=null; let bestCost=Infinity;
    for (let d=0;d<3;d++) {
      const sorted=[...remaining].sort((a,b)=>ticks(a,d)-ticks(b,d)||a.id.localeCompare(b.id));
      for (let seed=0;seed<sorted.length-7;seed++) {
        const group=[sorted[seed]];
        for (let j=seed+1;j<sorted.length && group.length<8;j++) {
          if(ticks(sorted[j],d)-ticks(sorted[seed],d)>limits[d]*scales[d]) break;
          if(fits([...group,sorted[j]])) group.push(sorted[j]);
        }
        if(group.length===8) {
          const s=spreads(group); const cost=dimensions.reduce((acc,k,i)=>acc+s[k]/limits[i],0);
          if(cost<bestCost) { best=group; bestCost=cost; }
        }
      }
    }
    if(!best) break;
    const ids=best.map(c=>c.id);
    groups.push({cell_ids:ids,spreads:spreads(best),score:Math.round((1-bestCost/3)*100),sop_version:'JSI-SOP-v1'});
    remaining=remaining.filter(c=>!ids.includes(c.id));
  }
  return {groups,remaining:remaining.length,method:'multi-order-greedy-v1',message:groups.length ? 'SOP 적합 추천 조합입니다. 전체 재고의 전역 최적해를 보장하지 않습니다.' : '탐색 범위에서 조합을 찾지 못했습니다. 조합이 불가능하다는 의미는 아닙니다.'};
}
