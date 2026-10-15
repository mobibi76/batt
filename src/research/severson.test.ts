import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
it('preserves physical cell identity and capacity-only provenance across Severson batches',()=>{
 const d=JSON.parse(readFileSync('public/research/severson-capacity.json','utf8'));
 expect(d.records).toHaveLength(140);expect(new Set(d.records.map((r:any)=>r.cell_id)).size).toBe(135);
 const continued=d.records.filter((r:any)=>r.continuation_of);expect(continued).toHaveLength(5);
 for(const r of continued){const parent=d.records.find((p:any)=>p.id===r.continuation_of);expect(parent.cell_id).toBe(r.cell_id);expect(parent.batch<r.batch).toBe(true);}
 for(const r of d.records){expect(r.capacity_mah.length).toBeGreaterThan(1);expect(r.capacity_mah.every((v:number)=>Number.isFinite(v)&&v>=0)).toBe(true);expect(r.voltage_mv).toBeUndefined();expect(r.resistance_mohm).toBeUndefined();expect(r.cycle_life).toBeUndefined();}
 expect(d.license).toContain('CC BY 4.0');for(const f of d.files){expect(f.url).toMatch(/^https:\/\/data\.matr\.io\//);expect(f.sha256).toMatch(/^[a-f0-9]{64}$/);}
});
