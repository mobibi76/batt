import type {Layout, Device} from './model';
export const stages=['grading','storage','assembly','module','casing','final'] as const;
export type Stage=typeof stages[number];
export const stageNames:Record<Stage,string>={grading:'셀 충방전 검사',storage:'분류·보관',assembly:'8셀 조합',module:'모듈 검사',casing:'케이싱',final:'최종검사'};
export const measurements={cell_id:'셀 ID',pack_id:'팩 ID',timestamp:'측정 시각',voltage:'전압',current:'전류',capacity:'방전용량',temperature:'온도',resistance:'내부저항',cycle:'충방전 사이클',conditions:'시험 조건',outcome:'검사 결과',life_label:'수명 종료·중단 기록'} as const;
export type Measurement=keyof typeof measurements;
export type StationPlan={stage:Stage;minutes:number;handling:number;transfer:number;batch:number;parallel:number;unit:'cell'|'pack';data:Measurement[]};
export type ProcessPlan={version:1;quantity:number;basis:string;stations:Record<string,StationPlan>};
export function validatePlan(raw:unknown,devices:Device[]):ProcessPlan{
 const p=raw as ProcessPlan;
 if(!p||p.version!==1||!Number.isInteger(p.quantity)||p.quantity<1||p.quantity>10000||typeof p.basis!=='string'||!p.basis.trim()||p.basis.length>1000||!p.stations||Object.keys(p.stations).length!==devices.length)throw Error('목표 수량·추정 근거·장비별 작업 조건을 확인하세요.');
 const stations:Record<string,StationPlan>={};
 for(const d of devices){const s=p.stations[d.id];if(!s||!stages.includes(s.stage)||!['cell','pack'].includes(s.unit)||!Array.isArray(s.data)||s.data.some(k=>!Object.hasOwn(measurements,k))||new Set(s.data).size!==s.data.length)throw Error('장비별 공정과 확보 데이터 정의를 확인하세요.');
 for(const k of ['minutes','handling','transfer'] as const)if(!Number.isFinite(s[k])||s[k]<0||s[k]>525600)throw Error('작업시간은 0~525600분 범위입니다.');
 if(s.minutes+s.handling<=0||!Number.isInteger(s.batch)||s.batch<1||s.batch>10000||!Number.isInteger(s.parallel)||s.parallel<1||s.parallel>100)throw Error('처리시간·동시 처리 수·병렬 장비 수를 확인하세요.');
 if(s.unit==='cell'&&(s.batch<8||s.batch%8!==0))throw Error('현재 모델의 셀 동시 처리 수는 8의 배수입니다. 8셀을 팩 1개분으로 계산합니다.');
 stations[d.id]={stage:s.stage,minutes:s.minutes,handling:s.handling,transfer:s.transfer,batch:s.batch,parallel:s.parallel,unit:s.unit,data:[...s.data]};}
 return {version:1,quantity:p.quantity,basis:p.basis.trim(),stations};
}
export function orderedDevices(l:Layout):Device[]{
 const roots=l.devices.filter(d=>!l.links.some(e=>e.to===d.id));
 if(roots.length!==1||l.links.length!==l.devices.length-1)throw Error('모든 장비를 하나의 작업 순서로 연결하세요.');
 const result:Device[]=[];let d:Device|undefined=roots[0];
 while(d){if(result.includes(d))throw Error('순환 공정은 지원하지 않습니다.');result.push(d);const next=l.links.find(e=>e.from===d!.id)?.to;d=l.devices.find(x=>x.id===next);}
 if(result.length!==l.devices.length)throw Error('연결되지 않은 장비가 있습니다.');return result;
}
export function publicationError(l:Layout):string|null{
 try{if(!l.plan)throw Error('운영 반영에는 작업·데이터 계획이 필요합니다.');const plan=validatePlan(l.plan,l.devices),ordered=orderedDevices(l);const route=ordered.map(d=>plan.stations[d.id].stage);if(stages.some(s=>!route.includes(s))||route.some((s,i)=>i>0&&stages.indexOf(s)<stages.indexOf(route[i-1])))throw Error('운영 반영은 셀 검사 → 보관 → 조합 → 모듈 검사 → 케이싱 → 최종검사 순서를 모두 포함해야 합니다.');return null;}catch(e){return (e as Error).message;}
}
export type StageResult={id:string;name:string;start:number;end:number;waiting:number;work:number;capacity:number;batches:number};
export type Estimate={total:number;first:number;single:number;labor:number;throughput:number;bottleneck:string;rows:StageResult[]};
export function estimate(l:Layout,quantity=l.plan?.quantity):Estimate{
 if(!l.plan)throw Error('작업 조건을 먼저 설정하세요.');const p=validatePlan(l.plan,l.devices);if(!Number.isInteger(quantity)||quantity!<1||quantity!>10000)throw Error('목표 수량은 1~10000팩입니다.');
 const order=orderedDevices(l);let arrivals=Array<number>(quantity!).fill(0),labor=0,single=0;const rows:StageResult[]=[];
 for(const d of order){const s=p.stations[d.id],batch=s.unit==='cell'?s.batch/8:s.batch,duration=s.minutes+s.handling;const lanes=Array<number>(s.parallel).fill(0),output:number[]=[];let waiting=0,first=Infinity,batches=0;
 for(let i=0;i<arrivals.length;i+=batch){const group=arrivals.slice(i,i+batch),lane=lanes.indexOf(Math.min(...lanes)),start=Math.max(lanes[lane],group[group.length-1]);const finish=start+duration;lanes[lane]=finish;first=Math.min(first,start);waiting+=group.reduce((n,t)=>n+start-t,0);group.forEach(()=>output.push(finish+s.transfer));batches++;}
 arrivals=output.sort((a,b)=>a-b);labor+=batches*s.handling;single+=duration+s.transfer;
 rows.push({id:d.id,name:d.name,start:first,end:arrivals[arrivals.length-1],waiting:waiting/quantity!,work:duration,capacity:60*batch*s.parallel/duration,batches});
 }
 const total=arrivals[arrivals.length-1];return {total,first:arrivals[0],single,labor,throughput:quantity!*60/total,bottleneck:rows.reduce((a,b)=>a.capacity<=b.capacity?a:b).id,rows};
}
export function dataCoverage(l:Layout){const data=new Set(Object.values(l.plan?.stations??{}).flatMap(s=>s.data));return [
 {name:'셀 조합 비교',needs:['cell_id','voltage','capacity'] as Measurement[]},
 {name:'조합 이후 품질 분석',needs:['cell_id','pack_id','timestamp','conditions','outcome'] as Measurement[]},
 {name:'수명·열화 분석 준비',needs:['cell_id','timestamp','cycle','voltage','current','capacity','temperature','conditions','life_label'] as Measurement[]},
 {name:'온도·부하별 이상징후 분석 준비',needs:['cell_id','pack_id','timestamp','voltage','current','temperature','conditions','outcome'] as Measurement[]}
 ].map(r=>({...r,missing:r.needs.filter(k=>!data.has(k))}));}
