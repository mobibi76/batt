import {it,expect} from 'vitest';
import {assessFieldGroup,planFieldGroups} from './fieldCriteria';
import {assess,type EvidenceCell} from '../supabase/functions/_shared/evidence';
import {matchCells} from '../supabase/functions/_shared/matching';
import {validateRows} from './lib';
const rows=(n=8):EvidenceCell[]=>Array.from({length:n},(_,i)=>({id:`C${i}`,channel:`${i}`,row_no:i+3,lot:'L',state:'ready',issues:[],voltage_mv:3300,capacity_mah:25000+i,resistance_mohm:null,measured_at:'2026-10-16T09:00:00+09:00'}));
it('uses inclusive 500mAh and 10mV boundaries, independently of missing IR',()=>{
 const r=rows();r[7].capacity_mah=25500;r[7].voltage_mv=3310;
 expect(assessFieldGroup(r).status).toBe('pass');expect(assess(r).status).toBe('pass');
 const stock=r.map(c=>({...c,lot:'L',status:'available',voltage_mv:c.voltage_mv!,capacity_mah:c.capacity_mah!,measured_at:c.measured_at!}));
 expect(matchCells(stock).groups).toHaveLength(1);
 expect(validateRows(stock).errors).toEqual([]);
 r[7].capacity_mah=25500.001;expect(assessFieldGroup(r).status).toBe('fail');expect(assess(r).status).toBe('fail');
 r[7].capacity_mah=25500;r[7].voltage_mv=3310.001;expect(assessFieldGroup(r).status).toBe('fail');
 expect(assessFieldGroup(r.slice(0,7)).status).toBe('unverified');
});
it('keeps operational 50/100mAh targets separate from the 500mAh pass limit',()=>{
 const r=rows();r[7].capacity_mah=25100;
 expect(assessFieldGroup(r,50)).toMatchObject({status:'pass',practiceMet:false});
 expect(assessFieldGroup(r,100).practiceMet).toBe(true);
 expect(planFieldGroups(r,50).unused).toHaveLength(8);
 expect(planFieldGroups(r,100).groups).toHaveLength(1);
});
it('never reuses or mixes LOTs or assigns held cells and retains all leftovers',()=>{
 const r=rows(27);r[0].state='held';r.slice(14).forEach(c=>c.lot='OTHER');
 const before=JSON.stringify(r),p=planFieldGroups(r);
 expect(p.groups).toHaveLength(2);expect(p.unused).toHaveLength(10);expect(p.excluded).toEqual(['C0']);
 expect(new Set(p.groups.flatMap(g=>g.ids)).size).toBe(16);
 expect(JSON.stringify(r)).toBe(before);
 expect(()=>planFieldGroups([r[1],r[1]])).toThrow('중복');
});
