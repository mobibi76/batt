import {expect,it} from 'vitest';
import {validateLifetimeCsv,validationExample,validationTemplate} from './lifetimeSchema';
const find=(text:string,id:string)=>validateLifetimeCsv(text).findings.find(f=>f.id===id)!;
function fixture(){return validationTemplate()+[10,100].flatMap(c=>Array.from({length:1000},(_,i)=>`CELL-1,${c},${3.5-1.5*i/999},${i/999},APR18650M1A,LFP/graphite,1.1,30,4,2,policy,rest,spline,source,800,0.8,completed`)).join('\n');}
it('checks the selected reference input without certifying performance',()=>{
 const r=validateLifetimeCsv(fixture());expect(r.rowCount).toBe(2000);expect(r.cellCount).toBe(1);
 expect(r.findings.find(f=>f.id==='grid')?.status).toBe('met');expect(r.counts.missing).toBe(0);expect(r.counts.difference).toBe(0);expect(r.counts.unknown).toBeGreaterThan(0);
 expect(r.findings.find(f=>f.id==='evaluation')?.status).toBe('unknown');
});
it('separates metadata differences, missing schema and incomplete lifetime labels',()=>{
 expect(find(fixture().replaceAll(',1.1,30,4,',',30,25,1,'),'nominal_capacity_ah').status).toBe('difference');
 expect(find('cell_id,capacity_mah\nA,1000','column-voltage_v').status).toBe('missing');
 expect(find(validationExample(),'labels').status).toBe('unknown');expect(find(validationExample(),'grid').status).toBe('missing');
});
it('checks cycle coverage per cell, duplicates, nonfinite values and mismatched labels',()=>{
 expect(find('cell_id,cycle,voltage_v,discharge_capacity_ah\nA,10,3,1\nB,100,3,1','cycles').status).toBe('missing');
 expect(find('cell_id,cycle,voltage_v,discharge_capacity_ah\nA,10,3,1\nA,10,3,1','duplicate').status).toBe('missing');
 expect(find('cell_id,cycle,voltage_v,discharge_capacity_ah\nA,10,NaN,','values').status).toBe('missing');
 expect(find(fixture().replace(',800,0.8,completed',',50,0.8,completed'),'metadata').status).toBe('missing');
 expect(find(fixture().replaceAll(',800,0.8,completed',',50,0.8,completed'),'labels').status).toBe('unknown');
});
it('rejects ambiguous CSV, empty files and excessive records',()=>{
 for(const text of ['',validationTemplate(),'cell_id,cell_id\nA,B','cell_id,cycle\nA,10,extra'])expect(()=>validateLifetimeCsv(text)).toThrow();
 expect(()=>validateLifetimeCsv('cell_id\n'+'A\n'.repeat(20001))).toThrow();
});
it('does not accept a 1000-point curve with wrong coordinates or reversed capacity',()=>{
 expect(find(fixture().replace('3.5,0,','3.6,0,'),'grid').status).toBe('missing');
 expect(find(fixture().replace('3.5,0,','3.5,2,'),'curve-shape').status).toBe('missing');
});
