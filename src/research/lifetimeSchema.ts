import Papa from 'papaparse';
import {seversonEvidence} from './seversonEvidence';

export const reference={id:'severson-variance-100-10-v1',title:'Severson · 초기 방전 곡선 기반 수명 회귀',doi:seversonEvidence.paper.doi,paper:seversonEvidence.paper.url,processing:seversonEvidence.code.url,evidence:seversonEvidence,scope:'10·100사이클 Q(V) 입력 준비도. 데이터 구조·기초 품질·신고 조건 비교이며 수명 예측·성능 인증·현장 승인 아님.'};
export const requiredColumns=['cell_id','cycle','voltage_v','discharge_capacity_ah'];
export const conditionColumns=['cell_model','chemistry','nominal_capacity_ah','chamber_temperature_c','discharge_c_rate','discharge_cutoff_v','charge_policy','rest_protocol','preprocessing_note','source_record'];
export const labelColumns=['cycle_life_cycles','eol_capacity_fraction','test_status'];
export const columnHelp:Record<string,string>={cell_id:'동일 물리 셀의 고유 ID',cycle:'실제 사이클 번호 (양의 정수)',voltage_v:'방전 곡선 전압 (V)',discharge_capacity_ah:'해당 전압의 누적 방전용량 (Ah)',cell_model:'셀 제조사·모델',chemistry:'전극 조합 (예: LFP/graphite)',nominal_capacity_ah:'공칭 용량 (Ah)',chamber_temperature_c:'챔버 설정 온도 (°C); 셀 온도와 구분',discharge_c_rate:'방전율 (C)',discharge_cutoff_v:'방전 종료 전압 (V)',charge_policy:'단계별 충전 전류·전환 SOC·종료 조건',rest_protocol:'휴지 위치·시간',preprocessing_note:'곡선 전처리·제외·보정 내역',source_record:'원시 기록 식별자 또는 출처',cycle_life_cycles:'종료 기준 도달 사이클 (양의 정수)',eol_capacity_fraction:'공칭 용량 대비 종료 비율 (예: 0.8)',test_status:'completed / censored (시험 중단)'};
export type CheckStatus='missing'|'difference'|'unknown'|'met';
export type Finding={id:string;category:'schema'|'quality'|'conditions'|'labels';status:CheckStatus;title:string;detail:string;action:string};
export type Validation={reference:typeof reference;rowCount:number;cellCount:number;columns:string[];findings:Finding[];counts:Record<CheckStatus,number>};
type Row=Record<string,string>;
const finite=(s:string|undefined)=>s!==undefined&&s.trim()!==''&&Number.isFinite(Number(s));
export function validateLifetimeCsv(text:string):Validation{
 if(new TextEncoder().encode(text).length>5*1024*1024)throw Error('CSV는 최대 5MB입니다.');
 const parsed=Papa.parse<Row>(text,{header:true,skipEmptyLines:'greedy',transformHeader:s=>s.trim().replace(/^\ufeff/,'')});
 if(parsed.errors.length||Object.keys(parsed.meta.renamedHeaders??{}).length)throw Error('CSV 구문·중복 컬럼·행별 컬럼 수를 확인하세요.');
 const rows=parsed.data,columns=parsed.meta.fields??[];
 if(!rows.length||rows.length>20000)throw Error('데이터 행은 1–20,000개여야 합니다.');
 const findings:Finding[]=[];
 const add=(id:string,category:Finding['category'],status:CheckStatus,title:string,detail:string,action:string)=>findings.push({id,category,status,title,detail,action});
 for(const key of requiredColumns)add('column-'+key,'schema',columns.includes(key)?'met':'missing',columnHelp[key],columns.includes(key)?`${key} 컬럼 존재 · 값의 유효성은 품질 검사에서 별도 확인`:`${key} 컬럼 없음`,'단위가 명시된 표준 컬럼으로 내보내세요. 임의 단위 추정은 하지 않습니다.');
 const groups=new Map<string,Row[]>();
 for(const r of rows){const id=r.cell_id?.trim();if(id){const group=groups.get(id)??[];group.push(r);groups.set(id,group);}}
 const invalid=rows.flatMap((r,i)=>!r.cell_id?.trim()||!finite(r.cycle)||!Number.isInteger(Number(r.cycle))||Number(r.cycle)<1||!finite(r.voltage_v)||Number(r.voltage_v)<=0||!finite(r.discharge_capacity_ah)||Number(r.discharge_capacity_ah)<0?[i+2]:[]);
 add('values','quality',invalid.length?'missing':'met','필수값·단위 형식',invalid.length?`${invalid.length}행 결측 또는 잘못된 수치. 파일 행 예: ${invalid.slice(0,5).join(', ')}`:'필수 문자열·유한 수치·양의 사이클 확인. 측정 단위의 진위까지 확인한 것은 아닙니다.','공란·NaN·잘못된 사이클을 원자료와 대조하세요.');
 let duplicate=0;const seen=new Set<string>();for(const r of rows){const key=JSON.stringify(requiredColumns.map(k=>r[k]?.trim()));if(seen.has(key))duplicate++;seen.add(key);}
 add('duplicate','quality',duplicate?'missing':'met','중복 관측',`${duplicate}개 동일 셀·사이클·전압·용량 중복`,'이어 측정과 중복 반입을 구분하고 원본 이력을 보존하세요.');
 const missingCycles:string[]=[],badGrid:string[]=[],badShape:string[]=[];
 for(const [id,rs] of groups){for(const cycle of [10,100]){const curve=rs.filter(r=>Number(r.cycle)===cycle);if(!curve.length){missingCycles.push(`${id}/${cycle}`);continue;}
  const volts=curve.map(r=>Number(r.voltage_v)).sort((a,b)=>b-a);
  if(volts.length!==1000||volts.some((v,i)=>!Number.isFinite(v)||Math.abs(v-(3.5-1.5*i/999))>1e-6))badGrid.push(`${id}/${cycle}`);
  const ordered=[...curve].sort((a,b)=>Number(b.voltage_v)-Number(a.voltage_v));
  if(ordered.some((r,i)=>i>0&&Number(r.discharge_capacity_ah)+1e-9<Number(ordered[i-1].discharge_capacity_ah)))badShape.push(`${id}/${cycle}`);
 }}
 add('cycles','quality',!groups.size||missingCycles.length?'missing':'met','10·100사이클 쌍',missingCycles.length?`${missingCycles.length}개 곡선 누락. 예: ${missingCycles.slice(0,3).join(', ')}`:groups.size?'모든 식별 셀에 두 사이클 기록 존재':'식별 가능한 셀 없음','10·100사이클 실측 방전 곡선을 확보하세요. 수명 100사이클 미만 셀의 이력을 합성하지 않습니다.');
 add('grid','quality',!groups.size||missingCycles.length?'unknown':badGrid.length?'missing':'met','공통 전압 좌표',badGrid.length?`${badGrid.length}개 곡선이 3.5–2.0V의 균등 1,000지점과 다릅니다. 예: ${badGrid.slice(0,3).join(', ')}`:'존재하는 곡선의 좌표 검사. 허용 오차 0.000001V는 앱 수치 비교 기준입니다.','원 연구의 스플라인·보간 절차를 별도로 재현하세요. 이 검사는 보간을 실행하거나 방법의 적절성을 인증하지 않습니다.');
 add('curve-shape','quality',invalid.length||!groups.size||missingCycles.length?'unknown':badShape.length?'missing':'met','누적 방전용량 방향',badShape.length?`${badShape.length}개 곡선에 전압 감소 중 누적 용량 역전 존재`:'존재하는 곡선에서 전압 내림차순 누적 용량을 검사합니다.','단위·좌표 정렬·측정 잡음·보간 오차를 검토하세요. 작은 역전도 검토 대상으로 표시하며 자동 보정하지 않습니다.');
 const fixed:[string,string|number,string][]=[['cell_model','APR18650M1A','A123 APR18650M1A'],['chemistry','LFP/graphite','LFP/graphite'],['nominal_capacity_ah',1.1,'1.1Ah'],['chamber_temperature_c',30,'챔버 설정 30°C'],['discharge_c_rate',4,'4C'],['discharge_cutoff_v',2,'2.0V']];
 for(const [key,expected,label] of fixed){const values=rows.map(r=>r[key]?.trim()??'');const missing=values.filter(v=>!v).length;const different=values.filter(v=>v&&(typeof expected==='number'?(!finite(v)||Math.abs(Number(v)-expected)>1e-9):v.toLowerCase()!==String(expected).toLowerCase())).length;
  const supplied=[...new Set(values.filter(Boolean))].slice(0,3).map(v=>v.slice(0,80)).join(', ')||'없음';
  add(key,'conditions',different?'difference':missing?'unknown':'met',columnHelp[key],`연구 기준 ${label} · 제공값 ${supplied} · 누락 ${missing}행 · 다른 값 ${different}행. 신고값 비교입니다.`,'조건 차이는 데이터 불량이 아닙니다. 실제 시험 설정·장비 기록을 확인하고 외부 적용성 시험을 설계하세요.');
 }
 for(const key of ['charge_policy','rest_protocol','preprocessing_note','source_record']){const missing=rows.filter(r=>!r[key]?.trim()).length;add(key,'conditions','unknown',columnHelp[key],missing?`${missing}행에 근거 기록 없음`:'기록은 있으나 자유 서술의 연구 조건 일치 여부는 자동 인증하지 않습니다.','원 연구 배치별 충전·휴지 조건 및 정제 내역과 담당자가 대조하세요.');}
 const inconsistent:string[]=[];for(const [id,rs] of groups){for(const key of [...fixed.map(f=>f[0]),...labelColumns]){const values=new Set(rs.map(r=>r[key]?.trim()).filter(Boolean));if(values.size>1)inconsistent.push(`${id}/${key}`);}}
 add('metadata','quality',inconsistent.length?'missing':'met','셀별 조건·정답 일관성',inconsistent.length?`불일치 ${inconsistent.length}항목. 예: ${inconsistent.slice(0,3).join(', ')}`:'같은 셀 ID 안의 고정 조건·정답 충돌 없음. 빈 항목은 별도 미확인 처리.','서로 다른 물리 셀의 ID 충돌 또는 조건 변경을 확인하세요.');
 const badLabels=rows.filter(r=>!finite(r.cycle_life_cycles)||!Number.isInteger(Number(r.cycle_life_cycles))||Number(r.cycle_life_cycles)<Number(r.cycle)||r.test_status?.trim()!=='completed').length;
 add('labels','labels',badLabels?'unknown':'met','성능 평가용 수명 정답',badLabels?`${badLabels}행 정답 누락·불일치 또는 시험 미완료`:'completed와 양의 정수 수명 정답 존재. 원시 전체 이력에 의한 진위 검증은 별도 필요.','시험 중단(censored)을 수명 종료로 바꾸지 마세요. 특징 입력에는 선택 항목이나 성능 평가에는 정답이 필요합니다.');
 const eolValues=rows.map(r=>r.eol_capacity_fraction?.trim()??'');
 add('eol','labels',eolValues.some(v=>v&&(!finite(v)||Math.abs(Number(v)-.8)>1e-9))?'difference':eolValues.some(v=>!v)?'unknown':'met','수명 종료 정의', `연구 기준: 공칭 용량의 80% 도달(0.8). 제공값 ${[...new Set(eolValues.filter(Boolean))].slice(0,3).map(v=>v.slice(0,40)).join(', ')||'없음'} · 누락 ${eolValues.filter(v=>!v).length}행.`,'실측 용량 기준과 도달 판정 절차를 문서화하세요. 다른 정의는 별도 비교군으로 관리하세요.');
 add('evaluation','labels','unknown','독립 평가·정제 이력','셀 단위 학습/평가 분리, 이후 확보한 평가 자료, 제외·이어 측정 근거는 CSV 구조만으로 검증할 수 없습니다.','연구의 41/43/40셀 평가 설계를 참고해 별도 시험 계획을 작성하세요. 해당 수량 자체는 합격 기준이 아닙니다.');
 const counts={missing:0,difference:0,unknown:0,met:0};for(const f of findings)counts[f.status]++;
 return {reference,rowCount:rows.length,cellCount:groups.size,columns,findings,counts};
}
export function validationTemplate(){return [...requiredColumns,...conditionColumns,...labelColumns].join(',')+'\n';}
export function validationExample(){return validationTemplate()+[...Array(4)].map((_,i)=>`SYNTHETIC-EXAMPLE,${i<2?10:100},${i%2?2:3.5},${i%2?1:0},APR18650M1A,LFP/graphite,1.1,30,4,2,example only,not recorded,not interpolated,synthetic,,0.8,censored`).join('\n');}
