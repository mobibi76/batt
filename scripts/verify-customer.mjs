// Read-only local verification. Supply original files; they are never uploaded.
import {readSheet} from 'read-excel-file/node';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseIntake} from '../src/intake.ts';
import {analyzeEvidence} from '../supabase/functions/_shared/evidence.ts';
const [grading,poc]=process.argv.slice(2);
if(!grading)throw Error('Usage: node scripts/verify-customer.mjs <grading.xlsx> [poc.xlsx]');
const bytes=await readFile(grading),sheet=await readSheet(grading,1);
const intake=parseIntake(sheet,'customer-grading.xlsx',createHash('sha256').update(bytes).digest('hex'));
assert.equal(intake.rows.length,128);assert.equal(intake.rows.filter(r=>r.state==='ready').length,124);assert.ok(intake.rows.every(r=>r.resistance_mohm===null));
const output=analyzeEvidence(intake.rows);assert.equal(output.recommended.groups.length,15);assert.ok(output.recommended.groups.every(g=>g.status==='pass'&&g.spreads.resistance_mohm===null));
console.log(JSON.stringify({input:intake.rows.length,ready:124,held:4,recommended:output.recommended.groups.length,sop_v2_pass:output.recommended.groups.length,elapsed_ms:output.elapsed_ms}));
if(poc){const packs=await readSheet(poc,3),byChannel=new Map(intake.rows.map(r=>[r.channel,r]));const groups=packs.slice(1,16).map(r=>String(r[1]).split(',').map(ch=>byChannel.get(ch.trim())));assert.ok(groups.every(g=>g.length===8&&g.every(Boolean)));assert.equal(new Set(groups.flatMap(g=>g.map(r=>r.id))).size,120);
const spread=g=>Math.max(...g.map(r=>r.capacity_mah))-Math.min(...g.map(r=>r.capacity_mah));
const mean=groups.reduce((sum,g)=>sum+spread(g),0)/15;assert.ok(Math.abs(mean-138.04)<.001);
console.log(JSON.stringify({recorded_poc_mean_capacity_spread:mean,verified:'recorded arithmetic only; K-means execution not reproduced'}));}
