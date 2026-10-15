import {it,expect} from 'vitest';
import {packSignal,matchesPack,prioritizedWork,firstPassSummary,nextInspection,type ApprovalIndex} from './workflow';
import {qualitySummary,type Pack,type Inspection,type Profile} from './lib';
const pack:Pack={id:'p',serial_no:'p',created_at:'2026-10-01',created_by:'assembler',pack_cells:Array.from({length:8},(_,i)=>({cell_id:String(i),position:i+1}))};
const test=(id:string,kind:'aging'|'final',result:'pass'|'fail',at='2026-10-01'):Inspection=>({id,pack_id:'p',kind,result,created_at:at,note:'',created_by:kind});
const profile:Profile={id:'reviewer',role:'operator',status:'approved',created_at:'',email:'',display_name:'',quality_reviewer:true,process_stages:[]};
const request:ApprovalIndex={id:'r',kind:'pack',pack_id:'p',status:'pending',submitted_by:'assembler',submitted_at:'2026-10-02'};
it('next inspection follows unresolved evidence and assigned permissions without reopening completed checks',()=>{
 const operator={...profile,process_stages:['aging','final'] as Profile['process_stages']};
 expect(nextInspection(packSignal(pack,[],[]),operator)).toBe('aging');
 expect(nextInspection(packSignal(pack,[test('a','aging','pass')],[]),operator)).toBe('final');
 expect(nextInspection(packSignal(pack,[test('a','aging','pass'),test('f','final','fail')],[]),operator)).toBe('final');
 expect(nextInspection(packSignal(pack,[test('a','aging','pass'),test('f','final','pass')],[]),operator)).toBeNull();
 expect(nextInspection(packSignal(pack,[],[]),{...operator,role:'admin'})).toBeNull();
 expect(nextInspection(packSignal(pack,[test('a','aging','pass')],[]),{...operator,process_stages:['aging']})).toBeNull();
});
it('missing evidence, failed evidence and approval state remain distinct',()=>{
 expect(packSignal(pack,[],[]).state).toBe('aging');
 expect(packSignal(pack,[test('a','aging','pass')],[]).state).toBe('final');
 const evidence=[test('a','aging','fail'),test('f','final','pass')];expect(packSignal(pack,evidence,[]).state).toBe('failed');expect(matchesPack(packSignal(pack,evidence,[]),'unlinked')).toBe(false);
 const passed=[test('a','aging','pass'),test('f','final','pass')];expect(packSignal(pack,passed,null).state).toBe('unknown');expect(packSignal(pack,passed,[]).state).toBe('ready');expect(packSignal(pack,passed,[request]).state).toBe('pending');expect(packSignal(pack,passed,[{...request,status:'superseded'}]).state).toBe('ready');
});
it('role-specific work respects independent review and assigned stages',()=>{
 const tests=[test('a','aging','pass'),test('f','final','pass')];
 expect(prioritizedWork([pack],tests,[request],profile)).toHaveLength(1);
 const failing=[test('a','aging','fail'),test('f','final','pass')];expect(prioritizedWork([pack],failing,[request],profile)).toHaveLength(1);expect(matchesPack(packSignal(pack,failing,[request]),'pending')).toBe(true);
 expect(prioritizedWork([pack],tests,[request],{...profile,id:'aging'})).toHaveLength(0);
 expect(prioritizedWork([pack],tests,[request],{...profile,role:'admin'})).toHaveLength(0);
 expect(prioritizedWork([pack],[],[],{...profile,quality_reviewer:false,process_stages:['aging']})).toHaveLength(1);
 expect(prioritizedWork([pack],[],[],{...profile,quality_reviewer:false,process_stages:['final']})).toHaveLength(0);
});
it('reinspection improves the latest rate without erasing first-pass failures',()=>{
 const tests=[test('f1','final','fail'),test('f2','final','pass','2026-10-02'),{...test('outside','final','fail'),pack_id:'another'}];
 expect(firstPassSummary([pack],tests)).toEqual({tested:1,failed:1,rate:100});expect(qualitySummary([pack],tests).rate).toBe(0);
 expect(firstPassSummary([],tests).rate).toBeNull();expect(qualitySummary([],tests).rate).toBeNull();
});
it('metric links retain the latest final result instead of mixing in aging failures',()=>{
 const agingFail=packSignal(pack,[test('a','aging','fail'),test('f','final','pass')],[]);
 expect(matchesPack(agingFail,'failed')).toBe(true);expect(matchesPack(agingFail,'final_failed')).toBe(false);expect(matchesPack(agingFail,'final_recorded')).toBe(true);
 const finalFail=packSignal(pack,[test('f','final','fail')],[]);expect(matchesPack(finalFail,'final_failed')).toBe(true);
 const retest=packSignal(pack,[test('f','final','fail'),test('r','final','pass','2026-10-02')],[]);expect(matchesPack(retest,'final_failed')).toBe(false);expect(matchesPack(packSignal(pack,[],[]),'final_recorded')).toBe(false);
});
