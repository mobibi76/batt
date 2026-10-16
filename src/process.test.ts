import {expect,it} from 'vitest';
import {inspectionOrder,processChecks,fieldSteps} from './process';
import {packSignal,nextInspection,independentReview} from './workflow';
import type {Pack,Inspection,Profile} from './lib';
const pack:Pack={id:'p',serial_no:'p',created_at:'2026-10-16',created_by:'assembly',process_version:'field-v1',pack_cells:Array.from({length:8},(_,i)=>({cell_id:String(i),position:i+1}))};
const profile:Profile={id:'casing',role:'operator',status:'approved',created_at:'',email:'',display_name:'',quality_reviewer:true,process_stages:['assembly','aging','final']};
const check=(kind:Inspection['kind'],hour:number,result:Inspection['result']='pass'):Inspection=>({id:kind+hour,pack_id:'p',kind,result,note:'',created_at:`2026-10-16T${hour}:00:00Z`,created_by:kind});
it('follows the six meeting stages and requires casing before final quality review',()=>{
 expect(fieldSteps.map(s=>s.id)).toEqual(['grading','storage','assembly','module','casing','final']);
 const tests:Inspection[]=[];
 for(const [kind,hour] of [['module',10],['casing',11],['final',12]] as const){
  expect(nextInspection(packSignal(pack,tests,[]),profile)).toBe(kind);tests.push(check(kind,hour));
 }
 expect(packSignal(pack,tests,[]).state).toBe('ready');
 expect(independentReview(packSignal(pack,tests,[{id:'r',kind:'pack',pack_id:'p',status:'pending',submitted_by:'submitter',submitted_at:''}]),profile)).toBe(false);
});
it('invalidates downstream work after upstream reinspection and respects assignments',()=>{
 const tests=[check('module',10),check('casing',11),check('final',12),check('module',13)];
 expect(Object.keys(processChecks(pack,tests))).toEqual(['module']);
 expect(nextInspection(packSignal(pack,tests,[]),profile)).toBe('casing');
 expect(nextInspection(packSignal(pack,tests,[]),{...profile,process_stages:['final']})).toBeNull();
 tests.push(check('module',14,'fail'));
 expect(packSignal(pack,tests,[]).reason).toBe('모듈 검사 불합격');
 expect(nextInspection(packSignal(pack,tests,[]),profile)).toBe('module');
});
it('preserves historical aging records without reinterpreting them as module inspection',()=>{
 const legacy={...pack,process_version:undefined};
 expect(inspectionOrder(legacy)).toEqual(['aging','final']);
 expect(packSignal(legacy,[check('aging',10),check('final',11)],[]).state).toBe('ready');
 expect(packSignal(pack,[check('aging',10),check('final',11)],[]).state).toBe('module');
});
