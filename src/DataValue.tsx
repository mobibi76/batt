import {originOf,type Provenance} from './demoData';
import type {ReactNode} from 'react';
import './provenance.css';
export default function DataValue({row,field,children}:{row:Provenance;field:string;children:ReactNode}){
 const origin=originOf(row,field),label=origin==='provided'?'고객 제공값':origin==='supplemented'?'시험 보완값':origin==='synthetic'?'합성값':'';
 return <span className={`data-value ${origin?`data-origin-${origin}`:''}`} title={label}>{children}{label&&<small className="data-origin-label">{label}</small>}</span>;
}
