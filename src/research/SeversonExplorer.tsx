import {useEffect,useState} from 'react';
import {ChoiceChips} from '../ChoiceChips';
import {download,number} from '../lib';
type RecordRow={id:string;cell_id:string;batch:string;channel:string;name:string;continuation_of:string|null;capacity_mah:number[]};
type Source={id:string;title:string;source_url:string;citation:string;license:string;transform:string;retrieved_at:string;record_count:number;unique_cells:number;continuations:number;files:{url:string;sha256:string}[];batches:{title:string;design:string;notes:string;experimental_notes:string}[];records:RecordRow[]};
export default function SeversonExplorer(){
 const [data,setData]=useState<Source|null>(null),[error,setError]=useState(''),[batch,setBatch]=useState(''),[selected,setSelected]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),15000);let active=true;
  void fetch(`${import.meta.env.BASE_URL}research/severson-capacity.json`,{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('자료를 불러오지 못했습니다.');const d=await r.json() as Source;if(!d.records?.length)throw Error('용량 이력이 없습니다.');if(active){setData(d);setBatch(d.batches[0].title);setSelected(d.records[0].id);setError('');}}).catch(()=>{if(active)setError('Severson 자료 조회에 실패했습니다. 다시 시도하세요.');}).finally(()=>clearTimeout(timer));return()=>{active=false;abort.abort();clearTimeout(timer);};
 },[attempt]);
 if(error)return <div className="research-body"><p role="alert">{error}</p><button className="secondary" onClick={()=>{setError('');setAttempt(n=>n+1);}}>다시 불러오기</button></div>;
 if(!data)return <p className="research-body">Severson 용량 이력을 불러옵니다.</p>;
 const rows=data.records.filter(r=>r.batch===batch),row=rows.find(r=>r.id===selected)??rows[0],notes=data.batches.find(b=>b.title===batch)!;
 const values=row.capacity_mah,min=Math.min(...values),max=Math.max(...values),range=max-min||1;
 const points=values.map((v,i)=>`${45+i/(values.length-1)*510},${160-(v-min)/range*130}`).join(' ');
 return <div className="research-body severson-explorer">
  <p>공식 공개 요약 <strong>{data.record_count}개 시험 기록 · 고유 셀 {data.unique_cells}개</strong>. 이어 측정한 기록 {data.continuations}개를 별도 표시합니다. 논문 분석용 124셀과 동일한 선별 표본이 아닙니다.</p>
  <ChoiceChips label="Severson 시험 배치" value={batch} onChange={e=>{setBatch(e.target.value);setSelected('');}}>{data.batches.map(b=><option key={b.title}>{b.title}</option>)}</ChoiceChips>
  <ChoiceChips label="Severson 시험 기록" value={row.id} onChange={e=>setSelected(e.target.value)}>{rows.map(r=><option key={r.id} value={r.id}>CH {r.channel} · {r.cell_id}{r.continuation_of?' · 이어 측정':''}</option>)}</ChoiceChips>
  <div className="severson-summary"><strong>{row.cell_id} · CH {row.channel}</strong><span>{values.length}개 기록</span><span>마지막 용량 {number(values.at(-1)!,1)}mAh</span></div>
  {row.continuation_of&&<p className="notice">이 셀은 이전 배치에서 이어 측정했습니다. 새로운 독립 셀로 세지 않으며 앞선 기록과 자동 연결하지 않습니다.</p>}
  <svg className="severson-chart" viewBox="0 0 600 200" role="img" aria-label={`${row.cell_id} 방전용량 이력. 최소 ${number(min,1)}, 최대 ${number(max,1)} mAh. 가로축은 실제 사이클 번호가 아닌 기록 순번입니다.`}>
   <line x1="45" x2="555" y1="160" y2="160" className="severson-axis"/>
   <polyline points={points} className="severson-curve"/>
   <text x="45" y="20">{number(max,1)} mAh</text><text x="45" y="180">1</text><text x="555" y="180" textAnchor="end">{values.length}</text><text x="300" y="195" textAnchor="middle">기록 순번 · 실제 사이클 번호 미확인</text>
  </svg>
  <p className="muted">용량 변화 관찰용입니다. 초기 과도값·시험 중단을 보존했습니다. 마지막 기록은 수명 종료 판정이 아니며, 이 요약으로 수명·현장 불량률을 예측하지 않습니다.</p>
  <div className="workflow-actions"><button className="secondary" onClick={()=>download(`JSI_Severson_${row.id}.json`,JSON.stringify({schema_version:1,source_url:data.source_url,citation:data.citation,license:data.license,retrieved_at:data.retrieved_at,files:data.files,transform:data.transform,batch:notes,record:row,scope:'공식 용량 요약 관찰. 학습·수명 예측·조합 적합 판정·생산 적용 아님.'},null,2),'application/json')}>선택 기록·출처 내려받기</button></div>
  <details><summary>시험 조건·자료 한계</summary><p>1.1Ah LFP · 챔버 설정 30°C · 급속충전 조건은 시험마다 다릅니다. 공개 요약에는 전압·저항과 명시적 사이클 좌표가 없어 3변수 조합 엔진에 입력하지 않습니다.</p><p>일부 시험은 조기 종료되었으며 센서 접촉·온도·컴퓨터 재시작 문제가 보고됐습니다. 아래 원문 주의사항을 함께 확인하세요.</p><p>{notes.design}</p><p>{notes.notes}</p><p>{notes.experimental_notes}</p><a href={data.source_url} target="_blank" rel="noreferrer">MIT·Stanford·TRI 공동 연구 원출처</a><p>{data.citation}</p><p>{data.license}</p><p>예측 모델 코드는 별도 라이선스 대상이며 이 앱에서 사용하지 않습니다.</p></details>
 </div>;
}
