import {expect,it} from 'vitest';
import {blankSchema,compareReadiness,schemaError,uconnSchema,seversonSchema,type ReadinessSchema} from './readiness';
const schema:ReadinessSchema={version:'pack-v1',dataset_url:'',note:'Match test conditions',fields:[{key:'pack_id',label:'팩 ID',unit:'',type:'text',role:'input',required:true},{key:'temperature_c',label:'온도',unit:'°C',type:'number',role:'input',required:true},{key:'cycle_life',label:'수명',unit:'cycle',type:'number',role:'label',required:false}]};
it('reports missing labels, invalid values and unknown conditions separately',()=>{
 expect(compareReadiness('pack_id\nP1',schema).findings[1].status).toBe('missing');
 const result=compareReadiness('pack_id,temperature_c\nP1,25\nP2,unknown',schema);
 expect(result.findings.map(f=>f.status)).toEqual(['available','repair','missing','unknown']);
 expect(result.findings[2].detail).toContain('평가/참고용');expect(result.findings[3].detail).toContain('Match test conditions');
 expect(compareReadiness('pack_id,temperature_c,cycle_life\nP1,25,1000',schema).findings.at(-1)?.status).toBe('unknown');
});
it('rejects missing schemas, duplicate headers, invalid schemas and preserves study-specific requirements',()=>{
 expect(()=>compareReadiness('a\n1',blankSchema())).toThrow('등록되지');
 expect(()=>compareReadiness('pack_id,pack_id\nP1,P2',schema)).toThrow('중복');
 expect(schemaError({...schema,fields:[schema.fields[0],schema.fields[0]]})).toContain('중복');
 expect(schemaError({...schema,dataset_url:'javascript:alert(1)'})).toContain('URL');
 expect(schemaError(uconnSchema)).toBe('');expect(schemaError(seversonSchema)).toBe('');
 expect(compareReadiness('cell_id,cycle\nA,10',uconnSchema).findings.find(f=>f.key==='R1')?.status).toBe('missing');
 expect(compareReadiness('cell_id,cycle\nA,10',seversonSchema).findings.find(f=>f.key==='cycle')?.status).toBe('available');
});
