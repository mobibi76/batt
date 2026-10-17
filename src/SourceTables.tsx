import {useState} from 'react';
import type {PrivateDataset,SourceTable} from './demoData';
export default function SourceTables({dataset}:{dataset:PrivateDataset}){
 const fallback:SourceTable={file:dataset.intake.name,sheet:'충방전 측정 기록',header_rows:dataset.intake.headers.length,rows:[...dataset.intake.headers,...dataset.intake.rows.map(r=>Array.isArray(r.raw)?r.raw:[])].map(r=>r.map(v=>v==null?null:typeof v==='number'||typeof v==='boolean'?v:String(v)))};
 const tables=dataset.source_tables?.length?dataset.source_tables:[fallback];
 const [selected,setSelected]=useState(0),[page,setPage]=useState(0);
 const table=tables[selected]||tables[0],headerCount=table.header_rows??1,data=table.rows.slice(headerCount),size=20,pages=Math.max(1,Math.ceil(data.length/size)),current=Math.min(page,pages-1),cols=Math.max(0,...table.rows.map(r=>r.length));
 return <section className="source-tables" aria-label="원본 테이블 조회">
 <label>원자료 선택<select value={selected} onChange={e=>{setSelected(Number(e.target.value));setPage(0);}}>{tables.map((t,i)=><option key={i} value={i}>{t.file} · {t.sheet}</option>)}</select></label>
 <p>원래 컬럼 순서 · {cols}개 항목 · {data.length}건. 빈칸은 제공값이 없는 항목입니다. PoC 첫 탭의 품질 기준 설명은 이 목록에서 제외합니다.</p>
 {!dataset.source_tables&&<p role="status">현재 저장본에는 PoC 전체 테이블이 없습니다. 원자료 저장본 갱신이 필요합니다.</p>}
 <div className="source-table-scroll" tabIndex={0} role="region" aria-label="원자료 컬럼과 값 · 좌우 스크롤"><table><caption>{table.sheet}</caption><thead><tr>{Array.from({length:cols},(_,i)=><th scope="col" key={i}>{String(table.rows[0]?.[i]??'이름 없는 항목')}{headerCount>1&&table.rows.slice(1,headerCount).map((r,j)=>r[i]!=null&&r[i]!==''?<small className="block" key={j}>{String(r[i])}</small>:null)}</th>)}</tr></thead><tbody>{data.slice(current*size,(current+1)*size).map((row,i)=><tr key={current*size+i}>{Array.from({length:cols},(_,j)=><td key={j}>{row[j]==null?'':String(row[j])}</td>)}</tr>)}</tbody></table></div>
 <div className="console-pager"><button className="secondary" disabled={!current} onClick={()=>setPage(current-1)}>이전 자료</button><span>{current+1} / {pages}</span><button className="secondary" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>다음 자료</button></div>
 </section>;
}