export function defaultStation(stage:Stage):StationPlan{return {stage,minutes:1,handling:1,transfer:0,batch:1,parallel:1,unit:'pack',data:[]};}
export function planningLayout():Layout{
 const kinds:Device['kind'][]=['cycler','bench','bench','meter','bench','inspection'];
 const coords=[[-6,-3],[0,-3],[6,-3],[6,3],[0,3],[-6,3]];
 const data:Measurement[][]=[['cell_id','timestamp','voltage','current','capacity'],['cell_id'],['cell_id','pack_id'],['pack_id','voltage','outcome'],['pack_id'],['pack_id','voltage','outcome']];
 const stations:Record<string,StationPlan>={};const devices=stages.map((stage,i)=>{stations[stage]={...defaultStation(stage),minutes:i===0?660:i===2?0:3,handling:i===0?5:i===2?14:1,unit:i===0?'cell':'pack',batch:i===0?128:1,data:data[i]};return {id:stage,kind:kinds[i],name:stageNames[stage],model:'계획 장비 · 실제 사양 확인 필요',x:coords[i][0],z:coords[i][1],rotation:0,cycle:1,tags:[{key:'planned',label:'계획 항목',unit:'-',nominal:0,high:null}]};});
 return {version:1,source:'simulation',devices,links:devices.slice(1).map((d,i)=>({from:devices[i].id,to:d.id})),plan:{version:1,quantity:16,basis:'예시 가정: 충방전 660분·128셀, 조합 14분. 회의·제안 수치를 참고한 예시이며 나머지 시간과 인력 조건은 가정입니다. 현장 실측으로 수정하세요.',stations}};
}
export function durationText(minutes:number){return minutes<60?`${Number(minutes.toFixed(1))}분`:`${Math.floor(minutes/60)}시간 ${Number((minutes%60).toFixed(1))}분`;}
