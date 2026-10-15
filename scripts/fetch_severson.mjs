// Read official public numeric summaries only. Never execute upstream model code.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const base='https://data.matr.io/1/api/v1',project='5c48dd2bc625d700019f3204';
const files=[];
async function read(path){
 const url=`${base}/${path}`,response=await fetch(url);
 if(!response.ok)throw Error(`${response.status}: ${url}`);
 const raw=await response.text();files.push({url,sha256:createHash('sha256').update(raw).digest('hex')});
 fs.mkdirSync('.local/severson-source',{recursive:true});
 fs.writeFileSync(`.local/severson-source/${files.length}.json`,raw);
 return JSON.parse(raw);
}
const config=await read('edp/configuration');
if(config.license?.url!=='https://creativecommons.org/licenses/by/4.0/')throw Error('Review changed data license before publishing');
const info=await read(`edp/projects/${project}`),batches=await read(`edp/projects/${project}/batches`);
const records=[],excluded=[],seen=new Map();
for(const batch of batches.sort((a,b)=>a.title.localeCompare(b.title))){
 const rows=await read(`edp/projects/${project}/batches/${batch._id}/tests`);
 for(const row of rows.sort((a,b)=>Number(a.channel)-Number(b.channel))){
  const series=row.summary?.['Discharge capacity vs cycle number'];
  const values=series?.y?.data;
  if(!row.cellId||!Array.isArray(values)||values.length<2||values.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)){
   excluded.push({id:row._id,reason:'Missing physical cell ID or invalid capacity summary'});continue;
  }
  // API provides no explicit x data. Keep order, do not invent cycle numbers.
  if(series.x?.data)throw Error('Explicit cycle coordinates appeared; review extractor');
  const continuation_of=seen.get(row.cellId)??null;
  records.push({id:row._id,cell_id:row.cellId,batch:batch.title,channel:row.channel,name:row.name,continuation_of,capacity_mah:values.map(v=>Math.round(v*1e6)/1000)});
  if(!continuation_of)seen.set(row.cellId,row._id);
 }
}
const output={schema_version:1,id:'severson-official-capacity-summary-v1',title:'Severson · 공식 방전용량 이력',source_url:`https://data.matr.io/1/projects/${project}`,citation:'Severson, Attia et al. (2019), Data-driven prediction of battery cycle life before capacity degradation. DOI: 10.1038/s41560-019-0356-8.',license:'CC BY 4.0 — official data portal; not a license for the prediction model code',license_evidence:files[0],retrieved_at:new Date().toISOString(),nominal_capacity_mah:1100,condition:info.objective,transform:'Official public summary y.data (Ah) multiplied by 1000 and rounded to 0.001 mAh. Original order preserved, including initial transients and interruptions. No x coordinates are provided: displayed positions are record ordinals, not verified cycle numbers. No interpolation, filling, lifetime labels or voltage/resistance fabrication.',record_count:records.length,unique_cells:seen.size,continuations:records.filter(r=>r.continuation_of).length,excluded,batches:batches.map(b=>({id:b._id,title:b.title,design:b.experimentalDesign,notes:b.dataNotes,experimental_notes:b.experimentalNotes})),files,records};
fs.writeFileSync('public/research/severson-capacity.json',JSON.stringify(output));
console.log(JSON.stringify({records:output.record_count,unique_cells:output.unique_cells,continuations:output.continuations,excluded:excluded.length,bytes:fs.statSync('public/research/severson-capacity.json').size}));
