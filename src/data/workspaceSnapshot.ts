import type {Profile,Pack,Inspection} from '../lib';
import type {Cell} from '../../supabase/functions/_shared/matching';
export type Records={profile:Profile;cells:Cell[];packs:Pack[];tests:Inspection[];members:Profile[]};
export type WorkspaceSnapshot=(Records&{changed:true;revision:number|null})|{profile:Profile;changed:false;revision:number};
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const identified=(v:unknown):v is Record<string,any>=>object(v)&&typeof v.id==='string'&&!!v.id;
export function parseWorkspaceSnapshot(value:unknown,owner:string,previous:number|null):WorkspaceSnapshot{
 const fail=()=>{throw Error('업무 조회 응답이 불완전하거나 이전 버전입니다. 마지막 정상 조회본을 유지합니다.');};
 if(!object(value)||!identified(value.profile)||value.profile.id!==owner||typeof value.changed!=='boolean')return fail();
 const p=value.profile;
 if(!['admin','operator','viewer'].includes(p.role)||!['approved','pending','suspended','rejected'].includes(p.status))return fail();
 if(p.status==='approved'){
  if(!Number.isSafeInteger(value.revision)||value.revision<1||(previous!==null&&value.revision<previous))return fail();
  if(!value.changed){if(previous===null||value.revision!==previous)return fail();return value as WorkspaceSnapshot;}
 }else if(value.changed!==true||value.revision!==null)return fail();
 for(const key of ['cells','packs','tests','members'])if(!Array.isArray(value[key])||!value[key].every(identified))return fail();
 if(value.cells.some((c:any)=>typeof c.lot!=='string'||!['available','held','used'].includes(c.status)||!['voltage_mv','resistance_mohm','capacity_mah'].every(k=>(k==='resistance_mohm'&&c[k]===null)||(typeof c[k]==='number'&&Number.isFinite(c[k])))))return fail();
 if(value.packs.some((p:any)=>typeof p.serial_no!=='string'||!Array.isArray(p.pack_cells)||p.pack_cells.some((c:any)=>!object(c)||typeof c.cell_id!=='string'||!Number.isInteger(c.position))))return fail();
 if(value.tests.some((t:any)=>typeof t.pack_id!=='string'||!['aging','final'].includes(t.kind)||!['pass','fail'].includes(t.result)||typeof t.created_at!=='string'))return fail();
 if(p.status!=='approved'&&['cells','packs','tests','members'].some(k=>value[k].length))return fail();
 if(p.role!=='admin'&&value.members.length)return fail();
 return value as WorkspaceSnapshot;
}
