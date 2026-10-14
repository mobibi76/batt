import type {Profile} from './lib';
import {processStages,type ProcessStage} from './permissions';
export default function MemberPermissions({member,busy,onStages,onReviewer}:{member:Profile;busy:boolean;onStages:(stages:ProcessStage[])=>void;onReviewer:()=>void}){
 if(member.role!=='operator'||member.status!=='approved')return null;
 return <details className="member-permissions"><summary>업무 권한 설정</summary><div className="member-permission-fields"><fieldset disabled={busy}><legend>공정 확인 담당</legend>{Object.entries(processStages).map(([stage,label])=><label key={stage}><input type="checkbox" checked={member.process_stages?.includes(stage as ProcessStage)||false} onChange={e=>onStages(e.target.checked?[...(member.process_stages||[]),stage as ProcessStage]:(member.process_stages||[]).filter(s=>s!==stage))}/>{label}</label>)}</fieldset><button className="small-button" disabled={busy} onClick={onReviewer}>{member.quality_reviewer?'품질 승인 권한 해제':'품질 승인 권한 부여'}</button><small>최종 품질 승인은 공정 확인과 별도 권한입니다.</small></div></details>;
}
