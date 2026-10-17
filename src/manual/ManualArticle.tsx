import type {ManualScenario} from './content';
import {manualVersion} from './content';
import captures from './walkthroughs.json';
import {guidance} from './guidance';
export type ManualCapture={annotated?:boolean;image:string;title:string;actions:string[];result:string;note:string;width:number;height:number};
export const walkthroughs=captures as Record<string,ManualCapture[]>;
export default function ManualArticle({scenario,print=false}:{scenario:ManualScenario;print?:boolean}){
 const frames=walkthroughs[scenario.id]||[],guide=guidance[scenario.id];
 return <article className="manual-article"><h2>{scenario.title}</h2>
 <p className="manual-note">화면 예시 · {manualVersion} · 현재 앱을 가상 업무 자료 또는 공개 연구 자료로 조작한 캡처입니다. 자료 구분은 각 화면에 표시합니다. 고객 측정값·실제 계정은 포함하지 않습니다. 번호는 각 화면마다 1부터 시작합니다.</p>
 <dl className="manual-facts"><div><dt>담당자</dt><dd>{scenario.role}</dd></div><div><dt>시작 조건</dt><dd>{scenario.start}</dd></div>{guide&&<div><dt>진입 위치</dt><dd>{guide.entry}</dd></div>}</dl>
 {!print&&<nav className="manual-outline" aria-label="이 업무의 상세 순서">{frames.map((frame,i)=><button type="button" key={frame.image} onClick={e=>e.currentTarget.closest('article')?.querySelector(`[data-manual-step="${i}"]`)?.scrollIntoView({block:'start'})}>{i+1}. {frame.title}</button>)}</nav>}
 <h3>화면으로 따라 하기</h3>
 {frames.map((frame,i)=><section className="manual-walkthrough-step" data-manual-step={i} key={frame.image}><h3>{i+1}. {frame.title}</h3><figure className="manual-figure"><a href={`${import.meta.env.BASE_URL}manual/screens/${frame.image}`} target="_blank" rel="noopener noreferrer" aria-label={`${frame.title} 화면 크게 보기 (새 탭)`}><img src={`${import.meta.env.BASE_URL}manual/screens/${frame.image}`} width={frame.width} height={frame.height} loading={print?'eager':'lazy'} alt={`${frame.title}. ${frame.annotated===false?'아래 번호 목록으로 조작 순서를 설명합니다.':frame.actions.length+'개의 번호가 조작 위치를 표시합니다.'} ${frame.note}. 상세 조작은 아래 번호 목록을 참고하세요.`}/></a><figcaption><span>{frame.note}</span><a href={`${import.meta.env.BASE_URL}manual/screens/${frame.image}`} target="_blank" rel="noopener noreferrer">화면 크게 보기 · 새 탭</a></figcaption></figure><ol className="manual-callouts" aria-label={`${frame.title} 번호별 조작`}>{frame.actions.map((text,n)=><li key={n}><span className="manual-callout-number" aria-hidden="true">{n+1}</span><p>{text}</p></li>)}</ol><div className="manual-result"><strong>처리 후 확인</strong><p>{frame.result}</p></div></section>)}
 <section className="manual-completion-guide"><h3>진행·보류 판단 기준</h3><p>{scenario.criteria}</p>
 <h3>문제가 생겼을 때</h3><p>{scenario.exception}</p>{guide&&<dl className="manual-troubleshooting">{guide.problems.map(([when,action])=><div key={when}><dt>{when}</dt><dd>{action}</dd></div>)}</dl>}
 <h3>업무 완료 확인</h3><p>{scenario.done}</p></section>
 </article>;
}
