import Papa from 'papaparse';
import type {Cell} from '../../supabase/functions/_shared/matching';
import type {Pack,Inspection} from '../lib';
import {keys,type ResearchCell} from './engine';
export type FieldRow={id:string;cohort:string;voltage_mv:number|null;resistance_mohm:number|null;capacity_mah:number|null;row:number;measured_at?:string;source:string;status:string;origins?:Cell['field_origins'];judgment?:{result:'pass'|'fail';reason:string;operator:string;at:string};issues:string[]};
export type FieldEvidence={rows:FieldRow[];packs:Pack[];inspections:Inspection[];captured_at:string;title:string};
export const metricLabels={voltage_mv:'전압',resistance_mohm:'내부저항',capacity_mah:'용량'};
export const metricUnits={voltage_mv:'mV',resistance_mohm:'mΩ',capacity_mah:'mAh'};
export function captureField(cells:Cell[],packs:Pack[],inspections:Inspection[],title:string):FieldEvidence{return {title,captured_at:new Date().toISOString(),rows:cells.map((c,i)=>({id:c.id,cohort:c.lot,voltage_mv:c.voltage_mv??null,resistance_mohm:c.resistance_mohm??null,capacity_mah:c.capacity_mah??null,row:i+1,measured_at:c.measured_at,source:c.source_kind||'unknown',status:c.status,origins:c.field_origins,issues:[]})),packs:structuredClone(packs),inspections:structuredClone(inspections)};}
export function parseFieldCsv(text:string,title:string):FieldEvidence{
 const p=Papa.parse<Record<string,string>>(text,{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim().replace(/^\ufeff/,'')});
 if(p.errors.length)throw Error('CSV 형식을 확인하세요.');
 if(!p.meta.fields?.includes('id')||!p.meta.fields.some(h=>h==='cohort'||h==='lot'))throw Error('셀 ID(id)와 조건 그룹(cohort 또는 lot) 열이 필요합니다.');
 if(!p.data.length||p.data.length>5000)throw Error('측정자료는 1~5,000행을 입력하세요.');
 const rows=p.data.map((r,i)=>{const issues:string[]=[];const metrics=Object.fromEntries(keys.map(k=>{const raw=r[k]?.trim();if(!raw)return [k,null];const n=Number(raw);if(!Number.isFinite(n)||n<=0){issues.push(`${metricLabels[k]} 값 오류`);return [k,null];}return [k,n];})) as Pick<FieldRow,typeof keys[number]>;const result=r.worker_result?.trim().toLowerCase();if(result&&!['pass','fail'].includes(result))issues.push('작업자 판단은 PASS 또는 FAIL이어야 합니다.');return {id:r.id?.trim()||'',cohort:(r.cohort||r.lot||'').trim(),...metrics,row:i+2,measured_at:r.measured_at?.trim()||'',source:'declared',status:'연구 입력',issues,...(result==='pass'||result==='fail'?{judgment:{result,reason:r.judgment_reason?.trim()||'',operator:r.operator?.trim()||'',at:r.judged_at?.trim()||''}}:{})} as FieldRow;});
 return {rows,packs:[],inspections:[],title,captured_at:new Date().toISOString()};
}
export function rowProblems(row:FieldRow,rows:FieldRow[],includeTrial:boolean){const issues=[...row.issues];if(!row.id)issues.push('셀 ID 없음');else if(rows.filter(r=>r.id===row.id).length>1)issues.push('중복 셀 ID');if(!row.cohort)issues.push('조건 그룹 없음');for(const k of keys)if(row[k]===null||!Number.isFinite(row[k])||row[k]!<=0)issues.push(`${metricLabels[k]} 미확보`);if(!includeTrial&&(row.source==='synthetic'||keys.some(k=>['synthetic','supplemented'].includes(row.origins?.[k]||''))))issues.push('합성·시험 보완값 제외');return issues;}
export function preparedCells(rows:FieldRow[],includeTrial:boolean,allRows:FieldRow[]=rows):ResearchCell[]{return rows.filter(r=>!rowProblems(r,allRows,includeTrial).length).map(r=>({id:r.id,cohort:r.cohort,voltage_mv:r.voltage_mv!,resistance_mohm:r.resistance_mohm!,capacity_mah:r.capacity_mah!}));}
export function relatedInspections(e:FieldEvidence,ids:Set<string>){return e.inspections.filter(t=>e.packs.some(p=>p.id===t.pack_id&&p.pack_cells.some(c=>ids.has(c.cell_id))));}

export function packLearningCases(e:FieldEvidence,selected:FieldRow[]){
 const selectedIds=new Set(selected.map(r=>r.id));
 return e.packs.filter(p=>p.pack_cells.some(c=>selectedIds.has(c.cell_id))).map(pack=>{
  const ids=pack.pack_cells.map(c=>c.cell_id),unique=[...new Set(ids)];const rows=e.rows.filter(r=>unique.includes(r.id));const problems:string[]=[];
  if(ids.length!==8||unique.length!==8)problems.push('고유 구성 셀 8개 필요');
  if(unique.some(id=>e.rows.filter(r=>r.id===id).length!==1))problems.push('구성 셀 원행 누락·중복');
  if(unique.some(id=>!selectedIds.has(id)))problems.push('선택 조건 밖 구성 셀 포함');
  if(rows.some(r=>rowProblems(r,e.rows,false).length))problems.push('측정 결측·오류 또는 합성·시험 보완값');
  if(rows.some(r=>r.source!=='measured'))problems.push('셀 측정의 실측 출처 확인 필요');
  if(rows.some(r=>r.measured_at&&Date.parse(r.measured_at)>Date.parse(pack.created_at)))problems.push('팩 구성 이후 측정값 · 조합 당시 입력 확인 필요');
  if(pack.source_kind!=='measured')problems.push('팩 구성의 실측 출처 확인 필요');
  if(rows.some(r=>!r.measured_at||!Number.isFinite(Date.parse(r.measured_at))))problems.push('셀 측정 시각 미확보');
  const inspections=e.inspections.filter(t=>t.pack_id===pack.id).map(record=>{
   const issues=[...problems];const at=Date.parse(record.created_at);
   if(record.evidence_kind!=='measured')issues.push('실측 검사 근거 확인 필요');
   if(!record.confirmed_name&&!record.created_by)issues.push('판정 작업자 미확보');
   if(!record.note?.trim())issues.push('판정 사유 미확보');
   if(!Number.isFinite(at))issues.push('판정 시각 미확보');
   if(!Number.isFinite(Date.parse(pack.created_at))||Date.parse(pack.created_at)>at)issues.push('팩 구성·판정 시각 확인 필요');
   if(rows.some(r=>r.measured_at&&Date.parse(r.measured_at)>at))issues.push('판정 이후 측정값 포함');
   return {record,issues};
  });
  const repeated=[...new Set(inspections.map(t=>t.record.kind))].filter(k=>inspections.filter(t=>t.record.kind===k).length>1);
  const conflicting=repeated.filter(k=>new Set(inspections.filter(t=>t.record.kind===k).map(t=>t.record.result)).size>1);
  return {pack,ids,rows,problems,inspections,repeated,conflicting};
 });
}
