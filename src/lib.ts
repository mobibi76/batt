import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import type { Cell } from '../supabase/functions/_shared/matching';
export const supabase=createClient('https://asfrsorbzmqhnwnxlxar.supabase.co','sb_publishable_LrFnxngIgK3b6vGzBd469Q_n-DSu3dy');
export type Profile={id:string;email:string;display_name:string;role:'admin'|'operator'|'viewer';status:'pending'|'approved'|'rejected'|'suspended';created_at:string};
export type Pack={id:string;serial_no:string;created_at:string;pack_cells:{cell_id:string;position:number}[]};
export type Inspection={id:string;pack_id:string;kind:'aging'|'final';result:'pass'|'fail';note:string;created_at:string};
export const number=(v:number,d=0)=>v.toLocaleString('ko-KR',{maximumFractionDigits:d});
export const date=(v:string)=>new Date(v).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
export function sampleCells():Cell[] {
  return Array.from({length:128},(_,i)=>({id:`DEMO-${String(i+1).padStart(4,'0')}`,lot:`DEMO-LOT-${Math.floor(i/32)+1}`,voltage_mv:3300+Math.floor(i/32)*4+(i%8)*0.6,resistance_mohm:Number((0.42+Math.floor(i/32)*0.003+(i%8)*0.0004).toFixed(5)),capacity_mah:30000+Math.floor(i/32)*120+(i%8)*18,status:'available',measured_at:'2026-10-14T00:00:00Z'}));
}
const fields=['id','lot','voltage_mv','resistance_mohm','capacity_mah','measured_at'] as const;
export function download(name:string,body:string,type='text/csv;charset=utf-8') {
  const url=URL.createObjectURL(new Blob(['\ufeff'+body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function template() { download('셀등록_양식.csv',Papa.unparse(sampleCells().slice(0,16).map(c=>Object.fromEntries(fields.map(k=>[k,c[k]]))))); }
export function validateRows(rows:Record<string,unknown>[]): {cells:Cell[];errors:string[]} {
  const errors:string[]=[]; const cells:Cell[]=[];const ids=new Set<string>();
  if(!rows.length||rows.length>5000) return {cells,errors:['파일당 1~5000개 셀을 등록할 수 있습니다.']};
  rows.forEach((r,i)=>{
    const prefix=`${i+2}행`; const id=String(r.id??'').trim(),lot=String(r.lot??'').trim();
    if(!id||!lot||id.length>80||lot.length>80) errors.push(`${prefix}: 셀 ID와 LOT를 80자 이내로 입력하세요.`);
    if(ids.has(id)) errors.push(`${prefix}: 셀 ID가 중복됩니다 (${id}).`);ids.add(id);
    const nums=['voltage_mv','resistance_mohm','capacity_mah'].map(k=>Number(r[k]));
    if(nums.some((n,j)=>!Number.isFinite(n)||n<=0||n>=[10000,1000,1000000][j]||Math.abs(n*[1000,100000,1000][j]-Math.round(n*[1000,100000,1000][j]))>0.00001)) errors.push(`${prefix}: 측정값의 범위·단위·소수점 자릿수를 확인하세요.`);
    const rawDate=String(r.measured_at??'');
    if(!/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(rawDate)||!Number.isFinite(Date.parse(rawDate))) errors.push(`${prefix}: 측정일시는 시간대가 있는 ISO 형식이어야 합니다.`);
    cells.push({id,lot,voltage_mv:nums[0],resistance_mohm:nums[1],capacity_mah:nums[2],status:'available',measured_at:rawDate});
  });return {cells,errors};
}
export async function readFile(file:File) {
  if(file.size>5*1024*1024) throw new Error('5MB 이하 파일을 선택하세요.');
  let rows:Record<string,unknown>[];
  if(file.name.toLowerCase().endsWith('.csv')) {
    const parsed=Papa.parse<Record<string,unknown>>(await file.text(),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim().replace(/^\ufeff/,'')});
    if(parsed.errors.length) throw new Error(`CSV 형식을 확인하세요: ${parsed.errors[0].message}`);
    rows=parsed.data;
  } else if(file.name.toLowerCase().endsWith('.xlsx')) {
    const {readSheet}=await import('read-excel-file/browser');const sheet=await readSheet(file,1);
    if(sheet.length>5001) throw new Error('파일당 최대 5000개 셀을 등록할 수 있습니다.');
    const headers=(sheet[0]||[]).map(v=>String(v??'').trim());
    rows=sheet.slice(1).filter(row=>row.some(v=>v!==null)).map(row=>Object.fromEntries(headers.map((h,col)=>{const v=row[col];return [h,v instanceof Date?v.toISOString():v];})));
  } else throw new Error('CSV 또는 XLSX 파일을 선택하세요.');
  return validateRows(rows);
}
export function qualitySummary(packs:Pack[],tests:Inspection[]) {
  const latest=new Map<string,Inspection>();
  [...tests].filter(t=>t.kind==='final').sort((a,b)=>a.created_at.localeCompare(b.created_at)).forEach(t=>latest.set(t.pack_id,t));
  const failed=[...latest.values()].filter(t=>t.result==='fail').length;
  const linked=packs.filter(p=>p.pack_cells?.length===8 && latest.has(p.id) && tests.some(t=>t.pack_id===p.id&&t.kind==='aging')).length;
  return {tested:latest.size,failed,rate:latest.size?100*failed/latest.size:null,linked,linkRate:packs.length?100*linked/packs.length:null};
}

export function inspectionQueues(packs: Pack[], tests: Inspection[]) {
  const aging = new Set(tests.filter(t => t.kind === 'aging').map(t => t.pack_id));
  const final = new Set(tests.filter(t => t.kind === 'final').map(t => t.pack_id));
  return {
    aging: packs.filter(p => !aging.has(p.id)).length,
    final: packs.filter(p => aging.has(p.id) && !final.has(p.id)).length,
  };
}
