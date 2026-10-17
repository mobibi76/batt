// Read-only originals. Output must stay outside public assets/source control.
// Usage: node --experimental-strip-types scripts/prepare-private-demo.mjs grading.xlsx poc.xlsx metadata.json output.json
import readXlsxFile,{readSheet} from 'read-excel-file/node';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename,resolve,relative} from 'node:path';
import assert from 'node:assert/strict';
import {parseIntake} from '../src/intake.ts';
const [grading,poc,metadata,out]=process.argv.slice(2);
if(!out||relative(resolve('.local'),resolve(out)).startsWith('..'))throw Error('Output must be inside ignored .local directory');
const files=JSON.parse(await readFile(metadata,'utf8'));
for(const [i,path] of [grading,poc].entries())assert.equal(files[i].sha256,createHash('sha256').update(await readFile(path)).digest('hex'));
const gradingSheet=await readSheet(grading,1);
const source_tables=[];
for(const path of [grading,poc]){const sheets=await readXlsxFile(path);for(const {sheet, data} of sheets.slice(path===poc?1:0)){source_tables.push({file:basename(path),sheet,header_rows:path===grading?2:1,rows:data.map(row=>row.map(v=>v instanceof Date?v.toISOString().replace('T',' ').replace(/Z$/,''):v??null))});}}
const intake=parseIntake(gradingSheet,basename(grading),files[0].sha256);
intake.rows=intake.rows.map(r=>({...r,field_origins:{id:'supplemented',voltage_mv:'provided',capacity_mah:'provided'}}));
const valid=intake.rows.filter(r=>r.state==='ready');
const features=(await readSheet(poc,4)).slice(1);const byChannel=new Map(intake.rows.map(r=>[r.channel,r]));
assert.equal(features.length,valid.length);assert.equal(new Set(features.map(r=>r[0])).size,valid.length);
for(const r of features){const c=byChannel.get(String(r[0]));assert.equal(c?.state,'ready');assert.equal(c.voltage_mv,Number(r[1]));assert.equal(c.capacity_mah,Number(r[4]));}
const groups=(await readSheet(poc,3)).slice(1,16).map(r=>String(r[1]).split(',').map(c=>byChannel.get(c.trim())));
assert.ok(groups.every(g=>g.length===8&&g.every(c=>c?.state==='ready')));assert.equal(new Set(groups.flat().map(c=>c.id)).size,groups.length*8);
const sequential=Array.from({length:Math.floor(valid.length/8)},(_,i)=>valid.slice(i*8,i*8+8));
const range=(g,k)=>Math.max(...g.map(c=>c[k]))-Math.min(...g.map(c=>c[k]));
const mean=groups=>groups.reduce((n,g)=>n+range(g,'capacity_mah'),0)/groups.length;
const verification={valid:valid.length,held:intake.rows.length-valid.length,sequence_mean:mean(sequential),poc_mean:mean(groups),improvement_percent:(1-mean(groups)/mean(sequential))*100,poc_two_criteria_pass:groups.filter(g=>range(g,'capacity_mah')<=500&&range(g,'voltage_mv')<=10).length,algorithm_reproduced:false};
await writeFile(out,JSON.stringify({version:1,intake,files,verification,source_tables}));
console.log(JSON.stringify({prepared:true,rows:intake.rows.length,valid:valid.length,held:verification.held,customer_values_logged:false}));
