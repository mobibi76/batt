import {analyzeEvidence} from '../supabase/functions/_shared/evidence.ts';
import assert from 'node:assert/strict';
for(const n of [128,500])for(const mode of ['dense','spread']){
 const rows=Array.from({length:n},(_,i)=>({id:`BENCH-${String(i).padStart(4,'0')}`,lot:'BENCH',row_no:i+1,channel:String(i),voltage_mv:3300+(mode==='dense'?i%5:i*2),resistance_mohm:.42,capacity_mah:25000+i%100,measured_at:'2026-10-15T00:00:00Z',state:'ready',issues:[]}));
 const cpu=process.cpuUsage(),start=performance.now();const a=analyzeEvidence(rows);const wall=performance.now()-start,used=process.cpuUsage(cpu);
 const b=analyzeEvidence(rows);assert.deepEqual(a.recommended,b.recommended);assert.deepEqual(a.alternatives,b.alternatives);
 console.log(JSON.stringify({n,mode,wall_ms:Math.round(wall),cpu_ms:Math.round((used.user+used.system)/1000),packs:a.recommended.groups.length,reproducible:true,engine:a.engine_version,scope:'local Node CPU; not Edge CPU or production efficacy'}));
}
