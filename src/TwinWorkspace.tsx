import {isValidElement,useEffect,useState,type ReactNode} from 'react';
import {flatten,label,content,taskName} from './TaskSteps';
import './twin-workspace.css';

// Keep the scene mounted while changing tools: camera, selection and simulation
// belong to the workspace, not to an individual inspector page.
export default function TwinWorkspace({children,mode,selectionRequest}:{children:ReactNode;mode:'monitor'|'layout'|'simulation';selectionRequest:number}){
 const nodes=flatten(children);
 const hasClass=(n:ReactNode,c:string)=>isValidElement<{className?:string}>(n)&&(n.props.className||'').split(' ').includes(c);
 const scene=nodes.find(n=>hasClass(n,'twin-stage'));
 const modes=nodes.find(n=>hasClass(n,'mode-switch'));
 const toolbar=nodes.find(n=>hasClass(n,'twin-toolbar'));
 const message=nodes.find(n=>hasClass(n,'twin-message'));
 const panels=nodes.filter(n=>n!==scene&&!!label(n));
 const initial=mode==='layout'?'장비 블록':mode==='simulation'?'모의 센서 스트림':'실제 장비 미연결';
 const [selected,setSelected]=useState(initial),[surface,setSurface]=useState<'scene'|'tools'>('scene');
 useEffect(()=>{setSelected(initial);setSurface('scene');},[mode]);
 useEffect(()=>{if(selectionRequest){setSelected(mode==='layout'?'선택 장비 · 데이터 정의':mode==='simulation'?'모의 센서 스트림':'장비 목록에서 선택');setSurface('tools');}},[selectionRequest]);
 const selectedLabel=panels.some(n=>label(n)===selected)?selected:initial;
 return <div className={`twin-studio show-${surface}`}>
  <div className="studio-command-bar">{modes}<div className="studio-commands">{toolbar}</div></div>
  <div className="studio-mobile-switch" aria-label="공간과 도구 전환"><button className={surface==='scene'?'primary':'secondary'} aria-pressed={surface==='scene'} onClick={()=>setSurface('scene')}>공정 공간</button><button className={surface==='tools'?'primary':'secondary'} aria-pressed={surface==='tools'} onClick={()=>setSurface('tools')}>작업 도구</button></div>
  <nav className="studio-tool-picker visible-task-tabs" aria-label="공정 작업 선택">{panels.map(n=><button key={label(n)} aria-label={label(n)} className={selectedLabel===label(n)?'primary':'secondary'} aria-pressed={selectedLabel===label(n)} onClick={()=>{setSelected(label(n));setSurface('tools');}}>{taskName(label(n))}</button>)}</nav>
  <div className="studio-body">
   <div className="studio-scene">{scene}</div>
   <aside className="studio-inspector" aria-label="공정 작업 도구">
    <div className="studio-panels">{panels.map(n=><div className="studio-panel" hidden={label(n)!==selectedLabel} key={label(n)}>{content(n)}</div>)}</div>
   </aside>
  </div>
  {message&&<div className="studio-message">{message}</div>}
 </div>;
}
