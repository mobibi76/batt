import {useEffect,useState} from 'react';
import {supabase} from './lib';
import type {Approval} from './approvals';
import {validateLayout,type Layout} from './twin/model';
export type ProcessDesign={id:string;title:string;layout:Layout};
export function approvedDesign(rows:Approval[]):ProcessDesign|null{
 const r=rows.filter(r=>r.kind==='twin'&&r.status==='approved'&&'plan' in r.snapshot&&r.snapshot.plan).sort((a,b)=>(b.reviewed_at??'').localeCompare(a.reviewed_at??''))[0];
 return r?{id:r.id,title:r.title,layout:validateLayout(r.snapshot)}:null;
}
export default function useProcessDesign(demo:boolean,owner:string|undefined,requests:Approval[],revision:string){
 const [design,setDesign]=useState<ProcessDesign|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(demo||!owner)return;let disposed=false;let sequence=0;
 async function read(){const ticket=++sequence;const r=await supabase.from('process_releases').select('id,title,layout').eq('active',true).maybeSingle();if(disposed||ticket!==sequence)return;if(r.error){setError('운영 공정 조회 실패 · 기본 배치를 표시합니다. 공정 버전 적용 상태를 확인하세요.');setDesign(null);return;}try{setDesign(r.data?{...r.data,layout:validateLayout(r.data.layout)}:null);setError('');}catch{setDesign(null);setError('운영 공정 정의를 읽지 못했습니다.');}}
 void read();const timer=setInterval(()=>{if(!document.hidden)void read();},15000);return()=>{disposed=true;clearInterval(timer);};},[demo,owner,revision]);
 return {design:demo?approvedDesign(requests):design,error:demo?'':error};
}
