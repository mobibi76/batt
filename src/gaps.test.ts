import {it,expect} from 'vitest';
import {parseIntake} from './intake';
import {analyzeEvidence,qcRows,type EvidenceCell} from '../supabase/functions/_shared/evidence';
import {matchCells} from '../supabase/functions/_shared/matching';
import {metricCohort,qualitySummary,type Pack,type Inspection} from './lib';
const fixture=(i:number):EvidenceCell=>({id:`C-${String(i).padStart(2,'0')}`,row_no:i+1,lot:'SAME',channel:String(i),voltage_mv:3300,resistance_mohm:.42,capacity_mah:25000,measured_at:'2026-10-15T00:00:00Z',state:'ready',issues:[]});
it('retains physical row positions after blanks and never infers timezone for Excel dates',()=>{
 const data=parseIntake([['id','lot','voltage_mv','resistance_mohm','capacity_mah','measured_at'],[],['A','L',3300,.42,25000,new Date('2026-10-15')]],'date.xlsx','d'.repeat(64));
 expect(data.rows[0].row_no).toBe(3);expect(data.rows[0].measured_at).toBeNull();expect(data.rows[0].issues).toContain('측정 시각 시간대 확인 필요');
});
it('finds fully measured groups despite interleaved missing resistance without cell reuse',()=>{
 const input=Array.from({length:16},(_,i)=>({...fixture(i),resistance_mohm:i%2?null:.42}));const r=analyzeEvidence(input);
 expect(r.alternatives[0].status).toBe('pass');expect(r.recommended.groups.map(g=>g.status)).toEqual(['pass','pass']);
 expect(new Set(r.recommended.groups.flatMap(g=>g.ids)).size).toBe(16);
});
it('flags departures with zero IQR but never compares distinct LOT baselines',()=>{
 const rows=Array.from({length:24},(_,i)=>({...fixture(i),voltage_mv:i===23?3200:3300}));
 expect(qcRows(rows)).toEqual([{id:'C-23',flags:['voltage_mv']}]);expect(analyzeEvidence(rows,true).eligible_count).toBe(23);
 expect(qcRows(rows.map((r,i)=>({...r,lot:i===23?'OTHER':'SAME'})))).toEqual([]);
 expect(qcRows(Array.from({length:24},(_,i)=>fixture(i)))).toEqual([]);
});
it('preserves LOT and refuses mixed LOT packs in both engines',()=>{
 const h=['id','lot','voltage_mv','resistance_mohm','capacity_mah','measured_at'];
 const rows=Array.from({length:8},(_,i)=>['S'+i,i<4?'A':'B',3300,.42,25000,'2026-10-15T00:00:00Z']);
 const intake=parseIntake([h,...rows],'test.csv','a'.repeat(64));
 expect(intake.rows[0].lot).toBe('A');expect(analyzeEvidence(intake.rows).alternatives).toHaveLength(0);
 expect(matchCells(intake.rows.map(r=>({...r,lot:r.lot!,voltage_mv:r.voltage_mv!,resistance_mohm:r.resistance_mohm!,capacity_mah:r.capacity_mah!,measured_at:r.measured_at!,status:'available'}))).groups).toHaveLength(0);
});
it('measured indicators exclude synthetic packs and test inspections',()=>{
 const packs:Pack[]=['measured','synthetic','unknown'].map((source_kind,i)=>({id:String(i),source_kind,serial_no:String(i),created_at:'',pack_cells:Array.from({length:8},(_,position)=>({cell_id:String(position),position}))}));
 const tests:Inspection[]=[{id:'real',pack_id:'0',kind:'final',result:'fail',evidence_kind:'measured',created_at:'2026-10-01',note:''},{id:'test',pack_id:'0',kind:'final',result:'pass',evidence_kind:'test',created_at:'2026-10-02',note:''},{id:'synthetic',pack_id:'1',kind:'final',result:'pass',evidence_kind:'measured',created_at:'2026-10-03',note:''}];
 const c=metricCohort(packs,tests,'measured');expect(c.packs).toHaveLength(1);expect(c.tests).toHaveLength(1);expect(qualitySummary(c.packs,c.tests).rate).toBe(100);
 const empty=metricCohort(packs.slice(1),tests,'measured');expect(qualitySummary(empty.packs,empty.tests).rate).toBeNull();
});
