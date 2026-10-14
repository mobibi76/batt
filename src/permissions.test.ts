import {it,expect} from 'vitest';
import {canConfirm,canReview,canSubmit} from './permissions';
import type {Profile} from './lib';
const member:Profile={id:'one',email:'',display_name:'',role:'operator',status:'approved',created_at:'',process_stages:['aging']};
it('administration never implies confirmation or approval, even with stale flags',()=>{
 const admin={...member,role:'admin' as const,quality_reviewer:true};
 expect(canConfirm(admin,'aging')).toBe(false);expect(canReview(admin)).toBe(false);expect(canSubmit(admin)).toBe(false);
});
it('each process assignment and final approval are independent capabilities',()=>{
 expect(canConfirm(member,'aging')).toBe(true);expect(canConfirm(member,'final')).toBe(false);expect(canConfirm(member,'assembly')).toBe(false);expect(canReview(member)).toBe(false);
 const approver={...member,process_stages:[],quality_reviewer:true};expect(canReview(approver)).toBe(true);expect(canSubmit(approver)).toBe(false);
 for(const status of ['pending','rejected','suspended'] as const){expect(canSubmit({...member,status})).toBe(false);expect(canReview({...approver,status})).toBe(false);}
 expect(canSubmit({...member,process_stages:undefined})).toBe(false);expect(canSubmit({...member,role:'viewer'})).toBe(false);
});
