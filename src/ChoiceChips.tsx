import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './choice-chips.css';

type Props = { children: ReactNode; label: string; value?: string | number; defaultValue?: string | number; name?: string; required?: boolean; disabled?: boolean; clearable?: boolean; onChange?: (event: { target: { value: string } }) => void; 'aria-label'?: string };
/** Visible native radios preserve keyboard operation, form values and required validation. */
export function ChoiceChips(props: Props) {
 const id=useId(), root=useRef<HTMLDivElement>(null);
 const options=Children.toArray(props.children).flatMap(child=>isValidElement<{value?: string|number; children?: ReactNode}>(child)?[{value:String(child.props.value??child.props.children??''),label:child.props.children}]:[]).filter(o=>!props.required||o.value!=='');
 const initial=String(props.defaultValue??(props.required?'':options[0]?.value??''));
 const [local,setLocal]=useState(initial), [search,setSearch]=useState(''), [page,setPage]=useState(0);
 const value=String(props.value??local), label=props['aria-label']??props.label;
 const filtered=options.filter(o=>String(o.label).toLowerCase().includes(search.toLowerCase()));
 const pages=Math.max(1,Math.ceil(filtered.length/8)), current=Math.min(page,pages-1);
 const shown=filtered.slice(current*8,current*8+8);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setLocal(initial);setSearch('');setPage(0);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[initial]);
 function reveal(){setSearch('');setPage(Math.max(0,Math.floor(options.findIndex(o=>o.value===value)/8)));}
 return <div className="choice-field" ref={root}>
  <span id={`${id}-label`} className="choice-label">{props.label}</span>
  {options.length>8&&<div className="choice-search"><input aria-label={`${label} 검색`} placeholder="선택지 검색" value={search} disabled={props.disabled} onChange={e=>{setSearch(e.target.value);setPage(0);}}/><button type="button" className="text-button" onClick={reveal}>선택: {options.find(o=>o.value===value)?.label??'없음'}</button></div>}
  <div className="choice-chips" role="radiogroup" aria-label={label} aria-required={props.required}>
   {options.map(option=><label key={option.value} className="choice-chip" hidden={!shown.includes(option)}>
    <input type="radio" name={props.name??id} value={option.value} checked={value===option.value} required={props.required} disabled={props.disabled} onInvalid={e=>{e.preventDefault();setSearch('');setPage(0);requestAnimationFrame(()=>root.current?.querySelector<HTMLInputElement>('input[type=radio]')?.focus());}} onClick={()=>{if(props.clearable&&value===option.value){setLocal('');props.onChange?.({target:{value:''}});}}} onChange={()=>{setLocal(option.value);props.onChange?.({target:{value:option.value}});}}/>
    <span>{option.label}</span>
   </label>)}
  </div>
  {!filtered.length&&<span className="choice-empty">일치하는 선택지가 없습니다.</span>}
  {pages>1&&<div className="choice-pages"><button type="button" className="secondary" disabled={current===0} onClick={()=>setPage(current-1)}>이전 선택지</button><span>{current+1} / {pages}</span><button type="button" className="secondary" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>다음 선택지</button></div>}
 </div>;
}
