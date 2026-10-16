// Bounded multi-strategy set packing. Maximizes the count among searched plans,
// never claims a proof of the global maximum. No learned safety/lifetime score.
type PackingCell={id:string;lot?:string|null;voltage_mv:number|null;capacity_mah:number|null};
export function packByYield<T extends PackingCell>(input:T[],capacityLimit=500):T[][] {
 if(input.length>500)throw Error('최대 500셀까지 편성합니다.');
 if(new Set(input.map(r=>r.id)).size!==input.length)throw Error('중복 셀 ID');
 if(!Number.isFinite(capacityLimit)||capacityLimit<=0||capacityLimit>500)throw Error('용량 차 목표 범위 오류');
 const eligible=input.filter(r=>r.voltage_mv!==null&&Number.isFinite(r.voltage_mv)&&r.voltage_mv>0&&r.capacity_mah!==null&&Number.isFinite(r.capacity_mah)&&r.capacity_mah>0);
 const spread=(g:T[],key:'voltage_mv'|'capacity_mah')=>Math.round((Math.max(...g.map(r=>r[key]!))-Math.min(...g.map(r=>r[key]!)))*1000)/1000;
 const cost=(g:T[])=>spread(g,'capacity_mah')/capacityLimit+spread(g,'voltage_mv')/10;
 const all:T[][]=[];
 for(const lot of new Set(eligible.map(r=>r.lot||''))){
  const cohort=eligible.filter(r=>(r.lot||'')===lot);
  let best:T[][]=[];
  for(const key of ['capacity_mah','voltage_mv'] as const){
   const sorted=[...cohort].sort((a,b)=>a[key]!-b[key]!||a.id.localeCompare(b.id));
   const simple=Array.from({length:Math.floor(sorted.length/8)},(_,i)=>sorted.slice(i*8,i*8+8));
   if(simple.every(g=>spread(g,'capacity_mah')<=capacityLimit&&spread(g,'voltage_mv')<=10)){
    if(simple.length>best.length||simple.reduce((n,g)=>n+cost(g),0)<best.reduce((n,g)=>n+cost(g),0))best=simple;
   }
  }
  if(best.length===Math.floor(cohort.length/8)){all.push(...best);continue;}
  for(const mode of ['compact','capacity-up','capacity-down','voltage-up','voltage-down'] as const){
   let remaining=[...cohort];const plan:T[][]=[];
   while(remaining.length>=8){
    const candidates:T[][]=[];
    for(const key of ['capacity_mah','voltage_mv'] as const){
     const sorted=[...remaining].sort((a,b)=>a[key]!-b[key]!||a.id.localeCompare(b.id));
     for(let i=0;i<=sorted.length-8;i++){
      const g=[sorted[i]];
      for(let j=i+1;j<sorted.length&&g.length<8;j++){
       if(sorted[j][key]!-sorted[i][key]!>(key==='capacity_mah'?capacityLimit:10)+1e-8)break;
       const next=[...g,sorted[j]];
       if(spread(next,'capacity_mah')<=capacityLimit&&spread(next,'voltage_mv')<=10)g.push(sorted[j]);
      }
      if(g.length===8)candidates.push(g);
     }
    }
    if(!candidates.length)break;
    const key=mode.startsWith('voltage')?'voltage_mv':'capacity_mah';
    const direction=mode.endsWith('down')?-1:1;
    candidates.sort((a,b)=>(mode==='compact'?cost(a)-cost(b):direction*(Math.min(...a.map(r=>r[key]!))-Math.min(...b.map(r=>r[key]!))))||cost(a)-cost(b)||a.map(r=>r.id).join().localeCompare(b.map(r=>r.id).join()));
    const selected=candidates[0],ids=new Set(selected.map(r=>r.id));plan.push(selected);remaining=remaining.filter(r=>!ids.has(r.id));
   }
   if(plan.length>best.length||(plan.length===best.length&&plan.reduce((n,g)=>n+cost(g),0)<best.reduce((n,g)=>n+cost(g),0)))best=plan;
   // No search can exceed the cell-count upper bound. With no first candidate,
   // changing candidate order cannot help either. Avoid redundant Edge CPU work.
   if(best.length===Math.floor(cohort.length/8)||plan.length===0)break;
  }
  all.push(...best);
 }
 return all;
}
