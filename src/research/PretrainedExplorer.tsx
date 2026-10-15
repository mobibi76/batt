import {useEffect,useState} from 'react';
import {ChoiceChips} from '../ChoiceChips';
import {download,number} from '../lib';
import {inferCapacity,type PretrainedModel,type FeatureSource} from './pretrained';

export default function PretrainedExplorer(){
 const [data,setData]=useState<{model:PretrainedModel;source:FeatureSource}|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[selected,setSelected]=useState(''),[ran,setRan]=useState(false);
 useEffect(()=>{const abort=new AbortController();let active=true;const timer=setTimeout(()=>abort.abort(),15000);
  void Promise.all(['uconn-model.json','uconn-inference.json'].map(async name=>{const r=await fetch(`${import.meta.env.BASE_URL}research/${name}`,{signal:abort.signal});if(!r.ok)throw Error('자료 조회 실패');return r.json();})).then(([model,source])=>{
   if(!source.records?.length)throw Error('연구 자료 없음');
   for(const row of source.records){inferCapacity(model,row.features,row.soc_final);if(!Number.isFinite(row.reference_ah)||row.reference_ah<=0)throw Error('실측값 오류');}
   if(active){setData({model,source});setSelected(source.records[0].id);}
  }).catch(()=>{if(active)setError('공개 모델 자료를 불러오지 못했습니다.');}).finally(()=>clearTimeout(timer));return()=>{active=false;abort.abort();clearTimeout(timer);};
 },[attempt]);
 if(error)return <div className="research-body"><p role="alert">{error}</p><button className="secondary" onClick={()=>{setError('');setAttempt(n=>n+1);}}>다시 불러오기</button></div>;
 if(!data)return <p className="research-body">공개 모델을 불러옵니다.</p>;
 const {model,source}=data,row=source.records.find(r=>r.id===selected)??source.records[0];
 const results=ran?source.records.map(r=>({id:r.id,referenceAh:r.reference_ah,...inferCapacity(model,r.features,r.soc_final)})):[];
 const result=results.find(r=>r.id===row.id),mae=results.length?results.reduce((s,r)=>s+Math.abs(r.capacityAh-r.referenceAh),0)/results.length:0;
 return <div className="research-body pretrained-explorer">
  <p>UConn 공개 학습 계수 재사용 · 1.2Ah LFP 연구용 · 추가 학습 없음</p>
  <div className="workflow-actions"><button className="primary" onClick={()=>setRan(true)}>{ran?'공개 모델 다시 실행':'공개 모델 실행'}</button>{ran&&<button className="secondary" onClick={()=>download('JSI_UConn_pretrained.json',JSON.stringify({schema_version:1,created_at:new Date().toISOString(),model,source,results,maeAh:mae,scope:'공개 연구 특징값 재생. 독립 검증·수명 예측·현장 승인 아님. Batch 5 출력 보정 미적용.'},null,2),'application/json')}>추론 결과·출처 내려받기</button>}</div>
  {result?<div aria-live="polite"><div className="pretrained-metrics"><div><span>공개 실측 용량</span><strong>{number(row.reference_ah*1000,1)} mAh</strong></div><div><span>모델 추정 용량</span><strong>{number(result.capacityAh*1000,1)} mAh</strong></div><div><span>절대 오차</span><strong>{number(Math.abs(result.capacityAh-row.reference_ah)*1000,1)} mAh</strong></div></div><p>{row.id} · 전체 {results.length}개 기록 평균 절대 오차 {number(mae*1000,1)} mAh</p>{(result.capacityAh<=0||result.capacityAh>1.2)&&<p className="muted">추정값이 공칭 0–1.2Ah 범위 밖입니다. 값을 보정하거나 합격으로 판정하지 않습니다.</p>}</div>:<p className="muted">실행하면 공개 특징값의 추정 용량과 실측 용량을 비교합니다.</p>}
  <p className="muted">학습 데이터와 중복될 수 있는 재생 비교입니다. 이 오차는 현장 정확도나 독립 검증 성적이 아닙니다. 잔여 수명·품질 합격을 판정하지 않습니다.</p>
  <details><summary>비교 기록 선택 · {row.id}</summary><ChoiceChips label="UConn 추론 기록" value={row.id} onChange={e=>setSelected(e.target.value)}>{source.records.map(r=><option key={r.id} value={r.id}>{r.id}</option>)}</ChoiceChips></details>
  <details><summary>모델·입력 조건·라이선스</summary><p>연구진 C++ 재계산 특징값의 배치 1–3에서 셀별 최초·마지막 RPT, 측정 SOC 50%에 가장 가까운 기록을 사용합니다. 기존 55셀 매칭 자료와 별도 추출입니다. 실측 용량은 비교에만 사용하며 추론 입력에 포함하지 않습니다.</p><p>입력: 2RC ECM 특징·전압 통계 12개와 ECM 최종 SOC. 측정 전압·저항·용량 3개만으로 이 모델을 실행할 수 없습니다. 브라우저에서 원시 파형의 ECM 피팅은 수행하지 않습니다.</p><p>SOC 보정: {model.soc_cal_m} × SOC(%) + {model.soc_cal_b}, 5–95% 제한. 배치 5 전용 출력 보정은 적용하지 않습니다. 경계에서 가중치 합이 0이면 원본과 동일하게 3개 모델 평균을 사용합니다. 출력 단위는 Ah이며 SOH 백분율이 아닙니다.</p><a href={model.source_url} target="_blank" rel="noreferrer">학습 계수 원본</a> · <a href={source.source_url} target="_blank" rel="noreferrer">특징값 원본</a> · <a href={`${import.meta.env.BASE_URL}research/UCONN-PROCESSED-LICENSE.txt`} target="_blank" rel="noreferrer">MIT 라이선스·저작권 고지</a><p>모델 버전 {model.version}. MIT 라이선스는 MIT 대학의 모델이라는 뜻이 아닙니다.</p></details>
 </div>;
}
