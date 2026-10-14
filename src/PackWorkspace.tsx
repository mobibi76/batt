import { ChoiceChips } from './ChoiceChips';
import {useState} from 'react';
import usePageSize from './usePageSize';
import {date,type Pack,type Inspection} from './lib';
import './approvals.css';
import {packSignal,matchesPack,packFilters,type PackFilter,type ApprovalIndex} from './workflow';
export default function PackWorkspace({packs,tests,requests,filter,onFilter,search,onSearch,onOpen}:{packs:Pack[];tests:Inspection[];requests:ApprovalIndex[]|null;filter:PackFilter;onFilter:(f:PackFilter)=>void;search:string;onSearch:(s:string)=>void;onOpen:(p:Pack)=>void}){
 const size=usePageSize(),[page,setPage]=useState(0);
 const rows=packs.map(p=>packSignal(p,tests,requests)).filter(s=>matchesPack(s,filter)&&s.pack.serial_no.toLowerCase().includes(search.toLowerCase()));
 const current=Math.min(page,Math.max(0,Math.ceil(rows.length/size)-1));
 return <section className="panel"><div className="section-head"><div><h2>팩별 품질이력</h2><p>셀 조합 → 공정 확인 → 최종 품질 승인까지 같은 팩으로 추적합니다.</p></div><div className="search"><input aria-label="팩 일련번호 검색" placeholder="팩 일련번호 검색" value={search} onChange={e=>onSearch(e.target.value)}/></div></div><div className="workflow-filter"><div><ChoiceChips label="확인할 품질 상태" value={filter} onChange={e=>onFilter(e.target.value as PackFilter)}>{Object.entries(packFilters).map(([key,label])=><option key={key} value={key}>{label}</option>)}</ChoiceChips></div><span>{rows.length}팩</span>{filter!=='all'&&<button className="text-button" onClick={()=>onFilter('all')}>전체 팩 보기</button>}</div>
 <div className="table-wrap"><table><thead><tr><th>팩 일련번호</th><th>구성 셀</th><th>다음 품질 판단</th><th>구성 시각</th><th/></tr></thead><tbody>{rows.slice(current*size,(current+1)*size).map(s=><tr key={s.pack.id}><td className="mono strong">{s.pack.serial_no}</td><td>{s.pack.pack_cells.length}개</td><td><span className={`approval-status ${s.failed?'rejected':s.state==='approved'?'approved':'pending'}`}>{s.reason}</span></td><td>{date(s.pack.created_at)}</td><td><button className="text-button" onClick={()=>onOpen(s.pack)}>상세 조회</button></td></tr>)}</tbody></table></div><div className="console-pager"><button className="secondary" disabled={current===0} onClick={()=>setPage(current-1)}>이전 팩</button><span>{current+1} / {Math.max(1,Math.ceil(rows.length/size))}</span><button className="secondary" disabled={(current+1)*size>=rows.length} onClick={()=>setPage(current+1)}>다음 팩</button></div>{!rows.length&&<p className="workbench-body">{packs.length?'현재 조건에 해당하는 팩이 없습니다.':'셀 매칭에서 조합을 확정하면 품질이력이 시작됩니다.'}</p>}</section>;
}
