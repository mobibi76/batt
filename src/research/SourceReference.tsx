import {useState,type ReactNode} from 'react';
import {download} from '../lib';
import archive from './referenceArchive.json';
import {seversonEvidence} from './seversonEvidence';
export type ReferenceId=keyof typeof archive.entries;
export default function SourceReference({id,children}:{id:ReferenceId;children:ReactNode}){
 const entry=archive.entries[id],evidence=id.startsWith('severson-')?seversonEvidence:null;
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function getAsset(asset:{path:string;label:string;sha256:string}){setBusy(true);setError('');const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);try{
  const r=await fetch(`${import.meta.env.BASE_URL}research/${asset.path}`,{signal:abort.signal});if(!r.ok)throw Error('보관 파일 조회 실패');const bytes=await r.arrayBuffer();
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==asset.sha256)throw Error('보관 파일 버전·해시 불일치. 새로고침 후 다시 확인하세요.');
  const url=URL.createObjectURL(new Blob([bytes],{type:asset.path.endsWith('.json')?'application/json':'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=asset.path.split('/').at(-1)!;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){setError(e instanceof Error?e.message:'보관 자료를 불러오지 못했습니다.');}finally{clearTimeout(timer);setBusy(false);}}
 return <div className="source-reference" data-reference-id={id}><a href={entry.source_url} target="_blank" rel="noreferrer">{children}</a><details><summary>{entry.title} · 앱 내 보관 자료</summary><p>{entry.scope}</p><p>확인일 {archive.verified_on} · {archive.version}</p>{evidence&&<p>{(id==='severson-code'?evidence.code.facts:evidence.paper.facts).join(' ')}</p>}
  <div className="workflow-actions"><button className="secondary" onClick={()=>download(`JSI_출처근거_${id}.json`,JSON.stringify({archive_version:archive.version,verified_on:archive.verified_on,policy:archive.policy,...entry,...(evidence?{evidence}:{})},null,2),'application/json')}>출처·보관 범위 내려받기</button>{entry.assets.map(asset=><button key={asset.path} className="secondary" disabled={busy} onClick={()=>void getAsset(asset)}>{asset.label}</button>)}</div>
  {error&&<p role="alert">{error} 위 출처 요약은 계속 확인할 수 있습니다.</p>}<p className="muted">앱에 보관된 자료를 확인합니다. 파일이 원본과 같은지 검사하며, 보관되지 않은 원문은 제공하지 않습니다.</p>
 </details></div>;
}
