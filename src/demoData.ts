import type {Intake} from './intake';
import type {Cell} from '../supabase/functions/_shared/matching';
export type Origin='provided'|'supplemented'|'synthetic';
export type Provenance={field_origins?:Partial<Record<string,Origin>>;source_kind?:string};
export type SourceTable={file:string;sheet:string;header_rows?:number;rows:(string|number|boolean|null)[][]};
export type PrivateDataset={version:1;source_tables?:SourceTable[];intake:Intake;files:{name:string;sha256:string;created:string|null;modified:string|null;provided_at:null}[];verification:{valid:number;held:number;sequence_mean:number;poc_mean:number;improvement_percent:number;poc_two_criteria_pass:number;algorithm_reproduced:false}};
export function originOf(row:Provenance,field:string):Origin|undefined{return row.field_origins?.[field]||(row.source_kind==='synthetic'?'synthetic':undefined);}
export function demoCellsFrom(dataset:PrivateDataset):Cell[]{
 return dataset.intake.rows.filter(r=>r.state==='ready'&&r.voltage_mv!==null&&r.capacity_mah!==null).map(r=>({
  id:r.id,lot:'DEMO-CUSTOMER-BATCH',voltage_mv:r.voltage_mv!,capacity_mah:r.capacity_mah!,
  resistance_mohm:0.42,status:'available',measured_at:'2000-01-01T00:00:00Z',source_kind:'synthetic',
  field_origins:{id:'supplemented',lot:'supplemented',voltage_mv:'provided',capacity_mah:'provided',resistance_mohm:'supplemented',measured_at:'supplemented'},
 }));
}
export function validatePrivateDataset(value:unknown):PrivateDataset{
 const d=value as PrivateDataset;
 if(d?.version!==1||!Array.isArray(d.intake?.rows)||!d.intake.rows.length||d.intake.rows.length>500||!Array.isArray(d.files)||!d.verification)throw Error('비공개 체험 자료 형식을 확인하세요.');
 if(d.intake.rows.some(r=>!r.id||![r.voltage_mv,r.capacity_mah,r.resistance_mohm].every(v=>v===null||Number.isFinite(v))))throw Error('비공개 체험 측정값 형식 오류');
 if(d.source_tables&&(!Array.isArray(d.source_tables)||d.source_tables.length>20||d.source_tables.some(t=>!t.file||!t.sheet||!Array.isArray(t.rows)||t.rows.length>5002||t.rows.some(r=>!Array.isArray(r)||r.length>200||r.some(v=>v!==null&&!['string','number','boolean'].includes(typeof v))))))throw Error('원본 테이블 형식 오류');
 return d;
}
