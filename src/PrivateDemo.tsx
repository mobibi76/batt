import {House} from 'lucide-react';
import UserManual from './manual/UserManual';
import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase,number} from './lib';
import {demoCellsFrom,validatePrivateDataset,type PrivateDataset} from './demoData';
import Workbench from './Workbench';
import './provenance.css';
export default function PrivateDemo({session,onExit}:{session:Session;onExit:()=>void}){
 const [dataset,setDataset]=useState<PrivateDataset|null>(null),[error,setError]=useState(''),[mode,setMode]=useState<'raw'|'workflow'|null>(null),[tab,setTab]=useState('start');
 useEffect(()=>{
  let alive=true,busy=false,pending=false;const controller=new AbortController();
  async function read(){if(busy){pending=true;return;}busy=true;const request=new AbortController(),cancel=()=>request.abort();controller.signal.addEventListener('abort',cancel);const timeout=setTimeout(cancel,10000);
   try{const r=await supabase.from('private_demo_datasets').select('payload').eq('id','customer-grading-v1').abortSignal(request.signal).single();if(r.error)throw Error('접근 권한 또는 체험 자료 연결을 확인하세요.');const d=validatePrivateDataset(r.data.payload);if(alive){setDataset(current=>current||d);setError('');}}
   catch(e){if(alive){setDataset(null);setMode(null);setError((e as Error).message);}}
   finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',cancel);busy=false;if(alive&&pending){pending=false;void read();}}
  }
  void read();const timer=setInterval(()=>void read(),15000);window.addEventListener('focus',read);
  return()=>{alive=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',read);};
 },[session.user.id]);
 if(dataset&&mode)return <Workbench key={mode} session={session} demo onLeave={()=>setMode(null)} privateDemo={{dataset,mode,cells:mode==='workflow'?demoCellsFrom(dataset):[]}}/>;
 return <main className="private-demo-entry"><UserManual context="sample"/><section className="panel"><div className="private-demo-home-row"><button className="secondary private-demo-home" aria-label="운영 홈으로 돌아가기" title="운영 홈으로 돌아가기" onClick={onExit}><House aria-hidden="true" className="icon-20"/></button></div><h1>고객 데이터로 비공개 체험</h1><p>주성산업 제공 데이터 기반 · 승인된 사용자 전용 · 운영 데이터에 저장하지 않음</p><nav aria-label="체험 안내"><button className={tab==='start'?'primary':'secondary'} onClick={()=>setTab('start')}>체험 선택</button><button className={tab==='source'?'primary':'secondary'} onClick={()=>setTab('source')}>출처·제공 날짜</button></nav>
 {error?<p role="alert">{error}</p>:!dataset?<p role="status">비공개 자료 접근 권한을 확인하고 있습니다.</p>:tab==='start'?<>
 <p>제공된 {dataset.intake.rows.length}행 중 비교 가능 {dataset.verification.valid}행 · 보류 {dataset.verification.held}행. 실제 측정 원본성·단위·시간대는 고객 확인 대상입니다.</p>
 <p><span className="data-origin-provided">고객 제공값</span>은 보존하고, <span className="data-value data-origin-supplemented">시험 보완값</span>은 색상·표식으로 구분합니다.</p>
 <nav><button className="primary" onClick={()=>setMode('workflow')}>보완값 포함 업무 체험</button><button className="secondary" onClick={()=>setMode('raw')}>보완 전 원자료 검토</button></nav>
 <p>업무 체험: 제공 전압·용량 + 가상 내부저항 0.42 mΩ. 임시 ID·LOT·시험 시각을 부여합니다. 가상 내부저항은 추정·예측값이 아니며, 동일한 값으로 채워 저항 편차를 0으로 만듭니다. SOP 통과·품질 성과는 시험 결과입니다.</p>
 <p>원자료 검토: 내부저항 결측을 유지하여 전체 SOP 미검증으로 표시합니다. 두 체험의 변경값과 검사·승인 이력은 종료하면 폐기합니다.</p>
 <details><summary>제공 PoC와의 산술 대조</summary><p>평균 용량편차 {number(dataset.verification.sequence_mean,2)} → {number(dataset.verification.poc_mean,2)} mAh · {number(dataset.verification.improvement_percent,2)}% 감소. 기록된 조합 {dataset.verification.poc_two_criteria_pass}/15개가 전압·용량 두 조건을 충족합니다. 내부저항을 포함한 전체 SOP 통과는 아닙니다. K-means 실행 재현이나 현장 불량률 개선 검증도 아닙니다.</p></details>
 </>:<><h2>원본 파일의 메타정보</h2><p>제공일 미확인. 파일 내부 생성·수정 시각은 고객이 자료를 전달한 날짜를 증명하지 않습니다. 아래 시각은 UTC입니다.</p>{dataset.files.map(f=><article key={f.sha256}><h3>{f.name}</h3><p>생성 {f.created||'없음'} · 수정 {f.modified||'없음'}</p><details><summary>원본 식별 해시</summary><pre>{f.sha256}</pre></details></article>)}<p>측정 시각은 원행을 보존합니다. 시간대가 확인되지 않은 장비 시각에 임의로 한국 시간대를 붙이지 않습니다. 업무 체험의 2000-01-01 시각은 명시적인 시험 보완값입니다.</p></>}
 </section></main>;
}
