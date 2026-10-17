import {describe,it,expect} from 'vitest';
import {planningLayout,estimate,validatePlan,publicationError,dataCoverage} from './planning';
import {validateLayout} from './model';
describe('process efficiency planning',()=>{
 it('batches 128 cells as 16 packs rather than charging each cell serially',()=>{const l=planningLayout();l.devices=l.devices.slice(0,1);l.links=[];l.plan!.stations={grading:l.plan!.stations.grading};expect(estimate(l).total).toBe(665);l.plan!.quantity=17;expect(estimate(l).total).toBe(1330);l.plan!.stations.grading.parallel=2;expect(estimate(l).total).toBe(665);});
 it('computes pipeline waiting and preserves one-pack lead time',()=>{const l=planningLayout();l.devices=l.devices.slice(0,2);l.links=l.links.slice(0,1);const a=l.plan!.stations.grading,b=l.plan!.stations.storage;Object.assign(a,{minutes:10,handling:0,batch:1,unit:'pack',transfer:2});Object.assign(b,{minutes:20,handling:0,batch:1});l.plan!.stations={grading:a,storage:b};l.plan!.quantity=2;const r=estimate(l);expect(r.first).toBe(32);expect(r.total).toBe(52);expect(r.single).toBe(32);expect(r.rows[1].waiting).toBe(5);expect(r.bottleneck).toBe('storage');});
 it('does not turn layout distance into travel time',()=>{const l=planningLayout(),before=estimate(l);l.devices[0].x=9;expect(estimate(l)).toEqual(before);});
 it('preserves planning on round trip and blocks incomplete publication',()=>{const l=planningLayout();expect(validateLayout(l)).toEqual(l);expect(publicationError(l)).toBeNull();l.plan!.stations.module.stage='assembly';expect(publicationError(l)).toMatch(/순서/);});
 it('rejects invalid capacities and distinguishes planned coverage from data',()=>{const l=planningLayout();expect(dataCoverage(l)[2].missing).toContain('life_label');l.plan!.stations.grading.batch=127;expect(()=>validatePlan(l.plan,l.devices)).toThrow(/8의 배수/);});
});
