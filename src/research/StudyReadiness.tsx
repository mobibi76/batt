import {useRef,useState} from 'react';
import {download} from '../lib';
import {sha256} from './data';
import type {Study} from './literature';
import {compareReadiness,roleNames} from './readiness';
import DataValidation from './DataValidation';
const statuses={available:'확보됨 · 형식 확인',missing:'추가 확보·열 대응 필요',repair:'값 보완 필요',unknown:'확인 불가 · 수동 검토'};
export default function StudyReadiness({study}:{study:Study}){
 const [report,setReport]=useState<({file:string;hash:string;at:string}&ReturnType<typeof compareReadiness>)|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const input=useRef<HTMLInputElement>(null);const schema=study.data_schema;
 async function inspect(file:File){setReport(null);setError('');setBusy(true);try{if(!schema)throw Error('스키마를 먼저 등록하세요.');if(file.size>5*1024*1024)throw Error('CSV는 최대 5MB입니다.');const text=await file.text(),result=compareReadiness(text,schema);setReport({...result,file:file.name,hash:await sha256(text),at:new Date().toISOString()});}catch(e){setError(e instanceof Error?e.message:'데이터를 읽지 못했습니다.');}finally{setBusy(false);}}
 if(!schema?.fields.length)return <div className="study-readiness"><p>비교할 데이터 항목이 없습니다. 문헌 수정에서 데이터셋 주소와 항목·단위·자료형을 등록하세요.</p></div>;
 return <div className="study-readiness"><p><strong>{study.title}</strong> · {schema.version}</p>{schema.dataset_url&&<a href={schema.dataset_url} target="_blank" rel="noopener noreferrer">연구 데이터셋 출처</a>}<p>{schema.note}</p>
 <details><summary>요구 데이터 {schema.fields.length}개 항목</summary><ul>{schema.fields.map(f=><li key={f.key}><code>{f.key}</code> — {f.label}{f.unit?` (${f.unit})`:''} · {roleNames[f.role]} · {f.required?'필수':'평가·참고용'}</li>)}</ul></details>
 <p>고객 CSV를 선택해 추가 수집·변환 항목을 확인하세요. 열 이름·값 형식을 비교합니다. 최대 5MB·20,000행이며 서버에 전송하지 않습니다.</p><div className="workflow-actions"><button className="secondary" onClick={()=>download('연구_입력양식.csv',schema.fields.map(f=>'"'+f.key.replaceAll('"','""')+'"').join(',')+'\n','text/csv;charset=utf-8')}>선택 연구 입력 양식</button><button className="primary" disabled={busy} onClick={()=>input.current?.click()}>{busy?'비교 중…':'고객 데이터 비교'}</button><input className="validation-file-input" ref={input} type="file" accept=".csv,text/csv" aria-label="선택 연구 고객 CSV" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void inspect(file);e.target.value='';}}/></div>
 {error&&<p role="alert">{error}</p>}{report&&<div aria-live="polite"><p>{report.file} · {report.rowCount}행 · 선택 연구의 요구 항목과 비교</p><button className="secondary" onClick={()=>download('연구_데이터준비_비교.json',JSON.stringify({schema_version:1,study:{id:study.id,title:study.title,url:study.url,conditions:study.conditions,data_schema:schema},...report,scope:'열·기초 형식 준비도 비교. 모델 추론·현장 적용성 검증 아님.'},null,2),'application/json')}>준비 상태 보고서</button><div className="readiness-findings">{report.findings.map(f=><article key={f.key}><strong>{f.title} · {statuses[f.status]}</strong><p>{f.detail}</p><p>{f.action}</p></article>)}</div></div>}
 {study.id==='severson'&&<details className="severson-readiness-details"><summary>Severson 곡선·사이클·시험 조건 상세 검사</summary><DataValidation/></details>}
 </div>;
}
