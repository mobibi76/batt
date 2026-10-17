import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {CircleHelp,BookOpen,X,Printer} from 'lucide-react';
import {manualVersion,scenarios,scenarioById} from './content';
import './manual.css';
import Article,{walkthroughs} from './ManualArticle';
import {guidance} from './guidance';
import {visibleRect,findTargets,targetRect,paddedRect,overlap,type Rect} from './spotlight';
const visible=(e:Element)=>!!visibleRect(e);
export default function UserManual({context}:{context:string}){
 const [host,setHost]=useState<Element|null>(null),[mode,setMode]=useState<'screen'|'docs'|null>(null),[topic,setTopic]=useState(0),[docsId,setDocsId]=useState(context),[query,setQuery]=useState(''),[rect,setRect]=useState<Rect|null>(null);
 const [placement,setPlacement]=useState('bottom-center'),[covered,setCovered]=useState(false),[compact,setCompact]=useState(false);
 const panel=useRef<HTMLElement>(null);
 const [printing,setPrinting]=useState(false),[printError,setPrintError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),previousHash=useRef(''),printEpoch=useRef(0);
 const scenario=scenarioById(context),step=scenario.steps[Math.min(topic,scenario.steps.length-1)];
 useEffect(()=>{
  const update=()=>{const modal=[...document.querySelectorAll('[role="dialog"]:not(.manual-dialog) .section-head')].find(visible);const next=modal||[...document.querySelectorAll('.console-task-heading, .console-header, .auth-form, .waiting-page, .private-demo-entry > .panel')].find(visible);setHost(next||null);};
  update();window.addEventListener('resize',update);const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});return()=>{observer.disconnect();window.removeEventListener('resize',update);};
 },[]);
 useEffect(()=>{setTopic(0);},[context]);
 useEffect(()=>{
  const read=()=>{const id=location.hash.match(/^#docs\/([a-z]+)$/)?.[1];if(id&&scenarios.some(s=>s.id===id)){previousHash.current='';setDocsId(id);setMode('docs');}};
  read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);
 },[]);
 useEffect(()=>{if(mode!=='docs'){printEpoch.current++;setPrinting(false);}if(mode&&!dialog.current?.open)dialog.current?.showModal();if(!mode&&dialog.current?.open)dialog.current.close();},[mode]);
 useEffect(()=>{
  if(mode!=='screen'){setRect(null);return;}
  let frame=0,previous='';
  const update=()=>{
   const target=targetRect(step);const next=target?paddedRect(target):null;const box=panel.current?.getBoundingClientRect();
   let position='bottom-center',hidden=false;
   if(next&&box){
    const gap=parseFloat(getComputedStyle(dialog.current!).getPropertyValue('--space-8'))||8;
    const candidates=['bottom-center','top-center','bottom-left','bottom-right','top-left','top-right'].map(name=>{
     const left=name.endsWith('left')?gap:name.endsWith('right')?innerWidth-box.width-gap:(innerWidth-box.width)/2;
     const top=name.startsWith('top')?gap:innerHeight-box.height-gap;
     return {name,area:overlap(next,{left,top,width:box.width,height:box.height})};
    }).sort((a,b)=>a.area-b.area);
    position=candidates[0].name;hidden=candidates[0].area>0;
   }
   const signature=JSON.stringify([next,position,hidden]);
   if(signature!==previous){previous=signature;setRect(next);setPlacement(position);setCovered(hidden);}
   frame=requestAnimationFrame(update);
  };
  update();return()=>cancelAnimationFrame(frame);
 },[mode,step,compact]);
 async function printManual(){const epoch=++printEpoch.current;setPrinting(true);setPrintError('');try{await Promise.all([...document.querySelectorAll<HTMLImageElement>('.manual-print img')].map(img=>img.decode()));if(epoch===printEpoch.current&&dialog.current?.open&&dialog.current.classList.contains('manual-docs'))window.print();}catch{if(epoch===printEpoch.current)setPrintError('일부 화면 이미지를 불러오지 못했습니다. 연결을 확인한 뒤 인쇄를 다시 시도하세요.');}finally{if(epoch===printEpoch.current)setPrinting(false);}}
 function setHash(hash:string){history.replaceState(history.state,'',`${location.pathname}${location.search}${hash}`);}
 function close(){printEpoch.current++;setPrinting(false);if(mode==='docs')setHash(previousHash.current);setMode(null);requestAnimationFrame(()=>trigger.current?.focus());}
 function openScreen(){previousHash.current=location.hash;const initial=scenario.steps.map((s,index)=>({s,index})).filter(({s})=>findTargets(s).length).sort((a,b)=>(b.s.priority||0)-(a.s.priority||0))[0]?.index||0;setTopic(initial);setCompact(false);setMode('screen');}
 function openDocs(){setDocsId(context);setQuery('');setHash(`#docs/${context}`);setMode('docs');}
 const filtered=scenarios.filter(s=>`${s.title} ${s.role} ${s.start} ${s.criteria} ${s.steps.map(t=>t.body).join(' ')} ${guidance[s.id]?.entry||''} ${(walkthroughs[s.id]||[]).map(f=>f.title+' '+f.actions.join(' ')).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 const geometry=rect?{'--guide-x':`${rect.left}px`,'--guide-y':`${rect.top}px`,'--guide-w':`${rect.width}px`,'--guide-h':`${rect.height}px`} as CSSProperties:undefined;
 return <>{host&&createPortal(<button ref={trigger} className="manual-launch" type="button" aria-label="사용 안내" title="화면 설명 및 DOCS" onClick={openScreen}><CircleHelp aria-hidden="true" className="icon-20"/></button>,host)}{createPortal(<dialog ref={dialog} aria-labelledby="manual-title" className={`manual-dialog ${mode==='docs'?'manual-docs':'manual-screen'} ${rect?'has-spotlight':''} panel-${placement} ${compact?'manual-compact':''}`} onCancel={e=>{e.preventDefault();close();}}>
 {mode==='screen'?<><div className="manual-dimmer"/>{rect&&<div className="manual-spotlight" style={geometry} aria-hidden="true"/>}<section ref={panel} className="manual-explanation"><header className="manual-heading"><div><span className="manual-label">화면 설명 · 업무 조작은 잠시 멈춤</span><h2 id="manual-title">{scenario.title}</h2></div><button type="button" className="manual-close" onClick={close} aria-label="설명 닫기" autoFocus><X className="icon-20"/></button></header>{!compact&&<><nav className="manual-topics" aria-label="설명할 항목">{scenario.steps.map((s,i)=><button type="button" key={s.title} aria-pressed={topic===i} onClick={()=>{setTopic(i);setCompact(false);}}>{s.title}</button>)}</nav><div className="manual-current" aria-live="polite"><strong>{step.title}</strong><p>{step.body}</p>{!rect&&<small>현재 화면에 해당 항목이 보이지 않습니다. 전체 처리 순서는 DOCS에서 확인하세요.</small>}</div></>}{((rect&&covered)||compact)&&<button type="button" className="text-button manual-reveal" onClick={()=>setCompact(!compact)}>{compact?'설명 다시 펼치기':'강조 영역만 보기'}</button>}{!compact&&<footer className="manual-actions"><button className="secondary" onClick={openDocs}><BookOpen className="icon-16"/>DOCS 전체 매뉴얼</button><button className="primary" onClick={close}>업무로 돌아가기</button></footer>}</section></>:mode==='docs'?<><header className="manual-heading"><div><span className="manual-label">사용자 매뉴얼 · {manualVersion}</span><h1 id="manual-title">DOCS · 업무 시나리오</h1></div><div className="manual-actions"><button className="secondary" disabled={printing} onClick={()=>void printManual()}><Printer className="icon-16"/>{printing?'이미지 준비 중':'인쇄·PDF 저장'}</button><button className="manual-close" onClick={close} aria-label="DOCS 닫기" autoFocus><X className="icon-20"/></button></div></header><div className="manual-body"><aside className="manual-index"><label>매뉴얼 검색<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="업무·판단 기준 검색"/></label><nav aria-label="업무 시나리오">{filtered.map(s=><button key={s.id} aria-current={s.id===docsId?'page':undefined} onClick={()=>{setDocsId(s.id);setHash(`#docs/${s.id}`);document.querySelector('.manual-reading')?.scrollTo(0,0);}}>{s.title}</button>)}</nav>{!filtered.length&&<p role="status">검색 결과가 없습니다. 다른 업무명으로 검색하세요.</p>}<button className="text-button" onClick={()=>{setHash(previousHash.current);setMode('screen');}}>현재 화면 설명으로</button></aside><main className="manual-reading" tabIndex={0}>{printError&&<p role="alert">{printError}</p>}<Article scenario={scenarioById(docsId)}/><p className="manual-note">실증 준비형 MVP의 사용 절차입니다. 실제 생산 성과·학습 모델·실장비 연동 완료를 의미하지 않습니다. 저장과 승인은 실제 업무 화면에서 직접 수행합니다.</p></main></div><div className="manual-print"><h1>주성산업 사용자 매뉴얼</h1><p>버전 {manualVersion} · 실증 준비형 MVP</p>{scenarios.map(s=><Article key={s.id} scenario={s} print/>)}</div></>:null}
 </dialog>,document.body)}</>;
}
