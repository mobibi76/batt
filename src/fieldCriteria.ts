import {packByYield} from '../supabase/functions/_shared/packing';
import type {EvidenceCell} from '../supabase/functions/_shared/evidence';

// Source-specific comparison, deliberately separate from the production SOP contract.
export const fieldCriteria = {
 version:'JSI-FIELD-REVIEW-20261016',
 poc:{capacitySpread:500,voltageSpread:10,source:'PoC_셀매칭_결과.xlsx · 1_결과요약!A9'},
 practice:{capacitySpread:100,source:'2026-10-16 회의록 · 공정 데이터 현황 / 미결 사항 · 50~100mAh 재확인 대상'},
 process:['충방전 셀 전수검사 (128채널)','용량별 보관·8셀 선정','8S1P 모듈 검사 (케이싱 전)','케이싱 후 최종 출하검사'],
 unresolved:['개별 셀 용량·전압 합격 범위','모듈 부하검사 항목·한계값','케이싱 후 검사 장비 항목·시험 조건과 원자료 연결','출하 목표 평균 용량과 승인 기준표 버전'],
} as const;
type Row=Pick<EvidenceCell,'id'|'capacity_mah'|'voltage_mv'>;
const valid=(n:number|null):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function assessFieldGroup(rows:Row[],target=100){
 if(!Number.isFinite(target)||target<=0||target>500)throw Error('용량 조합 목표는 0 초과 500mAh 이하로 입력하세요.');
 const complete=rows.length===8&&new Set(rows.map(r=>r.id)).size===8&&rows.every(r=>valid(r.capacity_mah)&&valid(r.voltage_mv));
 if(!complete)return {status:'unverified' as const,capacitySpread:null,voltageSpread:null,meanCapacity:null,minCapacity:null,practiceMet:false};
 const caps=rows.map(r=>r.capacity_mah!),volts=rows.map(r=>r.voltage_mv!);
 const capacitySpread=Number((Math.max(...caps)-Math.min(...caps)).toFixed(3));
 const voltageSpread=Number((Math.max(...volts)-Math.min(...volts)).toFixed(3));
 return {status:capacitySpread<=500&&voltageSpread<=10?'pass' as const:'fail' as const,capacitySpread,voltageSpread,meanCapacity:caps.reduce((a,b)=>a+b,0)/8,minCapacity:Math.min(...caps),practiceMet:capacitySpread<=target&&voltageSpread<=10};
}
export function planFieldGroups(input:EvidenceCell[],target=100){
 assessFieldGroup([],target);
 if(input.length>500)throw Error('현장 비교는 최대 500셀입니다.');
 if(new Set(input.map(r=>r.id)).size!==input.length)throw Error('중복 셀 ID를 확인하세요.');
 const eligible=input.filter(r=>r.state==='ready'&&valid(r.capacity_mah)&&valid(r.voltage_mv));
 const groups=packByYield(eligible,target);
 const used=new Set(groups.flatMap(g=>g.map(r=>r.id)));
 return {version:fieldCriteria.version,target,eligible:eligible.length,excluded:input.filter(r=>!eligible.includes(r)).map(r=>r.id),groups:groups.map(rows=>({ids:rows.map(r=>r.id),channels:rows.map(r=>r.channel),lot:rows[0].lot||null,...assessFieldGroup(rows,target)})),unused:eligible.filter(r=>!used.has(r.id)).map(r=>r.id)};
}
