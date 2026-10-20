import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';

const query='(min-width: 768px)';
function subscribe(change:()=>void){
 const media=window.matchMedia(query);
 media.addEventListener('change',change);
 return()=>media.removeEventListener('change',change);
}
export function useSupportedViewport(){
 return useSyncExternalStore(subscribe,()=>window.matchMedia(query).matches,()=>true);
}

export default function SupportedViewport({children}:{children:ReactNode}){
 const supported=useSupportedViewport();
 const [started,setStarted]=useState(supported);
 const notice=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(supported)setStarted(true);
  else {
   const frame=requestAnimationFrame(()=>notice.current?.focus());
   return()=>cancelAnimationFrame(frame);
  }
 },[supported]);
 return <>
  <main className="unsupported-viewport" hidden={supported} ref={notice} tabIndex={-1} aria-labelledby="unsupported-viewport-title">
   <section>
    <p className="unsupported-viewport-brand">주성산업</p>
    <h1 id="unsupported-viewport-title">모바일은 지원하지 않습니다</h1>
    <p>현장 안전을 위해 모바일 크기의 화면에서는 업무 기능을 사용할 수 없습니다.</p>
    <p>태블릿 또는 PC에서 이용해 주세요. 태블릿은 가로·세로 화면을 모두 지원합니다.</p>
    <p className="muted">태블릿이나 PC를 사용 중이라면 창을 넓혀 주세요.</p>
   </section>
  </main>
  <div className="supported-viewport" hidden={!supported} inert={!supported}>{started?children:null}</div>
 </>;
}
