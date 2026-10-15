import DecisionEvidence,{type DecisionContext} from './DecisionEvidence';
import {useState} from 'react';
import {supabase} from './lib';
export default function RunEvidence({packId,ids,demo=false}:{id?:string;packId:string;ids:string[];demo?:boolean}){
 const [context,setContext]=useState<DecisionContext>();
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);setError('');try{const c=await supabase.rpc('pack_decision_context',{target_pack:packId});if(c.error)throw c.error;setContext(c.data);}catch(e){setError((e as {message:string}).message);}finally{setBusy(false);}}
 if(demo)return <p className="muted">체험 기록 · 서버 추천 근거를 조회하지 않습니다.</p>;
 return <details><summary>추천 실행 근거</summary><p>팩 구성 당시 추천·처리 이력입니다. 품질 제출본은 제출 시점에 별도로 고정됩니다.</p><button className="secondary" disabled={busy} onClick={()=>void load()}>저장된 실행 근거 조회</button>{error&&<p role="alert">{error}</p>}{context&&<DecisionEvidence context={context} ids={ids}/>}</details>;
}
