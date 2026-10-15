import {useState} from 'react';
import {supabase,download} from './lib';
export default function RunEvidence({id}:{id?:string}){
 const [result,setResult]=useState<Record<string,any>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);setError('');const r=await supabase.from('matching_runs').select('*').eq('id',id).single();if(r.error)setError(r.error.message);else setResult(r.data);setBusy(false);}
 if(!id)return <p className="muted">기존 기록: 추천 실행 스냅샷이 연결되지 않았습니다.</p>;
 return <details><summary>추천 실행 근거</summary><button className="secondary" disabled={busy} onClick={()=>void load()}>저장된 실행 근거 조회</button>{error&&<p role="alert">{error}</p>}{result&&<><p>알고리즘 {result.result.engine_version||result.result.method} · SOP {result.result.sop_version} · 입력 {result.result.input_snapshot?.length}행 · {new Date(result.created_at).toLocaleString('ko-KR')}</p><p>이 기록은 추천 당시 스냅샷입니다. 현재 재고·재검사 상태와 다를 수 있습니다.</p><button className="secondary" onClick={()=>download(`추천근거_${id}.json`,JSON.stringify(result,null,2),'application/json')}>추천 실행 근거 내보내기</button></>}</details>;
}
