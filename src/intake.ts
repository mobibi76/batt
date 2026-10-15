import type {EvidenceCell,SourceKind} from '../supabase/functions/_shared/evidence';
export type Intake = {name:string;hash:string;source_kind:SourceKind;mapping_version:string;headers:unknown[][];rows:EvidenceCell[];warnings:string[]};
const scalar=(v:unknown)=>v===null||v===undefined||String(v).trim()===''?null:Number(v);
export function parseIntake(sheet:unknown[][],name:string,hash:string):Intake {
 if(sheet.length<2||sheet.length>5002)throw Error('1~5000개의 측정행이 필요합니다.');
 const headers=sheet[0].map(v=>String(v??'').trim());
 const grading=headers[1]==='Channel'&&headers[2]?.toLowerCase().includes('barcode')&&headers.length===88;
 if(grading&&(!String(headers[3]).includes('OpenVoltage')||!String(headers[40]).includes('Cutoff Cap')))throw Error('Cell Grading 컬럼 구조가 다릅니다. 매핑을 확인하세요.');
 if(!grading&&!['id','lot','voltage_mv','capacity_mah','measured_at'].every(k=>headers.includes(k)))throw Error('지원 양식: Cell Grading 88열 또는 표준 셀 양식입니다.');
 const seen=new Set<string>();
 const rows=sheet.slice(grading?2:1).filter(row=>row.some(v=>v!==null&&v!==undefined&&v!=='')).map((row,i)=>{
  const issues:string[]=[];const record=Object.fromEntries(headers.map((h,j)=>[h,row[j]]));
  const rowNo=i+(grading?3:2),channel=String(grading?row[1]??'':record.id??'').trim();
  const barcode=String(grading?row[2]??'':record.id??'').trim();
  const id=barcode||`TMP-${hash.slice(0,12)}-${channel||rowNo}`;
  if(!barcode)issues.push('셀 바코드 없음 · 파일 해시 기반 임시 ID');
  if(seen.has(id))throw Error(`${rowNo}행: 셀 ID 중복 (${id})`);seen.add(id);
  let voltage=scalar(grading?row[3]:record.voltage_mv),resistance=scalar(grading?null:record.resistance_mohm),capacity=scalar(grading?row[40]:record.capacity_mah);
  const values=[voltage,resistance,capacity];
  values.forEach((v,j)=>{if(v!==null&&(!Number.isFinite(v)||v<=0||v>=[10000,1000,1000000][j]||Math.abs(v*[1000,100000,1000][j]-Math.round(v*[1000,100000,1000][j]))>.00001)){issues.push(['전압','내부저항','용량'][j]+' 값·정밀도 오류');values[j]=null;}});
  [voltage,resistance,capacity]=values;
  if(resistance===null)issues.push('내부저항 미측정 · 전체 SOP 미검증');
  if(voltage===null||capacity===null)issues.push('전압 또는 방전용량 미완료');
  const equipmentError=grading&&row.some(v=>String(v).includes('CurrentError'));
  if(equipmentError)issues.push('장비 CurrentError');
  const date=grading?row[85]:record.measured_at;
  // Device-local times cannot silently acquire a timezone.
  const iso=date instanceof Date?null:String(date??'');
  const measured_at=iso&&/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(iso)&&Number.isFinite(Date.parse(iso))?iso:null;
  if(!measured_at)issues.push('측정 시각 시간대 확인 필요');
  return {row_no:rowNo,id,channel,lot:grading?null:String(record.lot??'').trim()||null,voltage_mv:voltage,resistance_mohm:resistance,capacity_mah:capacity,measured_at,issues,state:(equipmentError||voltage===null||capacity===null?'held':'ready') as EvidenceCell['state'],raw:row};
 });
 return {name,hash,source_kind:grading?'reconstructed':'unknown',mapping_version:grading?'cell-grading-88-v1':'canonical-v1',headers:sheet.slice(0,grading?2:1),rows,warnings:grading?['OCV=D열, 방전용량=AO열(mAh). 내부저항은 제공되지 않음.','채널은 영구 셀 식별자가 아닙니다. 임시 ID는 같은 파일 안의 추적용입니다.','장비 시각의 시간대·원본성·제품 규격은 고객 확인 필요. 원행과 2단 헤더를 함께 보존합니다.']:['출처를 지정하고 측정 조건을 확인하세요.']};
}
export async function readIntake(file:File):Promise<Intake>{
 if(file.size>5*1024*1024)throw Error('5MB 이하 파일을 선택하세요.');
 const bytes=await file.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
 let sheet:unknown[][];
 if(file.name.toLowerCase().endsWith('.xlsx')){const {readSheet}=await import('read-excel-file/browser');sheet=await readSheet(file,1);}
 else if(file.name.toLowerCase().endsWith('.csv')){const {default:Papa}=await import('papaparse');const result=Papa.parse(new TextDecoder().decode(bytes),{skipEmptyLines:'greedy'});if(result.errors.length)throw Error('CSV 형식을 확인하세요.');sheet=result.data as unknown[][];}
 else throw Error('CSV 또는 XLSX 파일을 선택하세요.');
 return parseIntake(sheet,file.name,hash);
}
