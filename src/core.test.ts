import { describe,it,expect } from 'vitest';
import {matchCells,fits} from '../supabase/functions/_shared/matching';
import {sampleCells,validateRows,qualitySummary} from './lib';
describe('SOP matching invariants',()=>{
  it('returns disjoint groups of eight satisfying each hard constraint',()=>{const cells=sampleCells();const r=matchCells(cells,10);expect(r.groups.length).toBe(10);const ids=r.groups.flatMap(g=>g.cell_ids);expect(new Set(ids).size).toBe(ids.length);for(const g of r.groups){expect(g.cell_ids).toHaveLength(8);expect(fits(cells.filter(c=>g.cell_ids.includes(c.id)))).toBe(true);}});
  it('does not use held cells or invent missing cells',()=>{const cells=sampleCells().slice(0,8);cells[0].status='held';expect(matchCells(cells).groups).toHaveLength(0);});
  it('rejects just-outside resistance boundary',()=>{const cells=sampleCells().slice(0,8).map(c=>({...c,resistance_mohm:0.42}));cells[7].resistance_mohm=0.43001;expect(matchCells(cells).groups).toHaveLength(0);cells[7].resistance_mohm=0.43;expect(matchCells(cells).groups).toHaveLength(1);});
  it('rejects duplicate IDs and oversized workloads',()=>{const c=sampleCells();expect(()=>matchCells([c[0],c[0]])).toThrow();expect(()=>matchCells(Array(501).fill(c[0]))).toThrow();});
});
describe('import validation',()=>{
  it('accepts canonical sample data',()=>expect(validateRows(sampleCells()).errors).toHaveLength(0));
  it('rejects duplicated IDs, invalid numbers and missing timezone',()=>{const c=sampleCells().slice(0,2);c[1]={...c[0],capacity_mah:NaN,measured_at:'2026-10-14'};expect(validateRows(c).errors.length).toBeGreaterThanOrEqual(3);});
});
describe('quality metrics',()=>{
  it('does not display zero defects when there are no inspections',()=>expect(qualitySummary([],[]).rate).toBe(null));
  it('counts each pack once using latest final result, keeping incomplete packs in linkage denominator',()=>{const packs=['a','b'].map(id=>({id,serial_no:id,created_at:'',pack_cells:Array.from({length:8},(_,i)=>({cell_id:String(i),position:i+1}))}));const tests=[{id:'1',pack_id:'a',kind:'final' as const,result:'fail' as const,note:'',created_at:'2026-01-01'},{id:'2',pack_id:'a',kind:'final' as const,result:'pass' as const,note:'',created_at:'2026-01-02'},{id:'3',pack_id:'a',kind:'aging' as const,result:'pass' as const,note:'',created_at:'2026-01-02'}];expect(qualitySummary(packs,tests)).toEqual({tested:1,failed:0,rate:0,linked:1,linkRate:50});});
});
