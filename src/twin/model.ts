export type Kind = 'scanner' | 'meter' | 'bench' | 'welder' | 'cycler' | 'inspection';
export type Tag = { key:string; label:string; unit:string; nominal:number; high:number|null };
export type Device = { id:string; kind:Kind; name:string; model:string; x:number; z:number; rotation:number; cycle:number; tags:Tag[] };
export type Layout = { version:1; source:'simulation'; devices:Device[]; links:{from:string;to:string}[] };
export const catalog:Record<Kind,{name:string;reference:string;url:string;description:string;cycle:number;tags:Tag[]}> = {
 scanner:{name:'식별 리더',reference:'Cognex DataMan 280',url:'https://docs.cognex.com/dmst_6114/web/EN/DM280_Manual/Content/Topics/specifications/specifications-280.htm',description:'코드 식별 장비 참고. 가상 작업 ID를 발급합니다.',cycle:2,tags:[{key:'read_rate',label:'모의 판독률',unit:'%',nominal:99,high:null}]},
 meter:{name:'셀 측정기',reference:'HIOKI BT3562A',url:'https://www.hioki.com/global/products/resistance-meters/battery/id_6826',description:'OCV·AC 내부저항 측정기 참고. 측정 조건은 실제 장비 확인 후 매핑합니다.',cycle:3,tags:[{key:'voltage',label:'전압',unit:'mV',nominal:3300,high:3400},{key:'resistance',label:'AC 내부저항',unit:'mΩ',nominal:0.42,high:0.6}]},
 bench:{name:'매칭·조립대',reference:'JSI 가상 작업대',url:'',description:'추천·작업자 승인·조립의 논리 공정. 실제 자동 승인 기능은 없습니다.',cycle:4,tags:[{key:'temperature',label:'작업대 온도',unit:'°C',nominal:25,high:45}]},
 welder:{name:'접합 장비',reference:'AMADA WELD TECH 기술 자료',url:'https://amadaweldtech.com/technical-whitepaper/battery-welding-using-laser-resistance-and-micro-tig-technologies/',description:'배터리 접합 공정 참고. 실제 용접 방식·조건은 미확정입니다.',cycle:3,tags:[{key:'temperature',label:'모의 하우징 온도',unit:'°C',nominal:32,high:55}]},
 cycler:{name:'충방전·에이징 랙',reference:'Chroma 17020',url:'https://www.chromaate.com/en/product/regenerative_battery_pack_test_system_17020_221',description:'다채널 충방전 시험 장비 참고. 시간은 교육용으로 축약합니다.',cycle:8,tags:[{key:'voltage',label:'팩 전압',unit:'V',nominal:26.4,high:29.2},{key:'current',label:'전류',unit:'A',nominal:3,high:5},{key:'temperature',label:'팩 표면 온도',unit:'°C',nominal:28,high:45}]},
 inspection:{name:'최종검사대',reference:'JSI 가상 검사대',url:'',description:'가상 작업의 최종 판정. 매 7번째 작업을 모의 불합격으로 처리합니다.',cycle:3,tags:[{key:'voltage',label:'팩 전압',unit:'V',nominal:26.4,high:29.2}]}
};
export const kinds=Object.keys(catalog) as Kind[];
export function device(kind:Kind,id:string,x:number,z:number):Device { return {id,kind,name:catalog[kind].name,model:catalog[kind].reference,x,z,rotation:0,cycle:catalog[kind].cycle,tags:structuredClone(catalog[kind].tags)}; }
export function defaultLayout():Layout {
 const positions=[[-6,-3],[0,-3],[6,-3],[6,3],[0,3],[-6,3]];
 const devices=kinds.map((k,i)=>device(k,`EQ-${i+1}`,positions[i][0],positions[i][1]));
 return {version:1,source:'simulation',devices,links:devices.slice(1).map((d,i)=>({from:devices[i].id,to:d.id}))};
}
export function canPlace(layout:Layout,id:string,x:number,z:number) { return Number.isInteger(x)&&Number.isInteger(z)&&Math.abs(x)<=10&&Math.abs(z)<=10&&!layout.devices.some(d=>d.id!==id&&Math.abs(d.x-x)<2&&Math.abs(d.z-z)<2); }
export function validateLayout(value:unknown):Layout {
 const l=value as Layout;
 const fail=()=>{throw Error('공정 파일의 장비·태그·좌표·연결 형식을 확인하세요.');};
 if(!l||l.version!==1||l.source!=='simulation'||!Array.isArray(l.devices)||!Array.isArray(l.links)||l.devices.length>30||l.links.length>29)fail();
 const ids=new Set<string>();
 const str=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 for(const d of l.devices){
  if(!d||!kinds.includes(d.kind)||!str(d.id,60)||!/^[\w-]+$/.test(d.id)||ids.has(d.id)||!str(d.name,60)||!str(d.model,120)||![0,90,180,270].includes(d.rotation)||!Number.isInteger(d.cycle)||d.cycle<1||d.cycle>120||!Array.isArray(d.tags)||!d.tags.length||d.tags.length>12)fail();
  ids.add(d.id);
  if(!canPlace(l,d.id,d.x,d.z))fail();
  const keys=new Set<string>();
  for(const t of d.tags){if(!t||!str(t.key,40)||!/^[a-z][a-z0-9_]*$/.test(t.key)||keys.has(t.key)||!str(t.label,40)||!str(t.unit,20)||!Number.isFinite(t.nominal)||Math.abs(t.nominal)>1e6||(t.high!==null&&(!Number.isFinite(t.high)||Math.abs(t.high)>1e6)))fail();keys.add(t.key);}
 }
 const incoming=new Set<string>(),outgoing=new Set<string>();
 for(const edge of l.links){if(!edge||!ids.has(edge.from)||!ids.has(edge.to)||edge.from===edge.to||incoming.has(edge.to)||outgoing.has(edge.from))fail();incoming.add(edge.to);outgoing.add(edge.from);}
 for(const id of ids){const seen=new Set<string>();let next:string|undefined=id;while(next){if(seen.has(next))fail();seen.add(next);next=l.links.find(e=>e.from===next)?.to;}}
 // Only whitelisted configuration is persisted; telemetry is never imported as a live reading.
 return {version:1,source:'simulation',devices:l.devices.map(d=>({id:d.id,kind:d.kind,name:d.name,model:d.model,x:d.x,z:d.z,rotation:d.rotation,cycle:d.cycle,tags:d.tags.map(t=>({key:t.key,label:t.label,unit:t.unit,nominal:t.nominal,high:t.high}))})),links:l.links.map(e=>({from:e.from,to:e.to}))};
}
export function runError(l:Layout):string|null {
 if(!l.devices.length)return '장비 블록을 먼저 배치하세요.';
 for(const d of l.devices){const input=l.links.some(e=>e.to===d.id),output=l.links.some(e=>e.from===d.id);
  if((!input&&d.kind!=='scanner')||(!output&&d.kind!=='inspection')||(input&&d.kind==='scanner')||(output&&d.kind==='inspection'))return '각 공정은 식별 리더에서 시작해 최종검사대에서 끝나도록 연결하세요. 분기·합류·순환은 현재 지원하지 않습니다.';
 }
 return null;
}
export type Status='idle'|'running'|'blocked'|'alarm'|'offline';
export type Reading={values:Record<string,number>;timestamp:string;quality:'simulated'|'stale';source:'simulation'};
export type Machine={queue:number[];job:number|null;progress:number;completed:number;status:Status;reading:Reading|null;fault:'none'|'limit'|'offline'};
export type Event={id:number;time:number;deviceId:string;message:string;ack:boolean};
export type Simulation={tick:number;nextJob:number;finished:number;failed:number;machines:Record<string,Machine>;events:Event[];eventSeq:number};
export function initialSimulation(l:Layout):Simulation { return {tick:0,nextJob:1,finished:0,failed:0,machines:Object.fromEntries(l.devices.map(d=>[d.id,{queue:[],job:null,progress:0,completed:0,status:'idle',reading:null,fault:'none'}])),events:[],eventSeq:0}; }
export function step(l:Layout,old:Simulation,now:string):Simulation {
 const s=structuredClone(old);s.tick++;
 const before=old.machines;
 for(const d of l.devices){const m=s.machines[d.id];
  if(m.fault==='offline'){m.status='offline';if(m.reading)m.reading.quality='stale';}
  else {
   const values=Object.fromEntries(d.tags.map((t,i)=>[t.key,Number((m.fault==='limit'&&i===0?(t.high??t.nominal)+Math.max(1,Math.abs(t.nominal)*0.1):t.nominal+Math.sin(s.tick*0.7+i)*Math.abs(t.nominal)*0.003).toFixed(4))]));
   m.reading={values,timestamp:now,quality:'simulated',source:'simulation'};
   m.status=m.fault==='limit'||d.tags.some(t=>t.high!==null&&values[t.key]>t.high)?'alarm':m.job===null?'idle':'running';
  }
  if((m.status==='alarm'||m.status==='offline')&&before[d.id].status!==m.status){s.events.unshift({id:++s.eventSeq,time:s.tick,deviceId:d.id,message:m.status==='alarm'?'모의 임계값 초과':'모의 통신 끊김',ack:false});}
 }
 // A work token may cross only one station boundary per simulated second.
 for(const d of l.devices){const m=s.machines[d.id];if(m.status==='alarm'||m.status==='offline')continue;
  if(m.job===null&&before[d.id].queue.length){m.job=m.queue.shift()!;m.progress=0;}
  if(m.job!==null){m.progress=Math.min(d.cycle,m.progress+1);m.status='running';
   if(m.progress>=d.cycle){const target=l.links.find(e=>e.from===d.id)?.to;
    if(target&&s.machines[target].queue.length>=8){m.status='blocked';continue;}
    if(target)s.machines[target].queue.push(m.job);else{ s.finished++;if(m.job%7===0)s.failed++; }
    m.completed++;m.job=null;m.progress=0;
   }
  } else m.status='idle';
 }
 if(s.tick%3===1)for(const d of l.devices.filter(d=>d.kind==='scanner'&&!l.links.some(e=>e.to===d.id))){const m=s.machines[d.id];if(m.queue.length<8)m.queue.push(s.nextJob++);}
 s.events=s.events.slice(0,100);return s;
}
