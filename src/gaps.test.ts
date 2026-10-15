import {it,expect} from 'vitest';
import {parseIntake} from './intake';
import {analyzeEvidence} from '../supabase/functions/_shared/evidence';
import {matchCells} from '../supabase/functions/_shared/matching';
import {metricCohort,qualitySummary,type Pack,type Inspection} from './lib';
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
