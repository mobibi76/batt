import {useEffect,useState} from 'react';
import {supabase,type Profile} from './lib';
import type {ApprovalIndex} from './workflow';
export default function useQualityIndex(demo:boolean,profile:Profile|null,demoRows:ApprovalIndex[],revision:string){
 const [result,setResult]=useState<{owner:string;rows:ApprovalIndex[]|null;error:string}>({owner:'',rows:null,error:''});
 useEffect(()=>{if(demo||profile?.status!=='approved')return;let alive=true;const owner=profile.id;setResult({owner,rows:null,error:''});
  void (async()=>{try{const rows:ApprovalIndex[]=[];for(let offset=0;;offset+=1000){const {data,error}=await supabase.from('quality_requests').select('id,kind,pack_id,status,submitted_by,submitted_at').order('submitted_at',{ascending:false}).order('id').range(offset,offset+999);if(error)throw error;rows.push(...data as ApprovalIndex[]);if(data.length<1000)break;}if(alive)setResult({owner,rows:[...new Map(rows.map(r=>[r.id,r])).values()],error:''});}catch{if(alive)setResult({owner,rows:null,error:'승인 상태를 확인하지 못했습니다. 새로고침 후 다시 확인하세요.'});}})();
  return()=>{alive=false;};
 },[demo,profile?.id,profile?.status,revision]);
 if(demo)return {rows:demoRows,error:''};
 return result.owner===profile?.id?result:{rows:null,error:''};
}
