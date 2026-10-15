import {useRef,useState} from 'react';
import {FileUp,Download} from 'lucide-react';
import {ChoiceChips} from '../ChoiceChips';
import {download} from '../lib';
import {sha256} from './data';
import {columnHelp,reference,validateLifetimeCsv,validationExample,validationTemplate,type CheckStatus,type Validation} from './lifetimeSchema';
const names:Record<CheckStatus,string>={missing:'누락·보완',difference:'조건 차이',unknown:'확인 불가',met:'충족'};
type Report={schema_version:1;engine_version:string;created_at:string;file_name:string;file_sha256:string;source_kind:'user-file'|'synthetic-example';result:Validation};
export default function DataValidation(){
 const [tab,setTab]=useState('reference'),[report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[filter,setFilter]=useState<CheckStatus>('missing'),[index,setIndex]=useState(0);const input=useRef<HTMLInputElement>(null);
 async function inspect(text:string,name:string,kind:Report['source_kind']){setReport(null);setError('');setBusy(true);try{const result=validateLifetimeCsv(text),hash=await sha256(text);setReport({schema_version:1,engine_version:'severson-data-readiness-1.0.0',created_at:new Date().toISOString(),file_name:name,file_sha256:hash,source_kind:kind,result});setFilter((['missing','difference','unknown','met'] as CheckStatus[]).find(s=>result.counts[s])!);setIndex(0);setTab('results');}catch(e){setError(e instanceof Error?e.message:'자료를 검사하지 못했습니다.');}finally{setBusy(false);}}
 async function upload(file:File){setReport(null);setError('');if(file.size>5*1024*1024){setError('CSV는 최대 5MB입니다.');return;}setBusy(true);try{await inspect(await file.text(),file.name,'user-file');}catch{setError('파일을 읽지 못했습니다.');setBusy(false);}}
 const checks=report?.result.findings.filter(f=>f.status===filter)??[],page=Math.min(index,Math.max(0,checks.length-1)),check=checks[page];
 return <div className="research-body data-validation">
  <ChoiceChips label="데이터 검증 보기" value={tab} disabled={busy} onChange={e=>setTab(e.target.value)}><option value="reference">연구 기준</option><option value="input">파일 검사</option><option value="results">비교 결과</option></ChoiceChips>
  {error&&<p role="alert" className="notice error">{error}</p>}
  {tab==='reference'&&<div className="validation-reference">
   <p><strong>목적: 초기 방전 곡선으로 사이클 수명을 예측하는 연구의 데이터 요건 비교</strong></p>
   <p>Severson 등, Nature Energy (2019). 1.1Ah LFP/흑연 셀 · 챔버 30°C · 다양한 급속충전 조건 · 4C 방전, 2.0V 종료.</p>
   <p>선택 기준은 <strong>10·100사이클 Q(V)의 분산을 사용하는 회귀 방법</strong>입니다. 원 논문 추가 평가 40셀에서 RMSE 196사이클·평균 백분율 오차 11.4%를 보고했습니다(Table 1). 이는 원 연구 성능이며 이 앱의 성능이 아닙니다.</p>
   <details><summary>검증·정제 조건과 적용 한계</summary><p>공통 전압 3.5–2.0V의 1,000지점으로 곡선을 정렬하고 차이 곡선의 특징을 구성했습니다. 수명 정답은 공칭 용량 80% 도달 사이클입니다. 학습 41셀·1차 평가 43셀·모델 개발 후 추가 평가 40셀로 구분했습니다.</p><p>공식 처리 코드에는 중단 시험 제외, 배치 간 이어 측정 연결, 잡음 채널 제외가 있습니다. 이 앱은 자동 삭제·보간·모델 실행을 하지 않습니다. 충족은 검사 항목에 한하며 논문 성능 재현이나 현장 적용성 검증이 아닙니다. 충전·휴지·전처리 근거는 사람이 확인해야 합니다.</p><p>현재 앱의 Severson 용량 요약에는 Q(V) 곡선 입력이 없어 이 기준을 충족하지 않습니다. 전체 원자료와 구분합니다.</p></details>
   <div className="workflow-actions"><a href={reference.paper} target="_blank" rel="noreferrer">논문·시험 조건</a><a href={reference.processing} target="_blank" rel="noreferrer">정제 코드</a><button className="primary" onClick={()=>setTab('input')}>내 데이터 검사</button></div>
  </div>}
  {tab==='input'&&<div>
   <p>셀·사이클·전압 지점당 한 행인 <strong>방전 Q(V) CSV</strong>를 비교합니다. 최대 5MB / 20,000행. 서버에 전송하거나 운영 데이터를 변경하지 않습니다.</p>
   <p>필수 컬럼: <code>cell_id, cycle, voltage_v, discharge_capacity_ah</code>. 단위는 V·Ah이며 자동 추정·변환하지 않습니다. 조건은 각 행에 반복 기재하고, 모르는 값은 비워 두세요.</p>
   <div className="workflow-actions"><button className="secondary" disabled={busy} onClick={()=>download('Severson_데이터검증_빈양식.csv',validationTemplate(),'text/csv;charset=utf-8')}><Download className="icon-16"/>빈 양식</button><button className="primary" disabled={busy} onClick={()=>input.current?.click()}><FileUp className="icon-16"/>{busy?'검사 중…':'검증 CSV 가져오기'}</button><input ref={input} className="validation-file-input" type="file" accept=".csv,text/csv" aria-label="데이터 검증 CSV" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}}/></div>
   <button className="text-button" disabled={busy} onClick={()=>void inspect(validationExample(),'합성_미완성_예제.csv','synthetic-example')}>누락이 있는 합성 예제로 확인</button>
   <details><summary>컬럼 사전·추가 조건·정답</summary><p>이 양식은 앱의 비교용 스키마이며 Severson 원본 파일 형식이나 공인 표준이 아닙니다. 기존 파일의 컬럼을 아래 이름·단위로 명시적으로 변환하세요.</p><dl className="validation-dictionary">{Object.entries(columnHelp).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details>
  </div>}
  {tab==='results'&&(!report?<p>파일 검사에서 CSV를 선택하세요. 이전 검사는 새 파일 선택 시 초기화됩니다.</p>:<div aria-live="polite">
   <div className="validation-result-head"><span>{report.source_kind==='synthetic-example'?'합성 예제 · 실측 아님':report.file_name} · {report.result.cellCount}셀 / {report.result.rowCount.toLocaleString()}행</span><button className="secondary" onClick={()=>download('JSI_데이터검증.json',JSON.stringify(report,null,2),'application/json')}><Download className="icon-16"/>보고서</button></div>
   <ChoiceChips label="검증 판정" value={filter} onChange={e=>{setFilter(e.target.value as CheckStatus);setIndex(0);}}>{(Object.keys(names) as CheckStatus[]).map(s=><option key={s} value={s}>{names[s]} {report.result.counts[s]}</option>)}</ChoiceChips>
   {check?<article className={`validation-finding validation-${check.status}`}><strong>{check.title}</strong><p>{check.detail}</p><p><strong>다음 조치</strong> · {check.action}</p></article>:<p>해당 판정 항목이 없습니다.</p>}
   <div className="validation-pagination"><button className="secondary" disabled={!page} onClick={()=>setIndex(page-1)}>이전 항목</button><span>{checks.length?page+1:0} / {checks.length}</span><button className="secondary" disabled={page+1>=checks.length} onClick={()=>setIndex(page+1)}>다음 항목</button></div>
   <p className="muted">충족은 항목별 구조·값 확인입니다. 수명 예측 성능이나 현장 품질 승인이 아닙니다.</p>
  </div>)}
 </div>;
}
