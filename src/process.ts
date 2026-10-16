import type {Inspection,Pack} from './lib';
export const inspectionNames={aging:'에이징 (기존 기록)',module:'모듈 검사',casing:'케이싱 확인',final:'최종검사'} as const;
export const fieldSteps=[
 {id:'grading',name:'셀 충방전 검사',detail:'128채널 측정 파일 등록 · 오류·미완료 셀 검토'},
 {id:'storage',name:'용량별 분류·보관',detail:'AO열 방전용량 확인 · 사용 가능·보류 재고 구분'},
 {id:'assembly',name:'8셀 조합',detail:'용량 차 ≤500mAh · OCV 차 ≤10mV · 통과 팩 수 우선'},
 {id:'module',name:'모듈 검사',detail:'케이싱 전 8S1P 모듈 검사 결과 기록'},
 {id:'casing',name:'케이싱',detail:'모듈 검사 합격 후 케이싱 완료 확인'},
 {id:'final',name:'최종검사',detail:'케이싱 후 완성품 Pass/Fail 기록 · 별도 품질 승인'},
] as const;
export function inspectionOrder(pack:Pack):Inspection['kind'][] {return pack.process_version==='field-v1'?['module','casing','final']:['aging','final'];}
export function processChecks(pack:Pack,tests:Inspection[]){
 const checks:Partial<Record<Inspection['kind'],Inspection>>={};let previous:Inspection|undefined;
 for(const kind of inspectionOrder(pack)){
  const latest=tests.filter(t=>t.pack_id===pack.id&&t.kind===kind).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0];
  if(pack.process_version!=='field-v1'){if(latest)checks[kind]=latest;continue;}
  // A new upstream result requires downstream work to be recorded again.
  if(latest&&(!previous||latest.created_at>=previous.created_at)){checks[kind]=latest;previous=latest;}else break;
  if(latest.result!=='pass')break;
 }
 return checks;
}
