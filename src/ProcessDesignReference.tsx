import type {ProcessDesign} from './useProcessDesign';
import {measurements} from './twin/planning';
import './process-designer.css';
export default function ProcessDesignReference({design,stage}:{design?:ProcessDesign|null;stage?:string}){
 if(!design)return null;const devices=design.layout.devices.filter(d=>!stage||design.layout.plan?.stations[d.id]?.stage===stage);
 return <div className="process-design-reference"><strong>적용 공정: {design.title}</strong><small className="block">버전 {design.id}</small>{devices.map(d=><p key={d.id}>{d.name} · 확보 계획: {design.layout.plan?.stations[d.id]?.data.map(k=>measurements[k]).join(', ')||'지정 없음'}</p>)}<small>승인된 확보 계획입니다. 실제 측정값은 검사 근거로 별도 기록합니다.</small></div>;
}
