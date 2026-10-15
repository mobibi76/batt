import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {inferCapacity} from './pretrained';
const model=JSON.parse(readFileSync('public/research/uconn-model.json','utf8'));
const source=JSON.parse(readFileSync('public/research/uconn-inference.json','utf8'));
it('reproduces independent Python reference for every selected public record without training',()=>{
 expect(source.records).toHaveLength(112);
 for(const r of source.records){expect(inferCapacity(model,r.features,r.soc_final).capacityAh).toBeCloseTo(r.oracle_ah,12);}
 expect(inferCapacity(model,source.records[0].features,source.records[0].soc_final).capacityAh).toBeCloseTo(1.1271256949690172,12);
 expect(model.license).toBe('MIT');expect(model.source_sha256).toMatch(/^[a-f0-9]{64}$/);
});
it('does not use reference labels and preserves the original boundary fallback',()=>{
 const r=source.records[0],a=inferCapacity(model,r.features,r.soc_final);r.reference_ah=999;
 expect(inferCapacity(model,r.features,r.soc_final)).toEqual(a);
 const boundary=inferCapacity(model,r.features,0);
 expect(boundary.fallback).toBe(true);expect(boundary.capacityAh).toBeCloseTo(boundary.experts.reduce((a,b)=>a+b,0)/3,12);
 expect(boundary.outputCalibration).toBe('none');
});
it('rejects missing, nonfinite or incompatible inputs instead of inventing features',()=>{
 const x=source.records[0].features;
 for(const bad of [[],x.slice(1),x.map(()=>NaN)])expect(()=>inferCapacity(model,bad,.5)).toThrow();
 for(const soc of [NaN,-.1,1.1])expect(()=>inferCapacity(model,x,soc)).toThrow();
 expect(()=>inferCapacity({...model,target_unit:'%'},x,.5)).toThrow();
 expect(()=>inferCapacity({...model,bands:[]},x,.5)).toThrow();
});
