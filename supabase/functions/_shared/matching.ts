import {packByYield} from './packing.ts';
import {SOP} from './sop.ts';
export type Cell = { field_origins?:Partial<Record<string,'provided'|'supplemented'|'synthetic'>>; source_kind?:string; source_batch_id?:string;  id: string; lot: string; voltage_mv: number; resistance_mohm: number|null; capacity_mah: number; status: string; measured_at: string };
export type Group = { run_id?:string; cell_ids: string[]; spreads: Record<string, number>; score: number; sop_version: string };
const dimensions = SOP.requiredDimensions;
const limits = dimensions.map(k=>SOP.limits[k]);
const scales = [1000,1000];
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
  for (const c of input) for (let d=0;d<dimensions.length;d++) {
    const value=c[dimensions[d]];
    if (!Number.isFinite(value)||value<=0||Math.abs(value*scales[d]-Math.round(value*scales[d]))>0.00001) throw new Error('측정값 또는 측정 정밀도를 확인하세요.');
  }
  const available=input.filter(c=>c.status==='available');
  const plan=packByYield(available);
  const groups:Group[]=plan.slice(0,count).map(group=>{const s=spreads(group);return {cell_ids:group.map(c=>c.id),spreads:s,score:Math.round((1-dimensions.reduce((n,k,i)=>n+s[k]/limits[i],0)/dimensions.length)*100),sop_version:SOP.version};});
  const remaining=available.filter(c=>!groups.some(g=>g.cell_ids.includes(c.id)));
  return {sop_version:SOP.version,groups,remaining:remaining.length,method:'yield-multistrategy-v1',message:groups.length ? '최대 5가지 탐색 결과 중 통과 팩 수가 많은 편성을 우선하고 동률은 편차 합으로 비교합니다. 전체 재고의 전역 최적해를 보장하지 않습니다.' : '탐색 범위에서 조합을 찾지 못했습니다. 조합이 불가능하다는 의미는 아닙니다.'};
}
